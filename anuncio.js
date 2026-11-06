const CODIGO_INVITE = 'B6WZuu3eevK0akerT0KGuN'
const URL_IG = 'https://www.instagram.com/mikvlz1'
const INTERVALO = 29 * 60 * 1000

const TEXTO =
  `¡Holaaa! 🙌 Sigan esta cuenta y yo les sigo de vuelta 🔥\n` +
  `🔗 ${URL_IG}\n` +
  `Follow back seguro desde:\n` +
  `🔸 @andr.esvlz1\n` +
  `🔸 @damvlz1\n` +
  `🔸 @mikvlz1`

let temporizador = null
let grupoJid = null

async function obtenerGrupo(sock) {
  if (grupoJid) return grupoJid
  try {
    const r = await sock.groupAcceptInvite(CODIGO_INVITE)
    grupoJid = typeof r === 'string' ? r : r?.id
  } catch (e) {
    // Si ya está dentro del grupo, saca el id desde el enlace
    const info = await sock.groupGetInviteInfo(CODIGO_INVITE)
    grupoJid = info.id
  }
  return grupoJid
}

async function enviar(sock) {
  try {
    const jid = await obtenerGrupo(sock)
    await sock.sendMessage(jid, {
      text: TEXTO,
      footer: 'dv x 3',
      nativeFlow: [
        {
          text: '📷 INSTAGRAM',
          url: URL_IG,
          useWebview: true
        }
      ]
    })
    console.log('📢 Anuncio enviado')
  } catch (e) {
    console.log('Error al enviar el anuncio:', e?.message || e)
  }
}

export function iniciarAnuncio(sock) {
  if (temporizador) clearInterval(temporizador)
  enviar(sock)
  temporizador = setInterval(() => enviar(sock), INTERVALO)
}