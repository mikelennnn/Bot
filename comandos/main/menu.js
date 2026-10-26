export default {
  name: 'menu',
  alias: ['help'],
  async execute(sock, m, { prefijo }) {
    const jid = m.key.remoteJid
    const isGroup = jid.endsWith('@g.us')
    const sender = m.key.participant || jid
    const nombre = m.pushName || 'usuario'

    let groupName = '**'
    let miembros = '**'

    if (isGroup) {
      try {
        const metadata = await sock.groupMetadata(jid)
        groupName = metadata.subject || '**'
        miembros = metadata.participants?.length || '**'
      } catch (e) {
        groupName = '**'
        miembros = '**'
      }
    }

    // Count unique commands
    const { default: fs } = await import('fs')
    const { fileURLToPath } = await import('url')
    const path = await import('path')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const comandosDir = path.join(__dirname, '..')
    let commandCount = 1

    try {
      const countUnique = async (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true })
        const cmds = new Set()
        for (const entrada of files) {
          const ruta = path.join(dir, entrada.name)
          if (entrada.isDirectory()) {
            await countUnique(ruta)
          } else if (entrada.name.endsWith('.js')) {
            try {
              const { pathToFileURL } = await import('url')
              const mod = await import(pathToFileURL(ruta).href)
              const cmd = mod.default
              if (cmd?.name) {
                cmds.add(cmd)
              }
            } catch (e) {}
          }
        }
        return cmds.size
      }
      commandCount = await countUnique(comandosDir)
    } catch (e) {
      commandCount = 1
    }

    const texto =
      `╭━〔🤍𝐍𝐎𝐌𝐁𝐑𝐄🤍〕━╮\n` +
      `┃ ♡ 𝐔𝐒𝐔𝐀𝐑𝐈𝐎: @${sender.split('@')[0]}\n` +
      `┃ ♡ 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒: ${commandCount}\n` +
      `┃ ♡ 𝐆𝐑𝐔𝐏𝐎 ${groupName}\n` +
      `┃ ♡ 𝐌𝐈𝐄𝐌𝐁𝐑𝐎𝐒: ${miembros}\n` +
      `┃ ♡ 𝐂𝐑𝐄𝐀𝐃𝐎𝐑: *wa.me/+14123177704*\n` +
      `╰━━━━━━━━━━━━━━━━━╯\n\n` +
      `╭━━━━〔🤍 𝐌𝐀𝐈𝐍〕━━━━╮\n` +
      `┃ 𝚫 *#menu*\n` +
      `┃ 𝚫 *#help*\n` +
      `┃ ❯  \`Muestra este menu\`\n` +
      `╰━━━━━━━━━━━━━━━━━╯`

    await sock.sendMessage(
      jid,
      {
        image: { url: 'https://i.imgur.com/9OD20dD.png' },
        caption: texto,
        mentions: [sender]
      },
      { quoted: m }
    )
  }
}
