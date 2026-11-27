// Motor de stickers animados con sonido: lo usan el comando #s2 y la página web
import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import ffmpeg from 'ffmpeg-static'
import { prepareWAMessageMedia, generateWAMessageFromContent } from '@itsliaaa/baileys'

// Máximo de WhatsApp: animación de hasta 10 s y audio de hasta 10 s en stickers con sonido
export const MAX_SEGUNDOS = 10
const MAX_BYTES = 500 * 1024 // límite de tamaño de un sticker animado

// Nombre del paquete y autor (texto gris) que muestra WhatsApp en el sticker
export const PAQUETE = '♦️ Erza-Bot-MD ♦️\n' // el salto de línea final manda el autor a la línea de abajo
export const AUTOR = 'mikelennn'

function ejecutar(args, limiteMs = 120000) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-threads', '1', ...args], { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    const reloj = setTimeout(() => {
      p.kill('SIGKILL')
      reject(new Error('ffmpeg tardó demasiado'))
    }, limiteMs)
    p.stderr.on('data', (d) => (err += d))
    p.on('error', (e) => {
      clearTimeout(reloj)
      reject(e)
    })
    p.on('close', (code) => {
      clearTimeout(reloj)
      code === 0 ? resolve() : reject(new Error(err.trim().split('\n').slice(-2).join(' ') || `ffmpeg salió con ${code}`))
    })
  })
}

// Agrega a un WebP el bloque EXIF con el nombre del paquete y el autor (formato de stickers de WhatsApp)
export function ponerDatosSticker(webp, nombre, autor) {
  const json = Buffer.from(
    JSON.stringify({
      'sticker-pack-id': 'erza-bot-md-stickers',
      'sticker-pack-name': nombre,
      'sticker-pack-publisher': autor,
      emojis: ['♦️']
    }),
    'utf8'
  )
  // Cabecera TIFF con una sola entrada (etiqueta 0x5741) que apunta al JSON
  const cabecera = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
  cabecera.writeUInt32LE(json.length, 14)
  const exif = Buffer.concat([cabecera, json])

  if (webp.toString('ascii', 0, 4) !== 'RIFF' || webp.toString('ascii', 8, 12) !== 'WEBP') return webp

  // Recorre los bloques: marca en VP8X que hay EXIF y quita un EXIF anterior si lo hubiera
  const bloques = []
  let i = 12
  while (i + 8 <= webp.length) {
    const tipo = webp.toString('ascii', i, i + 4)
    const tam = webp.readUInt32LE(i + 4)
    const fin = i + 8 + tam + (tam % 2)
    let bloque = Buffer.from(webp.subarray(i, Math.min(fin, webp.length)))
    if (tipo === 'VP8X') bloque[8] |= 0x08
    if (tipo !== 'EXIF') bloques.push(bloque)
    i = fin
  }
  if (!bloques.some((b) => b.toString('ascii', 0, 4) === 'VP8X')) return webp // solo WebP extendido (animado)

  const tamExif = Buffer.alloc(4)
  tamExif.writeUInt32LE(exif.length)
  bloques.push(Buffer.concat([Buffer.from('EXIF'), tamExif, exif, exif.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]))

  const cuerpo = Buffer.concat(bloques)
  const riff = Buffer.alloc(12)
  riff.write('RIFF', 0, 'ascii')
  riff.writeUInt32LE(cuerpo.length + 4, 4)
  riff.write('WEBP', 8, 'ascii')
  return Buffer.concat([riff, cuerpo])
}

// Hasta 5 s: 8 fps con buena calidad. Más largos: 6 fps y más compresión para no pasar de 500 KB
const ajustes = (segundos) =>
  segundos > 5 ? { fps: 6, calidades: [15, 5, 1] } : { fps: 8, calidades: [35, 15, 5] }
const filtro = (fps) =>
  `fps=${fps}:start_time=0,scale=512:512:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=512:512:-1:-1:color=0x00000000,format=yuva420p`
const BYTES_FOTOGRAMA = 512 * 512 * 2.5 // yuva420p

