import { prepareWAMessageMedia, generateWAMessageFromContent } from '@itsliaaa/baileys'

export const PREFIJO = '#'
export const URL_CANAL = 'https://whatsapp.com/channel/0029Vb9eodxFsn0bzlsFDr0F'
export const FOOTER = '© Mikelennn\n© ErzaBot'
export const BOTON_CANAL = { text: '♦️ CANAL', url: URL_CANAL, useWebview: true }

// ---------- Texto ----------
const BOLD_MAY = 0x1d400
const BOLD_MIN = 0x1d41a
const BOLD_NUM = 0x1d7ce

export function negrita(texto) {
  // NFD separa las tildes para poder poner en negrita la letra base (Ú → 𝐔́)
  return [...String(texto).normalize('NFD')]
    .map((c) => {
      const code = c.charCodeAt(0)
      if (code >= 65 && code <= 90) return String.fromCodePoint(BOLD_MAY + code - 65)
      if (code >= 97 && code <= 122) return String.fromCodePoint(BOLD_MIN + code - 97)
      if (code >= 48 && code <= 57) return String.fromCodePoint(BOLD_NUM + code - 48)
      return c
    })
    .join('')
}

// Caja con el mismo estilo del #ping
// filas: [['ETIQUETA', 'valor'], 'línea libre', ...]
export function caja(titulo, filas, emoji = '♥️') {
  const lineas = filas.map((f) =>
    !Array.isArray(f)
      ? `┃ ${f}`
      : String(f[1]).startsWith('@')
        ? `┃ ♡ ${negrita(f[0])}: ${f[1]}`
        : `┃ ♡ ${negrita(f[0])}: *${f[1]}*`
  )
  return (
    `╭━━━〔${emoji} ${negrita(titulo)} ${emoji}〕━━━╮\n` +
    lineas.join('\n') +
    `\n╰━━━━━━━━━━━━━━━━━╯`
  )
}

export const dos = (n) => String(n).padStart(2, '0')

export function formatearTiempo(segundos) {
  const d = Math.floor(segundos / 86400)
  const h = Math.floor((segundos % 86400) / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  return `${d ? d + 'D ' : ''}${dos(h)}H ${dos(m)}M ${dos(s)}S`
}

export const aleatorio = (lista) => lista[Math.floor(Math.random() * lista.length)]
export const entero = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// ---------- Mensajes / usuarios ----------
export const numero = (jid = '') => String(jid).split('@')[0].split(':')[0]
export const esGrupo = (jid = '') => jid.endsWith('@g.us')

export function remitente(sock, m) {
  const jid = m.key.remoteJid
  return m.key.participant || (esGrupo(jid) ? sock.user.id : jid)
}

export function contextInfo(m) {
  const msg = m.message || {}
  for (const v of Object.values(msg)) {
    if (v && typeof v === 'object' && v.contextInfo) return v.contextInfo
  }
  return {}
}

// Usuarios mencionados o el autor del mensaje citado
export function objetivos(m) {
  const ctx = contextInfo(m)
  const lista = [...(ctx.mentionedJid || [])]
  if (ctx.participant && !lista.includes(ctx.participant)) lista.push(ctx.participant)
  return lista
}

export function textoCitado(m) {
  const q = contextInfo(m).quotedMessage
  if (!q) return ''
  return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || ''
}

// ---------- Grupos ----------
function mismoUsuario(p, jid) {
  const n = numero(jid)
  return [p.id, p.lid, p.phoneNumber].some((x) => x && numero(x) === n)
}

export async function datosGrupo(sock, m) {
  const jid = m.key.remoteJid
  const meta = await sock.groupMetadata(jid)
  const autor = remitente(sock, m)
  const admins = meta.participants.filter((p) => p.admin)
  const esAdmin = m.key.fromMe || admins.some((p) => mismoUsuario(p, autor))
  const botAdmin = admins.some((p) => mismoUsuario(p, sock.user.id) || (sock.user.lid && mismoUsuario(p, sock.user.lid)))
  return { meta, admins, esAdmin, botAdmin, autor }
}

// ---------- Red ----------
const CABECERAS = { 'User-Agent': 'Mozilla/5.0 (ErzaBot WhatsApp)' }

export async function descargar(url) {
  const r = await fetch(url, { headers: CABECERAS, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

export async function obtenerJSON(url, opciones = {}) {
  const r = await fetch(url, { ...opciones, headers: { ...CABECERAS, ...(opciones.headers || {}) }, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export async function obtenerTexto(url) {
  const r = await fetch(url, { headers: CABECERAS, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}

// ---------- Botones ----------
function botonCrudo(b) {
  if (b.id) return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }) }
  if (b.copy) return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: b.text, copy_code: b.copy }) }
  if (b.url) {
    return {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({ display_text: b.text, url: b.url, merchant_url: b.url, webview_interaction: !!b.useWebview })
    }
  }
  if (b.sections) return { name: 'single_select', buttonParamsJson: JSON.stringify({ title: b.text, sections: b.sections }) }
  return b
}

// Detecta el formato real de la imagen por sus primeros bytes
function tipoImagen(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return 'image/webp'
  if (buffer.slice(0, 3).toString() === 'GIF') return 'image/gif'
  return 'image/jpeg'
}

// Imagen en el encabezado SIN caption propio (si no, WhatsApp lo marca como no compatible)
async function enviarConImagen(sock, m, texto, imagen, botones, mentions) {
  const jid = m.key.remoteJid
  const buffer = Buffer.isBuffer(imagen) ? imagen : await descargar(imagen)
  const { imageMessage } = await prepareWAMessageMedia(
    { image: buffer, mimetype: tipoImagen(buffer) },
    { upload: sock.waUploadToServer }
  )
  delete imageMessage.caption

  const contenido = {
    interactiveMessage: {
      header: { hasMediaAttachment: true, imageMessage },
      body: { text: texto },
      footer: { text: FOOTER },
      nativeFlowMessage: { buttons: botones.map(botonCrudo), messageParamsJson: '{}' },
      contextInfo: { mentionedJid: mentions }
    }
  }
  const msg = generateWAMessageFromContent(jid, contenido, { quoted: m, userJid: sock.user.id })
  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
  return msg
}

// Envía un mensaje con footer y botones (y opcionalmente imagen)
export async function enviar(sock, m, texto, { botones = [], mentions = [], imagen = null, canal = true } = {}) {
  const jid = m.key.remoteJid
  // Siempre hay al menos un botón: sin botones propios va el del canal
  const lista = botones.length ? [...botones, ...(canal ? [BOTON_CANAL] : [])] : [BOTON_CANAL]

  if (imagen) {
    try {
      return await enviarConImagen(sock, m, texto, imagen, lista, mentions)
    } catch (e) {
      console.log('Error al enviar con imagen, enviando sin imagen:', e?.message || e)
    }
  }
  return sock.sendMessage(jid, { text: texto, footer: FOOTER, mentions, nativeFlow: lista }, { quoted: m })
}

export function error(sock, m, filas) {
  return enviar(sock, m, caja('ERROR', filas, '❌'))
}

export function uso(sock, m, ejemplo, descripcion = 'Uso incorrecto') {
  return error(sock, m, [['MOTIVO', descripcion], ['EJEMPLO', ejemplo]])
}
