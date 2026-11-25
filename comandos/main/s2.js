import { spawn } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import ffmpeg from 'ffmpeg-static'
import { downloadContentFromMessage, prepareWAMessageMedia, generateWAMessageFromContent } from '@itsliaaa/baileys'

// Máximo de WhatsApp: animación de hasta 10 s y audio de hasta 10 s en stickers con sonido
const MAX_SEGUNDOS = 10
const MAX_BYTES = 500 * 1024 // límite de tamaño de un sticker animado

const URL_CANAL = 'https://whatsapp.com/channel/0029Vb9eodxFsn0bzlsFDr0F'
const FOOTER = '© Mikelennn\n© ErzaBot'

function caja(estado) {
  return (
    `╭━━━〔♥️ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 ♥️〕━━━╮\n` +
    `┃ ♡ 𝐄𝐒𝐓𝐀𝐃𝐎: *${estado}*\n` +
    `╰━━━━━━━━━━━━━━━━━╯`
  )
}

function avisar(sock, m, estado) {
  return sock.sendMessage(
    m.key.remoteJid,
    { text: caja(estado), footer: FOOTER, nativeFlow: [{ text: '♦️ CANAL', url: URL_CANAL, useWebview: true }] },
    { quoted: m }
  )
}

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

// Busca el video: en el mensaje citado o en el propio mensaje
function buscarVideo(m) {
  const msg = m.message || {}
  if (msg.videoMessage) return msg.videoMessage
  for (const v of Object.values(msg)) {
    const q = v?.contextInfo?.quotedMessage
    if (!q) continue
    const interno = q.viewOnceMessageV2?.message || q.viewOnceMessage?.message || q
    if (interno.videoMessage) return interno.videoMessage
  }
  return null
}

// Descarga el video. Con "parcial" baja solo el principio (lo justo para los primeros segundos),
// que es mucho más rápido en videos largos.
async function descargar(video, parcial) {
  const total = Number(video.fileLength) || 0
  const segundos = Number(video.seconds) || 0
  const opciones = {}
  if (parcial && total && segundos > MAX_SEGUNDOS + 2) {
    const necesario = Math.ceil((total * (MAX_SEGUNDOS + 2)) / segundos) + 512 * 1024
    if (necesario < total) opciones.endByte = necesario
  }
  const stream = await downloadContentFromMessage(video, 'video', opciones)
  const partes = []
  for await (const parte of stream) partes.push(parte)
  return { buffer: Buffer.concat(partes), parcial: !!opciones.endByte }
}

// Hasta 5 s: 8 fps con buena calidad. Más largos: 6 fps y más compresión para no pasar de 500 KB
const ajustes = (segundos) =>
  segundos > 5 ? { fps: 6, calidades: [15, 5, 1] } : { fps: 8, calidades: [35, 15, 5] }
const filtro = (fps) =>
  `fps=${fps},scale=512:512:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=512:512:-1:-1:color=0x00000000,format=yuva420p`
const BYTES_FOTOGRAMA = 512 * 512 * 2.5 // yuva420p

