import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from '@itsliaaa/baileys'
import pino from 'pino'
import readline from 'readline'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { iniciarWeb, actualizarConexion, prepararGrupo } from './lib/web.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CARPETA_SESION = process.env.SESION_DIR || path.join(__dirname, 'sesion_bot')
const PREFIJO = '#'

// Grupos donde el bot no responde a nada (códigos de sus enlaces de invitación)
const GRUPOS_IGNORADOS = ['GDQuWpvGBbWI4JcpNKghzG', 'CpIIZ50p0gsBmyI7FQraBT']
const jidsIgnorados = new Set()

const comandos = new Map()
let pidiendoCodigo = false

async function cargarComandos(dir) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      await cargarComandos(ruta)
    } else if (entrada.name.endsWith('.js')) {
      const mod = await import(pathToFileURL(ruta).href)
      const cmd = mod.default
      if (cmd?.name) {
        comandos.set(cmd.name, cmd)
        for (const a of cmd.alias || []) comandos.set(a, cmd)
      }
    }
  }
}

// Convierte los enlaces de invitación en el ID de cada grupo
async function cargarGruposIgnorados(sock) {
  for (const codigo of GRUPOS_IGNORADOS) {
    try {
      const info = await sock.groupGetInviteInfo(codigo)
      if (info?.id) jidsIgnorados.add(info.id)
    } catch (e) {
      console.log(`No se pudo leer el enlace ${codigo}:`, e?.message || e)
    }
  }
  console.log(`Grupos ignorados: ${jidsIgnorados.size}/${GRUPOS_IGNORADOS.length}`)
}

function preguntar(texto) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise((resolve) =>
    rl.question(texto, (r) => {
      rl.close()
      resolve(r)
    })
  )
}

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState(CARPETA_SESION)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    // Primera vez: pedir número y generar código de 8 dígitos
    if (qr && !sock.authState.creds.registered && !pidiendoCodigo) {
      pidiendoCodigo = true
      const entrada =
        process.env.NUMERO ||
        (await preguntar(
          '\nEscribe tu número con código de país, sin + ni espacios (ej: 521234567890): '
        ))
      const numero = entrada.replace(/\D/g, '')
      try {
        const codigo = await sock.requestPairingCode(numero)
        console.log(`\nTu código de vinculación: ${codigo}`)
        console.log('WhatsApp > Dispositivos vinculados > Vincular con número de teléfono\n')
      } catch (e) {
        console.log('Error al pedir el código:', e?.message || e)
        pidiendoCodigo = false
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado')
      cargarGruposIgnorados(sock)
      actualizarConexion(sock)
      prepararGrupo(sock)
    }

    if (connection === 'close') {
      pidiendoCodigo = false
      const codigo = lastDisconnect?.error?.output?.statusCode
      if (codigo === DisconnectReason.loggedOut) {
        console.log('Sesión cerrada. Borrando sesión para vincular de nuevo...')
        fs.rmSync(CARPETA_SESION, { recursive: true, force: true })
      }
      setTimeout(iniciar, 3000)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const m of messages) {
      if (!m.message) continue
      if (jidsIgnorados.has(m.key.remoteJid)) continue

      const texto =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        ''

      if (!texto.startsWith(PREFIJO)) continue

      const [nombre, ...args] = texto.slice(PREFIJO.length).trim().split(/\s+/)
      const cmd = comandos.get(nombre.toLowerCase())
      if (!cmd) continue

      try {
        await cmd.execute(sock, m, { args, texto, prefijo: PREFIJO, comandos })
      } catch (e) {
        console.log(`Error en #${nombre}:`, e?.message || e)
      }
    }
  })
}

iniciarWeb()
await cargarComandos(path.join(__dirname, 'comandos'))
console.log(`Comandos cargados: ${[...new Set(comandos.values())].length}`)
await iniciar()
