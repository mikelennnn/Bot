import { enviar, negrita, numero, remitente, esGrupo, descargar } from '../../lib/util.js'

const IMAGEN = 'https://i.imgur.com/dQg1FJH.jpeg'

// Orden y título de cada sección del menú
const CATEGORIAS = [
  ['main', '♦️', 'MAIN'],
  ['grupos', '👥', 'GRUPOS'],
  ['juegos', '🎮', 'JUEGOS'],
  ['herramientas', '🛠️', 'HERRAMIENTAS'],
  ['multimedia', '🎬', 'MULTIMEDIA']
]

// Estos van al principio de su sección
const PRIMERO = ['ping', 'menu']

let imagenBuffer = null
async function obtenerImagen() {
  if (!imagenBuffer) imagenBuffer = await descargar(IMAGEN)
  return imagenBuffer
}

function seccion(emoji, titulo, cmds) {
  const lineas = []
  for (const c of cmds) {
    lineas.push(`┃ 𝚫 *#${c.name}*`)
    for (const a of c.alias || []) lineas.push(`┃ 𝚫 *#${a}*`)
    lineas.push(`┃ ❯ \`${c.desc || 'Sin descripción'}\``)
  }
  return `╭━━━━〔 ${emoji} ${negrita(titulo)} 〕━━━━╮\n` + lineas.join('\n') + `\n╰━━━━━━━━━━━━━━━━━╯`
}

export default {
  name: 'menu',
  alias: ['help'],
  categoria: 'main',
  desc: 'Muestra este menu',
  async execute(sock, m, { comandos }) {
    const jid = m.key.remoteJid
    const usuarioJid = remitente(sock, m)
    const unicos = [...new Set(comandos.values())]

    let grupo = 'Privado'
    let miembros = '1'
    if (esGrupo(jid)) {
      try {
        const meta = await sock.groupMetadata(jid)
        grupo = meta.subject
        miembros = String(meta.participants.length)
      } catch (e) {
        grupo = 'Desconocido'
        miembros = '?'
      }
    }

    const cabecera =
      `╭━〔 ♥️ 𝐄𝐑𝐙𝐀-𝐁𝐎𝐓 ♥️ 〕━╮\n` +
      `┃ ♡ 𝐔𝐒𝐔𝐀𝐑𝐈𝐎: @${numero(usuarioJid)}\n` +
      `┃ ♡ 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒: ${unicos.length}\n` +
      `┃ ♡ 𝐆𝐑𝐔𝐏𝐎: ${grupo}\n` +
      `┃ ♡ 𝐌𝐈𝐄𝐌𝐁𝐑𝐎𝐒: ${miembros}\n` +
      `┃ ♡ 𝐂𝐑𝐄𝐀𝐃𝐎𝐑: *ANÓNIMO*\n` +
      `╰━━━━━━━━━━━━━━━━━╯`

    const secciones = CATEGORIAS.map(([clave, emoji, titulo]) => {
      const cmds = unicos
        .filter((c) => (c.categoria || 'main') === clave)
        .sort((a, b) => (PRIMERO.indexOf(b.name) - PRIMERO.indexOf(a.name)) || a.name.localeCompare(b.name))
      return cmds.length ? seccion(emoji, titulo, cmds) : null
    }).filter(Boolean)

    const texto = [cabecera, ...secciones].join('\n\n')

    let imagen = null
    try {
      imagen = await obtenerImagen()
    } catch (e) {
      console.log('No se pudo descargar la imagen del menú:', e?.message || e)
    }

    await enviar(sock, m, texto, { imagen, mentions: [usuarioJid] })
  }
}
