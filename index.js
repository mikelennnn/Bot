import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore
} from '@itsliaaa/baileys'
import pino from 'pino'
import readline from 'readline'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { iniciarWeb, actualizarConexion, prepararCanal } from './lib/web.js'
import { datosGrupoGuardados, escucharGrupos, cacheDispositivos, recibosRapidos, contarNodos } from './lib/cache.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CARPETA_SESION = process.env.SESION_DIR || path.join(__dirname, 'sesion_bot')
const PREFIJO = '#'

// Borra la sesión del número anterior (+52 294 199 2629), que ya no se usa
const SESION_VIEJA = '/data/sesion_erzabot'
if (path.resolve(CARPETA_SESION) !== SESION_VIEJA && fs.existsSync(SESION_VIEJA)) {
  fs.rmSync(SESION_VIEJA, { recursive: true, force: true })
  console.log('🗑️ Sesión del número anterior borrada')
}

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

let llavesEnMemoria = null

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState(CARPETA_SESION)
  const { version } = await fetchLatestBaileysVersion()

  const logger = pino({ level: 'silent' })
  const sock = makeWASocket({
    version,
    logger,
    // Llaves en memoria: antes cada envío leía cientos de archivos del disco.
    // Se conserva entre reconexiones para no volver a cargar todo desde cero.
    auth: { creds: state.creds, keys: (llavesEnMemoria ||= makeCacheableSignalKeyStore(state.keys, logger)) },
    cachedGroupMetadata: datosGrupoGuardados,
    userDevicesCache: cacheDispositivos,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: false
  })

  sock.ev.on('creds.update', saveCreds)
  escucharGrupos(sock)
  recibosRapidos(sock)
  contarNodos(sock)

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
      prepararCanal(sock)
    }

    if (connection === 'close') {
      pidiendoCodigo = false
      const codigo = lastDisconnect?.error?.output?.statusCode
      if (codigo === DisconnectReason.loggedOut) {
        console.log('Sesión cerrada. Borrando sesión para vincular de nuevo...')
        fs.rmSync(CARPETA_SESION, { recursive: true, force: true })
        llavesEnMemoria = null // sesión nueva: llaves nuevas
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

// Interruptor: true = bot apagado (no se conecta a WhatsApp y la página avisa que está apagado)
const APAGADO = false

if (APAGADO) {
  const http = await import('http')
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stickers con sonido</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#120a0c;color:#f3e9eb;font-family:system-ui,sans-serif;text-align:center;padding:16px}h1{font-size:1.4rem;margin:0 0 8px}p{color:#c9b3b8;margin:0}</style></head>
<body><div><h1>⏸️ El bot está apagado por ahora</h1><p>Vuelve más tarde para hacer tu sticker.</p></div></body></html>`
  http
    .createServer((req, res) => {
      if (req.url.startsWith('/api/')) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        return res.end(JSON.stringify({ error: 'El bot está apagado por ahora, vuelve más tarde' }))
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(html)
    })
    .listen(Number(process.env.PORT) || 8080, () => console.log('⏸️ Bot APAGADO (cambia APAGADO a false en index.js para prenderlo)'))
} else {
  iniciarWeb()
  await cargarComandos(path.join(__dirname, 'comandos'))
  console.log(`Comandos cargados: ${[...new Set(comandos.values())].length}`)
  await iniciar()
}
