export default {
  name: 'menu',
  alias: [],
  async execute(sock, m, { prefijo }) {
    const jid = m.key.remoteJid
    const nombre = m.pushName || 'usuario'

    const texto =
      `👋 Hola, *${nombre}*\n\n` +
      `╭─「 *MENÚ* 」\n` +
      `│ ${prefijo}menu\n` +
      `╰──────────────`

    await sock.sendMessage(jid, { text: texto }, { quoted: m })
  }
}
