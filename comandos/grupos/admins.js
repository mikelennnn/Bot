import { enviar, numero, negrita } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'admins',
  alias: ['staff'],
  categoria: 'grupos',
  desc: 'Lista de administradores',
  async execute(sock, m) {
    const datos = await validar(sock, m)
    if (!datos) return
    const ids = datos.admins.map((p) => p.id)
    const texto =
      `╭━━━〔♥️ ${negrita('ADMINS')} ♥️〕━━━╮\n` +
      `┃ ♡ ${negrita('TOTAL')}: *${ids.length}*\n` +
      ids.map((id) => `┃ ❯ @${numero(id)}`).join('\n') +
      `\n╰━━━━━━━━━━━━━━━━━╯`
    await enviar(sock, m, texto, { mentions: ids })
  }
}
