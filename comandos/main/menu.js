const URL_CANAL = 'https://whatsapp.com/channel/0029Vb9eodxFsn0bzlsFDr0F'
const IMAGEN = 'https://i.imgur.com/dQg1FJH.jpeg'
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

    // Imagen primero; el botón interactivo no se muestra bien con imagen adjunta
    try {
      await sock.sendMessage(jid, { image: { url: IMAGEN } })
    } catch (e) {
      console.log('Error al enviar la imagen del menú:', e?.message || e)
    }

    await sock.sendMessage(
      jid,
      {
        text: texto,
        footer: FOOTER,
        mentions: [usuarioJid],
        nativeFlow: [
          {
            text: '♦️ CANAL',
            url: URL_CANAL,
            useWebview: true
          }
        ]
      },
      { quoted: m }
    )
  }
}
