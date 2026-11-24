import { spawn } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import ffmpeg from 'ffmpeg-static'
import { downloadContentFromMessage, prepareWAMessageMedia, generateWAMessageFromContent } from '@itsliaaa/baileys'

// WhatsApp deja hasta 5 segundos de sonido en stickers hechos con video
const MAX_SEGUNDOS = 5
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

function ejecutar(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.split('\n').slice(-3).join(' ')))))
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

async function descargar(video) {
  const stream = await downloadContentFromMessage(video, 'video')
  const partes = []
  for await (const parte of stream) partes.push(parte)
  return Buffer.concat(partes)
}

async function convertir(entrada, carpeta) {
  const webp = path.join(carpeta, 'sticker.webp')
  const ogg = path.join(carpeta, 'audio.ogg')

  // Sticker animado 512x512 con fondo transparente; si pesa mucho, baja calidad y fps
  const intentos = [
    [15, 60],
    [12, 40],
    [10, 25],
    [8, 15]
  ]
  let sticker = null
  for (const [fps, calidad] of intentos) {
    await ejecutar([
      '-y', '-i', entrada, '-t', String(MAX_SEGUNDOS), '-an',
      '-vf', `fps=${fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=0x00000000`,
      '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', String(calidad), '-loop', '0', '-preset', 'default',
      webp
    ])
    sticker = await fs.readFile(webp)
    if (sticker.length <= MAX_BYTES) break
  }

  let audio = null
  try {
    await ejecutar(['-y', '-i', entrada, '-t', String(MAX_SEGUNDOS), '-vn', '-ac', '1', '-c:a', 'libopus', '-b:a', '64k', ogg])
    audio = await fs.readFile(ogg)
    if (audio.length < 200) audio = null // el video no tenía sonido
  } catch (e) {
    audio = null
  }
  return { sticker, audio }
}

export default {
  name: 's2',
  alias: [],
  async execute(sock, m) {
    const jid = m.key.remoteJid
    const video = buscarVideo(m)
    if (!video) return avisar(sock, m, '❌ RESPONDE A UN VIDEO CON #s2')

    const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 's2-'))
    try {
      const entrada = path.join(carpeta, 'video.mp4')
      await fs.writeFile(entrada, await descargar(video))

      const { sticker, audio } = await convertir(entrada, carpeta)
      if (!audio) return avisar(sock, m, '❌ EL VIDEO NO TIENE SONIDO')

      const subir = { upload: sock.waUploadToServer }
      const { stickerMessage } = await prepareWAMessageMedia({ sticker, mimetype: 'image/webp' }, subir)
      const { audioMessage } = await prepareWAMessageMedia(
        { audio, mimetype: 'audio/ogg; codecs=opus', seconds: MAX_SEGUNDOS },
        subir
      )

      // Formato de sticker con sonido: el sticker lleva su audio dentro
      const contenido = {
        audioStickerMessage: {
          message: {
            stickerMessage: {
              ...stickerMessage,
              isAnimated: true,
              audioMessage: { ...audioMessage, seconds: Math.min(Number(video.seconds) || MAX_SEGUNDOS, MAX_SEGUNDOS) }
            }
          }
        }
      }
      const msg = generateWAMessageFromContent(jid, contenido, { quoted: m, userJid: sock.user.id })
      await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
    } finally {
      fs.rm(carpeta, { recursive: true, force: true }).catch(() => {})
    }
  }
}
