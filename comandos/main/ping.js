const dos = (n) => String(n).padStart(2, '0')

function formatearActivo(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  return `${dos(h)}H ${dos(m)}M ${dos(s)}S`
}

function estadoPing(ms) {
  if (ms < 450) return '🟩 BUENO'
  if (ms <= 850) return '🟨 MEDIO'
  return '🟥 MALO'
}

export default {
  name: 'ping',
  alias: ['pong'],
  async execute(sock, m) {
    const jid = m.key.remoteJid

    const calculando =
      `╭━━━〔♥️ 𝐏𝐈𝐍𝐆 ♥️〕━━━╮\n` +
      `┃ ♡ 𝐏𝐈𝐍𝐆: *CALCULANDO*\n` +
      `┃ ♡ 𝐀𝐂𝐓𝐈𝐕𝐎: *CALCULANDO*\n` +
      `┃ ♡ 𝐄𝐒𝐓𝐀𝐃𝐎: *CALCULANDO*\n` +
      `╰━━━━━━━━━━━━━━━━━╯`

    // Mide cuánto tarda en enviarse el mensaje de prueba
    const inicio = Date.now()
    const enviado = await sock.sendMessage(jid, { text: calculando }, { quoted: m })
    const ms = Date.now() - inicio

    // Borra el mensaje de prueba de inmediato
    try {
      await sock.sendMessage(jid, { delete: enviado.key })
    } catch (e) {}

    const resultado =
      `╭━━━〔♥️ 𝐏𝐈𝐍𝐆 ♥️〕━━━╮\n` +
      `┃ ♡ 𝐏𝐈𝐍𝐆: *${ms}MS*\n` +
      `┃ ♡ 𝐀𝐂𝐓𝐈𝐕𝐎: *${formatearActivo(process.uptime())}*\n` +
      `┃ ♡ 𝐄𝐒𝐓𝐀𝐃𝐎: *${estadoPing(ms)}*\n` +
      `╰━━━━━━━━━━━━━━━━━╯`

    await sock.sendMessage(jid, { text: resultado }, { quoted: m })
  }
}
