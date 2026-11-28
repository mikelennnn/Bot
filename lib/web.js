// Servidor de stickers con sonido (la página está en Vercel, carpeta web/).
// El sticker lo hace el NAVEGADOR de cada persona (ffmpeg.wasm); el bot solo lo recibe ya hecho
// y lo manda al canal. Así el poco CPU del servidor no es un problema.
import http from 'http'
import fs from 'fs'
import fsp from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID, createHash } from 'crypto'
import { fileURLToPath } from 'url'
import { enviarSticker, ponerDatosSticker, PAQUETE, AUTOR } from './sticker.js'
import { cuenta } from './cache.js'

const MAX_SEGUNDOS = 20 // stickers de la página: hasta 20 s (el comando #s2 sigue en 10)

const PUERTO = Number(process.env.PORT) || 8080
const CANAL_INVITACION = '0029VbEF7u28fewkqNbwFC09' // canal al que van los stickers (whatsapp.com/channel/...)
const MAX_STICKER = 1536 * 1024 // el navegador lo deja en máx. 1 MB; margen por si acaso
const MAX_AUDIO = 400 * 1024
const RECEPCIONES_A_LA_VEZ = 20 // más conexiones juntas gastan demasiada memoria; las demás reintentan
const POR_TANDA = 5 // se mandan 5 stickers...
const CADA_MS = 5000 // ...cada 5 segundos (para no saturar el canal)
const CARPETA_FILA = path.join(os.tmpdir(), 'fila-stickers') // la fila vive en disco, no en memoria
fs.mkdirSync(CARPETA_FILA, { recursive: true })

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// Archivos de ffmpeg.wasm servidos desde nuestro propio dominio (el worker debe ser del mismo origen)
const FFMPEG = {
  ffmpeg: path.join(RAIZ, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm'),
  util: path.join(RAIZ, 'node_modules', '@ffmpeg', 'util', 'dist', 'esm'),
  core: path.join(RAIZ, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
}
const TIPOS = { '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm' }

let sock = null
let grupo = null // canal de destino: { id, nombre }
const trabajos = new Map() // id → { estado, mensaje, creado, huella, cliente }
const porHuella = new Map() // huella del sticker → id (para no mandar el mismo sticker dos veces)
const porCliente = new Map() // teléfono que lo mandó → id (solo 1 sticker en la fila por persona)
const fila = []
let enviando = 0 // envíos en curso
let recibiendo = 0 // subidas en curso

// ---------- Conexión con el bot ----------
export function actualizarConexion(nuevoSock) {
  sock = nuevoSock
}

// Lee el canal con su enlace. El bot tiene que ser dueño o administrador del canal para poder publicar.
export async function prepararCanal(s) {
  try {
    const info = await s.newsletterMetadata('invite', CANAL_INVITACION)
    if (!info?.id) throw new Error('no encontré el canal')
    grupo = { id: info.id, nombre: info.thread_metadata?.name?.text || 'el canal' }
    const rol = info.viewer_metadata?.role || '?'
    console.log(`[web] canal de stickers listo: ${grupo.nombre} (${grupo.id}), el bot es: ${rol}`)
    if (!/owner|admin/i.test(rol)) console.log('[web] ⚠️ el bot NO es administrador del canal: no va a poder publicar ahí')
  } catch (e) {
    console.log('[web] no se pudo preparar el canal de stickers:', e?.message || e, '— reintento en 1 min')
    setTimeout(() => sock === s && !grupo && prepararCanal(s), 60 * 1000)
  }
}

// ---------- Fila de envíos (3 a la vez, con pausa) ----------
async function enviar(trabajo) {
  const t = trabajos.get(trabajo.id)
  const inicio = Date.now()
  try {
    // Si el bot se desconectó un momento, espera hasta 2 minutos a que vuelva
    for (let i = 0; i < 24 && !(sock?.user && grupo); i++) await new Promise((r) => setTimeout(r, 5000))
    if (!(sock?.user && grupo)) throw new Error('bot desconectado')
    t.estado = 'enviando'
    const datos = await fsp.readFile(trabajo.ruta)
    const sticker = ponerDatosSticker(datos.subarray(0, trabajo.tamSticker), PAQUETE, AUTOR)
    const audio = datos.length > trabajo.tamSticker ? datos.subarray(trabajo.tamSticker) : null
    await enviarSticker(sock, grupo.id, { sticker, audio, segundos: trabajo.segundos, maximo: MAX_SEGUNDOS })
    t.estado = 'listo'
    t.mensaje = `Tu sticker ya fue mandado a ${grupo.nombre}, ya puedes ir a fijarte`
    console.log(`[web] sticker enviado en ${((Date.now() - inicio) / 1000).toFixed(1)}s (${(sticker.length / 1024).toFixed(0)} KB${audio ? '' : ', sin audio'}), quedan ${fila.length}`)
  } catch (e) {
    t.estado = 'error'
    t.mensaje = 'No se pudo mandar el sticker al canal, intenta de nuevo'
    console.log('[web] error al enviar:', e?.message || e)
  } finally {
    fsp.rm(trabajo.ruta, { force: true }).catch(() => {})
    if (t.cliente && porCliente.get(t.cliente) === trabajo.id) porCliente.delete(t.cliente)
    if (t.estado === 'error' && porHuella.get(t.huella) === trabajo.id) porHuella.delete(t.huella) // si falló, se puede reintentar
  }
}

// Tandas: toma hasta 5 de la fila, los manda juntos y espera a que pasen 5 s desde que empezó la tanda
let enTanda = false
async function siguiente() {
  if (enTanda) return
  enTanda = true
  try {
    while (fila.length) {
      const inicio = Date.now()
      const tanda = fila.splice(0, POR_TANDA)
      enviando = tanda.length
      await Promise.all(tanda.map((t) => enviar(t).catch(() => {})))
      enviando = 0
      const falta = CADA_MS - (Date.now() - inicio)
      if (falta > 0 && fila.length) await new Promise((r) => setTimeout(r, falta))
    }
  } finally {
    enviando = 0
    enTanda = false
  }
}

// Borra estados viejos para no llenar la memoria
setInterval(() => {
  const limite = Date.now() - 15 * 60 * 1000
  for (const [id, t] of trabajos) {
    if (t.creado < limite && (t.estado === 'listo' || t.estado === 'error')) {
      trabajos.delete(id)
      if (porHuella.get(t.huella) === id) porHuella.delete(t.huella)
    }
  }
}, 60 * 1000).unref()

// ---------- HTTP ----------
// La página también vive en Vercel (otro dominio): se permite que llame al bot desde ahí
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Cliente, X-Tam-Sticker, X-Segundos',
  'Access-Control-Max-Age': '86400'
}

function responder(res, codigo, datos) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(datos))
}