// Mira qué pistas tiene el archivo (ffmpeg -i sin salida termina con error, pero lista las pistas)
export function pistas(entrada) {
  return new Promise((resolve) => {
    const p = spawn(ffmpeg, ['-hide_banner', '-i', entrada], { stdio: ['ignore', 'ignore', 'pipe'] })
    let info = ''
    p.stderr.on('data', (d) => (info += d))
    p.on('error', () => resolve({ video: false, audio: false }))
    p.on('close', () => {
      const d = info.match(/Duration: (\d+):(\d+):([\d.]+)/)
      const segundos = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0
      resolve({ video: /Stream #.*Video:/.test(info), audio: /Stream #.*Audio:/.test(info), segundos })
    })
  })
}

// Lee el video UNA sola vez: saca los fotogramas ya escalados y el audio
export async function extraer(entrada, carpeta, segundosVideo) {
  const duracion = Math.min(MAX_SEGUNDOS, segundosVideo || MAX_SEGUNDOS)
  const { fps } = ajustes(duracion)
  const fotogramas = path.join(carpeta, 'fotogramas.nut')
  const ogg = path.join(carpeta, 'audio.ogg')
  const { video, audio: conAudio } = await pistas(entrada)
  if (!video) throw new Error('no se pudo leer el video')
  await ejecutar([
    '-y', '-skip_loop_filter', 'all', '-flags2', '+fast', '-t', String(MAX_SEGUNDOS), '-i', entrada,
    '-map', '0:v:0', '-vf', filtro(fps), '-t', String(duracion), '-c:v', 'rawvideo', '-f', 'nut', fotogramas,
    // Audio e imagen desde el mismo cero: si el audio empieza tarde en el archivo, silencio al inicio
    ...(conAudio ? ['-map', '0:a:0', '-vn', '-af', 'aresample=async=1:first_pts=0,apad', '-t', String(duracion), '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', ogg] : [])
  ])
  // Comprueba que salieron casi todos los fotogramas esperados
  const esperados = duracion * fps
  const { size } = await fs.stat(fotogramas)
  if (size < esperados * BYTES_FOTOGRAMA * 0.8) throw new Error(`pocos fotogramas (${Math.round(size / BYTES_FOTOGRAMA)}/${esperados})`)

  let audio = null
  if (conAudio) {
    try {
      audio = await fs.readFile(ogg)
      if (audio.length < 200) audio = null
    } catch (e) {}
  }
  return { fotogramas, audio }
}

// Comprime a WebP animado; si pasa de 500 KB baja la calidad (sin volver a leer el video)
async function comprimir(fotogramas, carpeta, segundosVideo) {
  const webp = path.join(carpeta, 'sticker.webp')
  const { calidades } = ajustes(Math.min(MAX_SEGUNDOS, segundosVideo || MAX_SEGUNDOS))
  let sticker = null
  for (const calidad of calidades) {
    await ejecutar(['-y', '-i', fotogramas, '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', String(calidad), '-compression_level', '0', '-loop', '0', webp])
    sticker = await fs.readFile(webp)
    if (sticker.length <= MAX_BYTES) break
  }
  return sticker
}


// Guarda solo los primeros segundos del video SIN recodificar (casi no gasta CPU).
// Sirve para que los videos en fila ocupen poco disco.
export async function recortar(entrada, salida) {
  await ejecutar(['-y', '-t', String(MAX_SEGUNDOS + 1), '-i', entrada, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', salida], 60000)
}

// Del video ya guardado en disco saca el sticker (con nombre y autor) y su audio
export async function crearSticker(entrada, carpeta, segundosVideo) {
  const { fotogramas, audio } = await extraer(entrada, carpeta, segundosVideo)
  const sticker = ponerDatosSticker(await comprimir(fotogramas, carpeta, segundosVideo), PAQUETE, AUTOR)
  return { sticker, audio }
}

// Sube y envía el sticker; si hay audio va dentro del sticker (sticker con sonido)
export async function enviarSticker(sock, jid, { sticker, audio, segundos, citado, maximo = MAX_SEGUNDOS }) {
  const subir = { upload: sock.waUploadToServer, jid } // con el jid, a un canal se sube sin cifrar (así lo pide WhatsApp)
  const t0 = Date.now()
  const duracion = Math.max(1, Math.round(Math.min(segundos || maximo, maximo)))
  const [{ stickerMessage }, media] = await Promise.all([
    prepareWAMessageMedia({ sticker, mimetype: 'image/webp' }, subir),
    audio ? prepareWAMessageMedia({ audio, mimetype: 'audio/ogg; codecs=opus', seconds: duracion }, subir) : null
  ])
  const contenido = {
    stickerMessage: {
      ...stickerMessage,
      isAnimated: true,
      ...(media ? { audioMessage: { ...media.audioMessage, seconds: duracion } } : {})
    }
  }
  const msg = generateWAMessageFromContent(jid, contenido, { quoted: citado, userJid: sock.user.id })
  // La subida va en paralelo, pero el cifrado para el grupo va de uno en uno:
  // varios a la vez se pelean por el CPU y repiten trabajo con las llaves de los miembros nuevos
  const t1 = Date.now()
  let t2 = 0
  const turno = colaCifrado.then(() => {
    t2 = Date.now()
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
  })
  colaCifrado = turno.catch(() => {})
  await turno
  const t3 = Date.now()
  console.log(`[envío] subida ${((t1 - t0) / 1000).toFixed(1)}s, espera ${((t2 - t1) / 1000).toFixed(1)}s, cifrado ${((t3 - t2) / 1000).toFixed(1)}s`)
  return msg
}
let colaCifrado = Promise.resolve()
