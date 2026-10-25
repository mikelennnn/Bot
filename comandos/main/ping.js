export default {
  name: 'ping',
  alias: ['p'],
  async execute(sock, m) {
    const jid = m.key.remoteJid
    const inicio = Date.now()
    const msg = await sock.sendMessage(jid, { text: '🏓 Pinging...' })
    const fin = Date.now()
    const latencia = fin - inicio
    try {
      await sock.sendMessage(jid, { delete: msg.key })
    } catch (e) {}
    await sock.sendMessage(jid, { text: `🏓 Pong! ${latencia}ms` }, { quoted: m })
  }
}
