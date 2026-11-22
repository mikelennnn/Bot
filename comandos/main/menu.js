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

    await sock.sendMessage(jid, { text: texto, mentions: [usuarioJid] }, { quoted: m })
  }
}
