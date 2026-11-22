import { enviar, numero, negrita } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'tagall',
  alias: ['todos'],
  categoria: 'grupos',
  desc: 'Menciona a todos los miembros',
  async execute(sock, m, { args }) {
    const datos = await validar(sock, m, { admin: true })
    if (!datos) return
    const ids = datos.meta.participants.map((p) => p.id)
    const mensaje = args.join(' ') || 'Atención a todos'
    const texto =
      `╭━━━〔♥️ ${negrita('TAGALL')} ♥️〕━━━╮\n` +
      `┃ ♡ ${negrita('MENSAJE')}: *${mensaje}*\n` +
      `┃ ♡ ${negrita('MIEMBROS')}: *${ids.length}*\n` +
      ids.map((id) => `┃ ❯ @${numero(id)}`).join('\n') +
      `\n╰━━━━━━━━━━━━━━━━━╯`
    await enviar(sock, m, texto, { mentions: ids })
  }
}
