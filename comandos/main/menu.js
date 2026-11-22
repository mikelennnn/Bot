const URL_CANAL = 'https://whatsapp.com/channel/0029Vb9eodxFsn0bzlsFDr0F'
const IMAGEN = 'https://i.imgur.com/dQg1FJH.jpeg'
const FOOTER = '© Mikelennn\n© ErzaBot'

let miniatura = null
async function obtenerMiniatura() {
  if (miniatura) return miniatura
  try {
    const r = await fetch(IMAGEN)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    miniatura = Buffer.from(await r.arrayBuffer())
  } catch (e) {
    console.log('No se pudo descargar la imagen del menú:', e?.message || e)
  }
  return miniatura
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
      `╰━━━━━━━━━━━━━━━━━╯`

    const thumbnail = await obtenerMiniatura()

    await sock.sendMessage(
      jid,
      {
        text: texto,
        footer: FOOTER,
        mentions: [usuarioJid],
        ...(thumbnail && {
          externalAdReply: {
            title: 'ERZA-BOT',
            body: '© Mikelennn',
            thumbnail,
            largeThumbnail: true,
            url: URL_CANAL
          }
        }),
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
