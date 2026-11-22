import { enviar, caja, numero, objetivos, uso } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'kick',
  alias: ['sacar'],
  categoria: 'grupos',
  desc: 'Expulsa a un miembro (menciona o responde)',
  async execute(sock, m) {
    const datos = await validar(sock, m, { admin: true, bot: true })
    if (!datos) return
    const lista = objetivos(m).filter((j) => numero(j) !== numero(sock.user.id))
    if (!lista.length) return uso(sock, m, '#kick @usuario')
    await sock.groupParticipantsUpdate(m.key.remoteJid, lista, 'remove')
    await enviar(sock, m, caja('KICK', [['EXPULSADOS', lista.map((j) => `@${numero(j)}`).join(' ')]]), { mentions: lista })
  }
}
