import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const comandosDir = path.join(__dirname, '..')
const IMAGE_URL = 'https://i.imgur.com/9OD20dD.png'

let cachedCommandCount = null
let imagePromise = null

const countCommands = (dir) => {
  let total = 0
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      total += countCommands(ruta)
    } else if (entrada.name.endsWith('.js')) {
      total++
    }
  }
  return total
}

const getCommandCount = () => {
  if (cachedCommandCount === null) {
    try {
      cachedCommandCount = Math.max(countCommands(comandosDir), 1)
    } catch (e) {
      cachedCommandCount = 1
    }
  }
  return cachedCommandCount
}

const getMenuImage = () => {
  if (!imagePromise) {
    imagePromise = (async () => {
      if (typeof fetch !== 'function') return null

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        const res = await fetch(IMAGE_URL, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return Buffer.from(await res.arrayBuffer())
      } finally {
        clearTimeout(timeout)
      }
    })().catch(() => {
      imagePromise = null
      return null
    })
  }
  return imagePromise
}

getCommandCount()
getMenuImage()

export default {
  name: 'menu',
  alias: ['help'],
  async execute(sock, m) {
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

    const texto =
      `╭━〔🤍𝐍𝐎𝐌𝐁𝐑𝐄🤍〕━╮\n` +
      `┃ ♡ 𝐔𝐒𝐔𝐀𝐑𝐈𝐎: @${sender.split('@')[0]}\n` +
      `┃ ♡ 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒: ${getCommandCount()}\n` +
      `┃ ♡ 𝐆𝐑𝐔𝐏𝐎 ${groupName}\n` +
      `┃ ♡ 𝐌𝐈𝐄𝐌𝐁𝐑𝐎𝐒: ${miembros}\n` +
      `┃ ♡ 𝐂𝐑𝐄𝐀𝐃𝐎𝐑: *wa.me/+14123177704*\n` +
      `╰━━━━━━━━━━━━━━━━━╯\n\n` +
      `╭━━━━〔🤍 𝐌𝐀𝐈𝐍〕━━━━╮\n` +
      `┃ 𝚫 *#menu*\n` +
      `┃ 𝚫 *#help*\n` +
      `┃ ❯  \`Muestra este menu\`\n` +
      `╰━━━━━━━━━━━━━━━━━╯`

    const image = await getMenuImage()

    try {
      await sock.sendMessage(
        jid,
        image
          ? { image, caption: texto, mentions: [sender] }
          : { image: { url: IMAGE_URL }, caption: texto, mentions: [sender] },
        { quoted: m }
      )
      return
    } catch (e) {
      // fallback a solo texto si falla el envio de la imagen
    }

    try {
      await sock.sendMessage(jid, { text: texto, mentions: [sender] }, { quoted: m })
    } catch (e) {
      // ignore
    }
  }
}