// Guarda el cuerpo directo en un archivo mientras llega (casi no usa memoria)
function guardarCuerpo(req, ruta, maximo) {
  return new Promise((resolve, reject) => {
    const salida = fs.createWriteStream(ruta)
    const hash = createHash('sha256')
    let total = 0
    let fallo = null
    const terminar = (e) => {
      if (fallo) return
      fallo = e
      req.unpipe(salida)
      salida.destroy()
      req.resume()
      reject(e)
    }
    req.on('data', (p) => {
      total += p.length
      hash.update(p)
      if (total > maximo) terminar(new Error('muy grande'))
    })
    req.on('error', terminar)
    req.on('aborted', () => terminar(new Error('cancelado')))
    salida.on('error', terminar)
    salida.on('finish', () => !fallo && resolve({ total, huella: hash.digest('hex') }))
    req.pipe(salida)
  })
}

// Lee unos pocos bytes del archivo para comprobar que de verdad es un sticker (y su audio)
async function revisar(ruta, tamSticker, total) {
  const f = await fsp.open(ruta, 'r')
  try {
    const cabecera = Buffer.alloc(12)
    await f.read(cabecera, 0, 12, 0)
    if (cabecera.toString('ascii', 0, 4) !== 'RIFF' || cabecera.toString('ascii', 8, 12) !== 'WEBP') return 'Sticker no válido'
    if (total > tamSticker) {
      const ogg = Buffer.alloc(4)
      await f.read(ogg, 0, 4, tamSticker)
      if (ogg.toString('ascii') !== 'OggS') return 'Audio no válido'
    }
    return null
  } finally {
    await f.close()
  }
}

