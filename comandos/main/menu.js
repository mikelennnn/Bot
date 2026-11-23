import { prepareWAMessageMedia, generateWAMessageFromContent } from '@itsliaaa/baileys'

const URL_CANAL = 'https://whatsapp.com/channel/0029Vb9eodxFsn0bzlsFDr0F'
const IMAGEN = 'https://i.imgur.com/dQg1FJH.jpeg'
const FOOTER = '© Mikelennn\n© ErzaBot'

let imagenBuffer = null
async function obtenerImagen() {
  if (imagenBuffer) return imagenBuffer
  const r = await fetch(IMAGEN)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  imagenBuffer = Buffer.from(await r.arrayBuffer())
  return imagenBuffer
}

// Mensaje interactivo con imagen en el encabezado, armado a mano:
// la imagen va SIN caption propio (el texto va en el body), si no WhatsApp lo marca como no compatible.
async function enviarConImagen(sock, jid, m, texto, usuarioJid) {
  const buffer = await obtenerImagen()
  const { imageMessage } = await prepareWAMessageMedia(
    { image: buffer, mimetype: 'image/jpeg' },
    { upload: sock.waUploadToServer }
  )
  delete imageMessage.caption

  const contenido = {
    interactiveMessage: {
      header: { hasMediaAttachment: true, imageMessage },
      body: { text: texto },
      footer: { text: FOOTER },
      nativeFlowMessage: {
        buttons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '♦️ CANAL',
              url: URL_CANAL,
              merchant_url: URL_CANAL,
              webview_interaction: true
            })
          }
        ],
        messageParamsJson: '{}'
      },
      contextInfo: { mentionedJid: [usuarioJid] }
    }
  }
  const msg = generateWAMessageFromContent(jid, contenido, { quoted: m, userJid: sock.user.id })
  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
}

export default {
  name: 'menu',
  alias: ['help'],
  async execute(sock, m, { comandos }) {
    const jid = m.key.remoteJid
    const esGrupo = jid.endsWith('@g.us')
    const usuarioJid = m.key.participant || (esGrupo ? sock.user.id : jid)
    const usuario = usuarioJid.split('@')[0].split(':')[0]
    const total = new Set(comandos.values()).size

    let grupo = 'Privado'
    let miembros = '1'
    if (esGrupo) {
      try {
        const meta = await sock.groupMetadata(jid)
        grupo = meta.subject
        miembros = String(meta.participants.length)
      } catch (e) {
        grupo = 'Desconocido'
        miembros = '?'
      }
    }

    const texto =
      `╭━〔 ♥️ 𝐄𝐑𝐙𝐀-𝐁𝐎𝐓 ♥️ 〕━╮\n` +
      `┃ ♡ 𝐔𝐒𝐔𝐀𝐑𝐈𝐎: @${usuario}\n` +
      `┃ ♡ 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒: ${total}\n` +
      `┃ ♡ 𝐆𝐑𝐔𝐏𝐎: ${grupo}\n` +
      `┃ ♡ 𝐌𝐈𝐄𝐌𝐁𝐑𝐎𝐒: ${miembros}\n` +
      `┃ ♡ 𝐂𝐑𝐄𝐀𝐃𝐎𝐑: *ANÓNIMO*\n` +
      `╰━━━━━━━━━━━━━━━━━╯\n\n` +
      `╭━━━━〔 ♦️ 𝐌𝐀𝐈𝐍 〕━━━━╮\n` +
      `┃ 𝚫 *#menu*\n` +
      `┃ 𝚫 *#help*\n` +
      `┃ ❯ \`Muestra este menu\`\n` +
      `┃ 𝚫 *#ping*\n` +
      `┃ 𝚫 *#pong*\n` +
      `┃ ❯ \`Muestra el ping del bot\`\n` +
      `╰━━━━━━━━━━━━━━━━━╯`

    try {
      await enviarConImagen(sock, jid, m, texto, usuarioJid)
    } catch (e) {
      console.log('Error al enviar el menú con imagen, enviando sin imagen:', e?.message || e)
      await sock.sendMessage(
        jid,
        {
          text: texto,
          footer: FOOTER,
          mentions: [usuarioJid],
          nativeFlow: [{ text: '♦️ CANAL', url: URL_CANAL, useWebview: true }]
        },
        { quoted: m }
      )
    }
  }
}
