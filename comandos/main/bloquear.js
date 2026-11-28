// #bloquear / #desbloquear respondiendo a un sticker del canal (reenviado a un chat con el bot).
// Bloquea (o desbloquea) el teléfono que hizo ese sticker en la página.
// Solo lo puede usar el propio número del bot o los números en la variable DUENOS (separados por coma).
import { bloquear } from '../../lib/moderacion.js'

const DUENOS = String(process.env.DUENOS || '').split(',').map((n) => n.replace(/\D/g, '')).filter(Boolean)

function esDueno(m) {
  if (m.key.fromMe) return true
  const quien = String(m.key.participantAlt || m.key.remoteJidAlt || m.key.participant || m.key.remoteJid || '').split('@')[0].split(':')[0]
  return DUENOS.some((n) => quien.endsWith(n) || n.endsWith(quien))
}

export default {
  name: 'bloquear',
  alias: ['desbloquear'],
  async execute(sock, m, { texto }) {
    if (!esDueno(m)) return
    const jid = m.key.remoteJid
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: m })
    const desbloquear = /^#\s*desbloquear/i.test(texto)

    const ctx = m.message?.extendedTextMessage?.contextInfo
    const sha = ctx?.quotedMessage?.stickerMessage?.fileSha256
    if (!sha) {
      return responder(
        `Reenvía aquí el sticker del canal y *respóndelo* con #${desbloquear ? 'desbloquear' : 'bloquear'}.`
      )
    }
    const huella = Buffer.from(sha).toString('base64')
    const cliente = bloquear(huella, !desbloquear)
    if (!cliente) return responder('No sé quién hizo ese sticker (puede ser muy viejo o no salió de la página).')
    console.log(`[moderación] ${desbloquear ? 'desbloqueado' : 'bloqueado'}: ${cliente.slice(0, 8)}…`)
    return responder(
      desbloquear
        ? '✅ Listo, esa persona ya puede volver a mandar stickers.'
        : '🚫 Bloqueado: esa persona ya no puede mandar stickers desde la página.\nBorra el sticker del canal (déjalo presionado → Eliminar).'
    )
  }
}
