import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { downloadContentFromMessage } from '@itsliaaa/baileys'
import { MAX_SEGUNDOS, crearSticker, enviarSticker } from '../../lib/sticker.js'

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
        datos = await crearSticker(entrada, carpeta, segundosVideo)
      } catch (e) {
        if (!descarga.parcial) throw e
        console.log('[s2] la descarga parcial no alcanzó, bajando el video completo:', e?.message || e)
        descarga = await descargar(video, false)
        await fs.writeFile(entrada, descarga.buffer)
        datos = await crearSticker(entrada, carpeta, segundosVideo)
      }
      const { sticker, audio } = datos
      if (!audio) return avisar(sock, m, '❌ EL VIDEO NO TIENE SONIDO')
      console.log(`[s2] video ${video.seconds || '?'}s → sticker ${(sticker.length / 1024).toFixed(0)} KB, audio ${(audio.length / 1024).toFixed(0)} KB (${((Date.now() - inicio) / 1000).toFixed(1)}s)`)

      await enviarSticker(sock, jid, { sticker, audio, segundos: segundosVideo, citado: m })
      console.log(`[s2] sticker enviado en ${((Date.now() - inicio) / 1000).toFixed(1)}s`)
    } catch (e) {
      console.log('[s2] error:', e?.message || e)
      await avisar(sock, m, '❌ NO SE PUDO CREAR EL STICKER')
    } finally {
      fs.rm(carpeta, { recursive: true, force: true }).catch(() => {})
    }
  }
}
