import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from '@itsliaaa/baileys'
import pino from 'pino'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..', '..')
const MAX_SUBBOTS = 15

const subbotsActivos = new Map()

function contarSubbots() {
  let maxNum = 0
  try {
    const entradas = fs.readdirSync(ROOT_DIR)
    for (const e of entradas) {
      const m = e.match(/^sesion_erzabot_subbot(\d+)$/)
      if (m) {
        const num = parseInt(m[1])
        if (num > maxNum) maxNum = num
      }
    }
  } catch (e) {}
  return maxNum
}

function obtenerSiguienteNumero() {
  const actual = contarSubbots()
  if (actual >= MAX_SUBBOTS) return null
  return actual + 1
}

function mensajeError() {
  return (
    `╭━━━━〔❌ 𝐄𝐑𝐑𝐎𝐑〕━━━━╮\n` +
    `┃ 𝚫 *Uso incorrecto*\n` +
    `┃\n` +
    `┃ ❯ *Uso correcto:*\n` +
    `┃    #code (tu número)\n` +
    `┃\n` +
    `┃ ❯ *Ejemplo:*\n` +
    `┃    #code 52000000000\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`
  )
}

function mensajeCreando() {
  return (
    `╭━━━━〔🤍 𝐒𝐔𝐁𝐁𝐎𝐓〕━━━━╮\n` +
    `┃ 𝚫 *Creando tu subbot...*\n` +
    `┃ ❯ *esto puede tardar unos segundos*\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`
  )
}

function mensajeVincular() {
  return (
    `╭━━━━〔🤍 𝐒𝐔𝐁𝐁𝐎𝐓〕━━━━╮\n` +
    `┃ 𝚫 *Vincula tu Subbot*\n` +
    `┃\n` +
    `┃ ❯ 1. Abre WhatsApp y pulsa los *3 puntitos* ⋮\n` +
    `┃ ❯ 2. Entra en *Dispositivos vinculados*\n` +
    `┃ ❯ 3. Pulsa *Vincular un dispositivo*\n` +
    `┃ ❯ 4. Elige *Vincular con número de teléfono*\n` +
    `┃ ❯ 5. Escribe el *código* que te enviaré a continuación\n` +
    `┃\n` +
    `┃ ⏳ _El código caduca en poco tiempo, úsalo enseguida._ \n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`
  )
}

function mensajeConectado() {
  return (
    `╭━━━━〔🤍 𝐒𝐔𝐁𝐁𝐎𝐓〕━━━━╮\n` +
    `┃ 𝚫 *Subbot conectado*\n` +
    `┃ ❯ *Listo para usar*\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`
  )
}

