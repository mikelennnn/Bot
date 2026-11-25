// Página web de stickers con sonido.
// El sticker lo hace el NAVEGADOR de cada persona (ffmpeg.wasm); el bot solo lo recibe ya hecho
// y lo manda al grupo. Así el poco CPU del servidor no es un problema.
import http from 'http'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { enviarSticker, ponerDatosSticker, PAQUETE, AUTOR, MAX_SEGUNDOS } from './sticker.js'

const PUERTO = Number(process.env.PORT) || 8080
const GRUPO_INVITACION = 'GNl1GTL7aJxHrqgq4ScioO' // grupo al que van los stickers
const MAX_STICKER = 1024 * 1024 // el navegador ya lo deja en 500 KB; margen por si acaso
const MAX_AUDIO = 400 * 1024

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PAGINA = fs.readFileSync(path.join(RAIZ, 'web', 'index.html'))

// Archivos de ffmpeg.wasm servidos desde nuestro propio dominio (el worker debe ser del mismo origen)
const FFMPEG = {
  ffmpeg: path.join(RAIZ, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm'),
  util: path.join(RAIZ, 'node_modules', '@ffmpeg', 'util', 'dist', 'esm'),
  core: path.join(RAIZ, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
}
const TIPOS = { '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm' }

let sock = null
let grupo = null // { id, nombre }
const trabajos = new Map() // id → { estado, mensaje, creado }
const fila = []
let ocupado = false

// ---------- Conexión con el bot ----------
export function actualizarConexion(nuevoSock) {
  sock = nuevoSock
}

// Entra al grupo con el enlace (si ya está dentro, solo lee sus datos)
export async function prepararGrupo(s) {
  try {
    let id = null
    try {
      const r = await s.groupAcceptInvite(GRUPO_INVITACION)
      id = typeof r === 'string' ? r : r?.id
    } catch (e) {}
    const info = await s.groupGetInviteInfo(GRUPO_INVITACION)
    grupo = { id: id || info.id, nombre: info.subject || 'Grupo' }
    console.log(`[web] grupo de stickers listo: ${grupo.nombre}`)
  } catch (e) {
    console.log('[web] no se pudo preparar el grupo de stickers:', e?.message || e)
  }
}

// ---------- Fila de envíos (solo sube y manda: 1-2 s cada uno) ----------
async function enviar(trabajo) {
  const t = trabajos.get(trabajo.id)
  const inicio = Date.now()
  try {
    // Si el bot se desconectó un momento, espera hasta 2 minutos a que vuelva
    for (let i = 0; i < 24 && !(sock?.user && grupo); i++) await new Promise((r) => setTimeout(r, 5000))
    if (!(sock?.user && grupo)) throw new Error('bot desconectado')
    t.estado = 'enviando'
    await enviarSticker(sock, grupo.id, trabajo)
    t.estado = 'listo'
    t.mensaje = `Tu sticker ya fue mandado a ${grupo.nombre}, ya puedes ir a fijarte`
    console.log(`[web] sticker enviado en ${((Date.now() - inicio) / 1000).toFixed(1)}s (${(trabajo.sticker.length / 1024).toFixed(0)} KB${trabajo.audio ? '' : ', sin audio'})`)
  } catch (e) {
    t.estado = 'error'
    t.mensaje = 'No se pudo mandar el sticker al grupo, intenta de nuevo'
    console.log('[web] error al enviar:', e?.message || e)
  } finally {
    trabajo.sticker = trabajo.audio = null
  }
}

async function siguiente() {
  if (ocupado || !fila.length) return
  ocupado = true
  await enviar(fila.shift())
  ocupado = false
  siguiente()
}

// Borra estados viejos para no llenar la memoria
setInterval(() => {
  const limite = Date.now() - 15 * 60 * 1000
  for (const [id, t] of trabajos) if (t.creado < limite && (t.estado === 'listo' || t.estado === 'error')) trabajos.delete(id)
}, 60 * 1000).unref()

// ---------- HTTP ----------
function responder(res, codigo, datos) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(datos))
}