// Mira qué pistas tiene el archivo (ffmpeg -i sin salida termina con error, pero lista las pistas)
function pistas(entrada) {
  return new Promise((resolve) => {
    const p = spawn(ffmpeg, ['-hide_banner', '-i', entrada], { stdio: ['ignore', 'ignore', 'pipe'] })
    let info = ''
    p.stderr.on('data', (d) => (info += d))
    p.on('error', () => resolve({ video: false, audio: false }))
    p.on('close', () => resolve({ video: /Stream #.*Video:/.test(info), audio: /Stream #.*Audio:/.test(info) }))
  })
}

// Lee el video UNA sola vez: saca los fotogramas ya escalados y el audio
async function extraer(entrada, carpeta, segundosVideo) {
  const duracion = Math.min(MAX_SEGUNDOS, segundosVideo || MAX_SEGUNDOS)
  const { fps } = ajustes(duracion)
  const fotogramas = path.join(carpeta, 'fotogramas.nut')
  const ogg = path.join(carpeta, 'audio.ogg')
  const { video, audio: conAudio } = await pistas(entrada)
  if (!video) throw new Error('no se pudo leer el video')
  await ejecutar([
    '-y', '-skip_loop_filter', 'all', '-flags2', '+fast', '-t', String(MAX_SEGUNDOS), '-i', entrada,
    '-map', '0:v:0', '-vf', filtro(fps), '-c:v', 'rawvideo', '-f', 'nut', fotogramas,
    ...(conAudio ? ['-map', '0:a:0', '-vn', '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', ogg] : [])
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

export default {
  name: 's2',
  alias: [],
  async execute(sock, m) {
    const jid = m.key.remoteJid
    const video = buscarVideo(m)
    if (!video) return avisar(sock, m, '❌ RESPONDE A UN VIDEO CON #s2')

    const inicio = Date.now()
    console.log(`[s2] inicio: video de ${video.seconds || '?'}s`)
    const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 's2-'))
    try {
      const entrada = path.join(carpeta, 'video.mp4')
      const segundosVideo = Number(video.seconds) || 0

      // 1) Intenta con solo el principio del video; si no sirve, baja el video completo
      let datos
      let descarga = await descargar(video, true)
      await fs.writeFile(entrada, descarga.buffer)
      console.log(`[s2] descargado ${(descarga.buffer.length / 1024).toFixed(0)} KB${descarga.parcial ? ' (parcial)' : ''} (${((Date.now() - inicio) / 1000).toFixed(1)}s)`)
      try {
        datos = await extraer(entrada, carpeta, segundosVideo)
      } catch (e) {
        if (!descarga.parcial) throw e
        console.log('[s2] la descarga parcial no alcanzó, bajando el video completo:', e?.message || e)
        descarga = await descargar(video, false)
        await fs.writeFile(entrada, descarga.buffer)
        datos = await extraer(entrada, carpeta, segundosVideo)
      }
      const { fotogramas, audio } = datos
      if (!audio) return avisar(sock, m, '❌ EL VIDEO NO TIENE SONIDO')
      console.log(`[s2] fotogramas y audio listos (${((Date.now() - inicio) / 1000).toFixed(1)}s)`)

      const sticker = await comprimir(fotogramas, carpeta, segundosVideo)
      console.log(`[s2] video ${video.seconds || '?'}s → sticker ${(sticker.length / 1024).toFixed(0)} KB, audio ${audio ? (audio.length / 1024).toFixed(0) + ' KB' : 'sin sonido'} (${((Date.now() - inicio) / 1000).toFixed(1)}s)`)

      const subir = { upload: sock.waUploadToServer }
      const [{ stickerMessage }, { audioMessage }] = await Promise.all([
        prepareWAMessageMedia({ sticker, mimetype: 'image/webp' }, subir),
        prepareWAMessageMedia({ audio, mimetype: 'audio/ogg; codecs=opus', seconds: MAX_SEGUNDOS }, subir)
      ])

      // Sticker animado normal con su audio dentro (campo audioMessage del sticker).
      // Si la app no soporta stickers con sonido, al menos se ve el sticker animado.
      const contenido = {
        stickerMessage: {
          ...stickerMessage,
          isAnimated: true,
          audioMessage: { ...audioMessage, seconds: Math.min(Number(video.seconds) || MAX_SEGUNDOS, MAX_SEGUNDOS) }
        }
      }
      const msg = generateWAMessageFromContent(jid, contenido, { quoted: m, userJid: sock.user.id })
      await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
      console.log(`[s2] sticker enviado en ${((Date.now() - inicio) / 1000).toFixed(1)}s`)
    } catch (e) {
      console.log('[s2] error:', e?.message || e)
      await avisar(sock, m, '❌ NO SE PUDO CREAR EL STICKER')
    } finally {
      fs.rm(carpeta, { recursive: true, force: true }).catch(() => {})
    }
  }
}
