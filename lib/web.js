// Página web para crear stickers con sonido: subes un video y el bot lo manda al grupo
import http from 'http'
import fs from 'fs'
import fsp from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { crearSticker, enviarSticker, pistas, recortar, MAX_SEGUNDOS } from './sticker.js'

const PUERTO = Number(process.env.PORT) || 8080
const GRUPO_INVITACION = 'GNl1GTL7aJxHrqgq4ScioO' // grupo al que van los stickers
const MAX_SUBIDA = 50 * 1024 * 1024 // 50 MB
const PAGINA = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'index.html'))

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

// ---------- Fila de trabajos (uno a la vez: el CPU es muy poco) ----------
async function procesar(trabajo) {
  const t = trabajos.get(trabajo.id)
  const inicio = Date.now()
  try {
    if (!sock || !grupo) throw new Error('El bot no está conectado, intenta en un momento')
    t.estado = 'procesando'
    t.mensaje = 'Creando el sticker…'
    const { segundos } = await pistas(trabajo.archivo)
    const { sticker, audio } = await crearSticker(trabajo.archivo, trabajo.carpeta, segundos)
    t.mensaje = 'Enviando al grupo…'
    await enviarSticker(sock, grupo.id, { sticker, audio, segundos })
    t.estado = 'listo'
    t.mensaje = audio ? `¡Sticker con sonido enviado a ${grupo.nombre}!` : `Sticker enviado a ${grupo.nombre} (el video no tenía sonido)`
    console.log(`[web] sticker enviado en ${((Date.now() - inicio) / 1000).toFixed(1)}s (${(sticker.length / 1024).toFixed(0)} KB)`)
  } catch (e) {
    t.estado = 'error'
    t.mensaje = /no está conectado/.test(e?.message) ? e.message : 'No se pudo crear el sticker con ese video'
    console.log('[web] error:', e?.message || e)
  } finally {
    fsp.rm(trabajo.carpeta, { recursive: true, force: true }).catch(() => {})
  }
}

async function siguiente() {
  if (ocupado || !fila.length) return
  ocupado = true
  const trabajo = fila.shift()
  await procesar(trabajo)
  ocupado = false
  siguiente()
}

// Borra estados viejos para no llenar la memoria
setInterval(() => {
  const limite = Date.now() - 15 * 60 * 1000
  for (const [id, t] of trabajos) if (t.creado < limite && t.estado !== 'en_fila' && t.estado !== 'procesando') trabajos.delete(id)
}, 60 * 1000).unref()

// ---------- HTTP ----------
function responder(res, codigo, datos) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(datos))
}

async function recibirVideo(req, res) {
  const tipo = String(req.headers['content-type'] || '')
  if (!tipo.startsWith('video/')) return responder(res, 415, { error: 'Solo se aceptan videos' })
  const largo = Number(req.headers['content-length'] || 0)
  if (largo > MAX_SUBIDA) return responder(res, 413, { error: 'El video pesa más de 50 MB' })

  const carpeta = await fsp.mkdtemp(path.join(os.tmpdir(), 'web-'))
  const archivo = path.join(carpeta, 'video')
  const salida = fs.createWriteStream(archivo)
  let recibidos = 0
  let excedido = false

  req.on('data', (parte) => {
    recibidos += parte.length
    if (recibidos > MAX_SUBIDA && !excedido) {
      excedido = true
      req.unpipe(salida)
      salida.destroy()
      responder(res, 413, { error: 'El video pesa más de 50 MB' })
      req.resume()
    }
  })
  req.pipe(salida)

  salida.on('finish', async () => {
    if (excedido) return
    if (recibidos === 0) {
      fsp.rm(carpeta, { recursive: true, force: true }).catch(() => {})
      return responder(res, 400, { error: 'No llegó ningún video' })
    }
    // Se queda solo con los primeros segundos para ocupar poco disco mientras espera en la fila
    let final = archivo
    try {
      const corto = path.join(carpeta, 'corto.mp4')
      await recortar(archivo, corto)
      await fsp.rm(archivo, { force: true })
      final = corto
    } catch (e) {
      console.log('[web] no se pudo recortar, se usa el video completo:', e?.message || e)
    }
    const id = randomUUID()
    trabajos.set(id, { estado: 'en_fila', mensaje: 'En fila…', creado: Date.now() })
    fila.push({ id, archivo: final, carpeta })
    const posicion = fila.length + (ocupado ? 1 : 0)
    console.log(`[web] video recibido (${(recibidos / 1024 / 1024).toFixed(1)} MB), en fila: ${fila.length}`)
    responder(res, 202, { id, posicion })
    siguiente()
  })
  salida.on('error', () => {
    fsp.rm(carpeta, { recursive: true, force: true }).catch(() => {})
    if (!res.headersSent) responder(res, 500, { error: 'No se pudo guardar el video' })
  })
  req.on('aborted', () => {
    excedido = true
    salida.destroy()
    fsp.rm(carpeta, { recursive: true, force: true }).catch(() => {})
  })
}

function estado(url, res) {
  const id = url.searchParams.get('id')
  const t = trabajos.get(id)
  if (!t) return responder(res, 404, { error: 'No encontré ese envío' })
  const posicion = fila.findIndex((x) => x.id === id)
  responder(res, 200, {
    estado: t.estado,
    mensaje: t.estado === 'en_fila' && posicion >= 0 ? `En fila (${posicion + (ocupado ? 1 : 0)} antes que tú)…` : t.mensaje
  })
}

export function iniciarWeb() {
  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      return res.end(PAGINA)
    }
    if (req.method === 'GET' && url.pathname === '/api/info') {
      return responder(res, 200, { conectado: !!(sock?.user && grupo), grupo: grupo?.nombre || null, maxSegundos: MAX_SEGUNDOS, enFila: fila.length + (ocupado ? 1 : 0) })
    }
    if (req.method === 'POST' && url.pathname === '/api/subir') return recibirVideo(req, res).catch(() => responder(res, 500, { error: 'Error al recibir el video' }))
    if (req.method === 'GET' && url.pathname === '/api/estado') return estado(url, res)
    responder(res, 404, { error: 'No existe' })
  })
  servidor.requestTimeout = 5 * 60 * 1000 // subidas lentas desde el celular
  servidor.listen(PUERTO, () => console.log(`[web] página de stickers en el puerto ${PUERTO}`))
  servidor.on('error', (e) => console.log('[web] no se pudo abrir la página:', e?.message || e))
}