// Recibe el sticker ya hecho por el navegador: cuerpo = [webp][ogg], con el tamaño del webp en una cabecera.
// Se guarda en disco mientras espera su turno (en memoria, cientos juntos tumbarían el bot).
async function recibirSticker(req, res) {
  const tamSticker = Number(req.headers['x-tam-sticker'])
  const segundos = Math.min(MAX_SEGUNDOS, Number(req.headers['x-segundos']) || MAX_SEGUNDOS)
  if (!Number.isInteger(tamSticker) || tamSticker <= 0 || tamSticker > MAX_STICKER) {
    req.resume()
    return responder(res, 400, { error: 'Sticker no válido' })
  }
  // Solo 1 sticker en la fila por persona: hasta que se mande el suyo no puede meter otro
  const cliente = String(req.headers['x-cliente'] || '').slice(0, 64) || null
  const pendiente = cliente && trabajos.get(porCliente.get(cliente))
  if (pendiente && (pendiente.estado === 'en_fila' || pendiente.estado === 'enviando')) {
    req.resume()
    return responder(res, 429, { error: 'Ya tienes un sticker en la fila. Espera a que se mande para hacer otro', id: porCliente.get(cliente) })
  }
  if (recibiendo >= RECEPCIONES_A_LA_VEZ) {
    req.resume()
    res.setHeader('Retry-After', '3')
    return responder(res, 503, { error: 'ocupado', reintentar: true })
  }
  const id = randomUUID()
  const ruta = path.join(CARPETA_FILA, `${id}.bin`)
  let total, huella
  recibiendo++
  try {
    ;({ total, huella } = await guardarCuerpo(req, ruta, MAX_STICKER + MAX_AUDIO))
  } catch (e) {
    fsp.rm(ruta, { force: true }).catch(() => {})
    return responder(res, 413, { error: 'El sticker pesa demasiado' })
  } finally {
    recibiendo--
  }
  const problema = total < tamSticker ? 'Sticker no válido' : await revisar(ruta, tamSticker, total).catch(() => 'Sticker no válido')
  if (problema) {
    fsp.rm(ruta, { force: true }).catch(() => {})
    return responder(res, 400, { error: problema })
  }

  // El mismo sticker exacto ya está en la fila (o se acaba de mandar): no se manda otra vez
  const igual = porHuella.get(huella)
  if (igual && trabajos.has(igual)) {
    fsp.rm(ruta, { force: true }).catch(() => {})
    console.log('[web] sticker repetido, no se vuelve a mandar')
    return responder(res, 202, { id: igual })
  }

  trabajos.set(id, { estado: 'en_fila', mensaje: '', creado: Date.now(), huella, cliente })
  porHuella.set(huella, id)
  if (cliente) porCliente.set(cliente, id)
  fila.push({ id, ruta, tamSticker, segundos })
  console.log(`[web] sticker recibido (${(tamSticker / 1024).toFixed(0)} KB, audio ${((total - tamSticker) / 1024).toFixed(0)} KB), en fila: ${fila.length}`)
  responder(res, 202, { id })
  siguiente()
}

function estado(url, res) {
  const id = url.searchParams.get('id')
  const t = trabajos.get(id)
  if (!t) return responder(res, 404, { error: 'No encontré ese sticker' })
  const antes = fila.findIndex((x) => x.id === id)
  responder(res, 200, { estado: t.estado, mensaje: t.mensaje, antes: antes >= 0 ? antes : 0 })
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
    cuenta.http++
    const url = new URL(req.url, 'http://localhost')
    for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v)
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      return res.end()
    }
    if (req.method === 'GET' && url.pathname.startsWith('/ffmpeg/')) return servirFfmpeg(url.pathname, res)
    if (req.method === 'GET' && url.pathname === '/api/info') {
      const suyo = porCliente.get(url.searchParams.get('cliente'))
      const t = suyo && trabajos.get(suyo)
      const pendiente = t && (t.estado === 'en_fila' || t.estado === 'enviando') ? suyo : null
      return responder(res, 200, { conectado: !!(sock?.user && grupo), grupo: grupo?.nombre || null, maxSegundos: MAX_SEGUNDOS, enFila: fila.length + enviando, pendiente })
    }
    if (req.method === 'POST' && url.pathname === '/api/sticker') return recibirSticker(req, res).catch(() => responder(res, 500, { error: 'Error al recibir el sticker' }))
    if (req.method === 'GET' && url.pathname === '/api/estado') return estado(url, res)
    responder(res, 404, { error: 'No existe' })
  })
  servidor.requestTimeout = 2 * 60 * 1000
  servidor.listen(PUERTO, () => console.log(`[web] página de stickers en el puerto ${PUERTO}`))
  servidor.on('error', (e) => console.log('[web] no se pudo abrir la página:', e?.message || e))
}
