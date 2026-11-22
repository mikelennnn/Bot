import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const URL_CANAL = 'https://whatsapp.com/channel/0029Vb9eodxFsn0bzlsFDr0F'
const FOOTER = '© Mikelennn\n© ErzaBot'

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
      `╰━━━━━━━━━━━━━━━━━╯`

    try {
      const contenido = {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({ text: texto }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: FOOTER }),
              header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                      display_text: '♦️ CANAL',
                      url: URL_CANAL,
                      merchant_url: URL_CANAL
                    })
                  }
                ]
              }),
              contextInfo: { mentionedJid: [usuarioJid] }
            })
          }
        }
      }
      const msg = generateWAMessageFromContent(jid, contenido, { quoted: m, userJid: sock.user.id })
      await sock.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [
          {
            tag: 'biz',
            attrs: {},
            content: [
              {
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
              }
            ]
          }
        ]
      })
    } catch (e) {
      // Si el botón falla, enviar el menú normal con el enlace
      await sock.sendMessage(
        jid,
        { text: `${texto}\n\n♦️ CANAL: ${URL_CANAL}\n\n${FOOTER}`, mentions: [usuarioJid] },
        { quoted: m }
      )
    }
  }
}
