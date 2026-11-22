import { enviar, caja, numero, objetivos, uso } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'demote',
  alias: ['quitaradmin'],
  categoria: 'grupos',
  desc: 'Quita administrador a un miembro',
  async execute(sock, m) {
    const datos = await validar(sock, m, { admin: true, bot: true })
    if (!datos) return
    const lista = objetivos(m)
    if (!lista.length) return uso(sock, m, '#demote @usuario')
    await sock.groupParticipantsUpdate(m.key.remoteJid, lista, 'demote')
    await enviar(sock, m, caja('DEMOTE', [['YA NO ES ADMIN', lista.map((j) => `@${numero(j)}`).join(' ')]]), { mentions: lista })
  }
}