function leerCuerpo(req, maximo) {
  return new Promise((resolve, reject) => {
    const partes = []
    let total = 0
    req.on('data', (p) => {
      total += p.length
      if (total > maximo) {
        reject(new Error('muy grande'))
        req.destroy()
      } else partes.push(p)
    })
    req.on('end', () => resolve(Buffer.concat(partes)))
    req.on('error', reject)
  })
}

// Recibe el sticker ya hecho por el navegador: cuerpo = [webp][ogg], con el tamaño del webp en una cabecera
async function recibirSticker(req, res) {
  const tamSticker = Number(req.headers['x-tam-sticker'])
  const segundos = Math.min(MAX_SEGUNDOS, Number(req.headers['x-segundos']) || MAX_SEGUNDOS)
  if (!Number.isInteger(tamSticker) || tamSticker <= 0 || tamSticker > MAX_STICKER) {
    return responder(res, 400, { error: 'Sticker no válido' })
  }
  let cuerpo
  try {
    cuerpo = await leerCuerpo(req, MAX_STICKER + MAX_AUDIO)
  } catch (e) {
    return responder(res, 413, { error: 'El sticker pesa demasiado' })
  }
  const webp = cuerpo.subarray(0, tamSticker)
  const ogg = cuerpo.subarray(tamSticker)
  if (webp.length !== tamSticker || webp.toString('ascii', 0, 4) !== 'RIFF' || webp.toString('ascii', 8, 12) !== 'WEBP') {
    return responder(res, 400, { error: 'Sticker no válido' })
  }
  if (ogg.length && ogg.toString('ascii', 0, 4) !== 'OggS') return responder(res, 400, { error: 'Audio no válido' })

  const id = randomUUID()
  trabajos.set(id, { estado: 'en_fila', mensaje: '', creado: Date.now() })
  fila.push({
    id,
    sticker: ponerDatosSticker(Buffer.from(webp), PAQUETE, AUTOR),
    audio: ogg.length ? Buffer.from(ogg) : null,
    segundos
  })
  console.log(`[web] sticker recibido (${(webp.length / 1024).toFixed(0)} KB, audio ${(ogg.length / 1024).toFixed(0)} KB), en fila: ${fila.length}`)
  responder(res, 202, { id })
  siguiente()
}

function estado(url, res) {
  const id = url.searchParams.get('id')
  const t = trabajos.get(id)
  if (!t) return responder(res, 404, { error: 'No encontré ese sticker' })
  const antes = fila.findIndex((x) => x.id === id)
  responder(res, 200, { estado: t.estado, mensaje: t.mensaje, antes: antes >= 0 ? antes + (ocupado ? 1 : 0) : 0 })
}

function servirFfmpeg(pathname, res) {
  const [, , paquete, archivo] = pathname.split('/') // /ffmpeg/<paquete>/<archivo>
  const carpeta = FFMPEG[paquete]
  if (!carpeta || !/^[\w.-]+$/.test(archivo || '')) return responder(res, 404, { error: 'No existe' })
  const ruta = path.join(carpeta, archivo)
  fs.stat(ruta, (err, info) => {
    if (err || !info.isFile()) return responder(res, 404, { error: 'No existe' })
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'public, max-age=31536000, immutable' // se descarga una sola vez
    })
    fs.createReadStream(ruta).pipe(res)
  })
}

export function iniciarWeb() {
  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      return res.end(PAGINA)
    }
    if (req.method === 'GET' && url.pathname.startsWith('/ffmpeg/')) return servirFfmpeg(url.pathname, res)
    if (req.method === 'GET' && url.pathname === '/api/info') {
      return responder(res, 200, { conectado: !!(sock?.user && grupo), grupo: grupo?.nombre || null, maxSegundos: MAX_SEGUNDOS, enFila: fila.length + (ocupado ? 1 : 0) })
    }
    if (req.method === 'POST' && url.pathname === '/api/sticker') return recibirSticker(req, res).catch(() => responder(res, 500, { error: 'Error al recibir el sticker' }))
    if (req.method === 'GET' && url.pathname === '/api/estado') return estado(url, res)
    responder(res, 404, { error: 'No existe' })
  })
  servidor.requestTimeout = 2 * 60 * 1000
  servidor.listen(PUERTO, () => console.log(`[web] página de stickers en el puerto ${PUERTO}`))
  servidor.on('error', (e) => console.log('[web] no se pudo abrir la página:', e?.message || e))
}
