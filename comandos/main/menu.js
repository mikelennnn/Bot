import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const comandosDir = path.join(__dirname, '..')

let cachedCommandCount = null

const countUniqueCommands = async (dir) => {
  const cmds = new Set()
  const stack = [dir]
  while (stack.length > 0) {
    const currentDir = stack.pop()
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entrada of entries) {
      const ruta = path.join(currentDir, entrada.name)
      if (entrada.isDirectory()) {
        stack.push(ruta)
      } else if (entrada.name.endsWith('.js')) {
        try {
          const mod = await import(pathToFileURL(ruta).href)
          const cmd = mod.default
          if (cmd?.name) {
            cmds.add(cmd.name)
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
  return cmds.size
}

const getCommandCount = async () => {
  if (cachedCommandCount !== null) return cachedCommandCount
  try {
    cachedCommandCount = await countUniqueCommands(comandosDir)
    if (cachedCommandCount < 1) cachedCommandCount = 1
    return cachedCommandCount
  } catch (e) {
    cachedCommandCount = 1
    return cachedCommandCount
  }
}

getCommandCount()

export default {
  name: 'menu',
  alias: ['help'],
  async execute(sock, m, { prefijo }) {
    const jid = m.key.remoteJid
    const isGroup = jid.endsWith('@g.us')
    const sender = m.key.participant || jid

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

    const commandCount = await getCommandCount()

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

    const sendMenu = async (attempt = 0) => {
      try {
        await sock.sendMessage(
          jid,
          {
            image: { url: 'https://i.imgur.com/9OD20dD.png' },
            caption: texto,
            mentions: [sender]
          },
          { quoted: m }
        )
        return
      } catch (e) {
        const msg = e?.message || ''
        if ((msg.includes('429') || e?.output?.statusCode === 429) && attempt < 3) {
          const delay = 1000 * Math.pow(2, attempt)
          await new Promise(r => setTimeout(r, delay))
          return sendMenu(attempt + 1)
        }
      }

      try {
        await sock.sendMessage(
          jid,
          {
            image: { url: 'https://i.imgur.com/9OD20dD.png' },
            caption: texto,
            mentions: [sender]
          }
        )
        return
      } catch (e) {
        // ignore
      }

      try {
        await sock.sendMessage(jid, { text: texto, mentions: [sender] }, { quoted: m })
      } catch (err) {
        // ignore
      }
    }

    await sendMenu()
  }
}