async function levantarSubbot(ctx) {
  const { numSubbot, carpetaSesion, numero, sock, jid, quotedMsg } = ctx

  const { state, saveCreds } = await useMultiFileAuthState(carpetaSesion)
  const { version } = await fetchLatestBaileysVersion()

  const sockSub = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: false
  })

  subbotsActivos.set(numSubbot, { sock: sockSub, numero, carpetaSesion })

  sockSub.ev.on('creds.update', saveCreds)

  sockSub.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const m of messages) {
      if (!m.message) continue

      const texto =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        ''

      if (!texto.startsWith(ctx.prefijo)) continue

      const [nombre, ...args] = texto.slice(ctx.prefijo.length).trim().split(/\s+/)
      const cmd = ctx.comandos.get(nombre.toLowerCase())
      if (!cmd) continue

      try {
        await cmd.execute(sockSub, m, {
          args,
          texto,
          prefijo: ctx.prefijo,
          comandos: ctx.comandos
        })
      } catch (e) {
        console.log(`Error en subbot${numSubbot} #${nombre}:`, e?.message || e)
      }
    }
  })

  let pidiendoCodigo = false

  sockSub.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (
      (connection === 'connecting' || qr) &&
      !sockSub.authState.creds.registered &&
      !ctx.codigoEnviado &&
      !pidiendoCodigo
    ) {
      pidiendoCodigo = true
      await new Promise((r) => setTimeout(r, 1500))
      try {
        const codigo = await sockSub.requestPairingCode(numero)
        ctx.codigoEnviado = true
        await sock.sendMessage(jid, { text: `*Código:* ${codigo}` }, { quoted: quotedMsg })
      } catch (e) {
        await sock.sendMessage(
          jid,
          { text: `Error al generar código: ${e?.message || e}` },
          { quoted: quotedMsg }
        )
        pidiendoCodigo = false
      }
    }

    if (connection === 'open') {
      if (!ctx.avisado) {
        ctx.avisado = true
        try {
          await sock.sendMessage(jid, { text: mensajeConectado() }, { quoted: quotedMsg })
        } catch (e) {}
      }
    }

    if (connection === 'close') {
      pidiendoCodigo = false
      const status = lastDisconnect?.error?.output?.statusCode
      const registrado = sockSub.authState.creds.registered

      if (status === DisconnectReason.loggedOut) {
        try {
          fs.rmSync(carpetaSesion, { recursive: true, force: true })
        } catch (e) {}
        subbotsActivos.delete(numSubbot)
        return
      }

      if (status === DisconnectReason.restartRequired || registrado) {
        setTimeout(() => {
          levantarSubbot(ctx).catch(async (e) => {
            subbotsActivos.delete(numSubbot)
            try {
              await sock.sendMessage(
                jid,
                { text: `Error al reconectar subbot: ${e?.message || e}` },
                { quoted: quotedMsg }
              )
            } catch (_) {}
          })
        }, 2000)
        return
      }

      try {
        fs.rmSync(carpetaSesion, { recursive: true, force: true })
      } catch (e) {}
      subbotsActivos.delete(numSubbot)
      try {
        await sock.sendMessage(
          jid,
          { text: 'No se pudo vincular. Vuelve a usar #code (tu número).' },
          { quoted: quotedMsg }
        )
      } catch (e) {}
    }
  })

  return sockSub
}

async function crearSubbot(sock, jid, numero, quotedMsg, comandos, prefijo) {
  const numSubbot = obtenerSiguienteNumero()
  if (!numSubbot) {
    await sock.sendMessage(jid, { text: 'Límite de subbots alcanzado (15/15)' }, { quoted: quotedMsg })
    return
  }

  const carpetaSesion = path.join(ROOT_DIR, `sesion_erzabot_subbot${numSubbot}`)

  await sock.sendMessage(jid, { text: mensajeCreando() }, { quoted: quotedMsg })

  try {
    const ctx = {
      numSubbot,
      carpetaSesion,
      numero,
      sock,
      jid,
      quotedMsg,
      comandos,
      prefijo: prefijo || '#',
      codigoEnviado: false,
      avisado: false
    }

    await levantarSubbot(ctx)

    const msgVincular = {
      text: mensajeVincular(),
      footer: '© mikelennn\n© ErzaBot',
      nativeFlow: [
        {
          text: '⬜ CANAL',
          url: 'https://whatsapp.com/channel/0029VbDvslnJJhzarICFvv0L',
          useWebview: true
        }
      ]
    }

    await sock.sendMessage(jid, msgVincular, { quoted: quotedMsg })
  } catch (e) {
    await sock.sendMessage(jid, { text: `Error al crear subbot: ${e?.message || e}` }, { quoted: quotedMsg })
  }
}

export default {
  name: 'code',
  alias: ['subbot'],
  async execute(sock, m, { args, comandos, prefijo }) {
    const jid = m.key.remoteJid

    if (!args || args.length === 0) {
      await sock.sendMessage(jid, { text: mensajeError() }, { quoted: m })
      return
    }

    const numero = args[0].replace(/\D/g, '')
    if (!numero || numero.length < 8) {
      await sock.sendMessage(jid, { text: mensajeError() }, { quoted: m })
      return
    }

    await crearSubbot(sock, jid, numero, m, comandos, prefijo)
  }
}