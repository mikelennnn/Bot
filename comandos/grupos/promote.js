import { enviar, caja, numero, objetivos, uso } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'promote',
  alias: ['daradmin'],
  categoria: 'grupos',
  desc: 'Da administrador a un miembro',
  async execute(sock, m) {
    const datos = await validar(sock, m, { admin: true, bot: true })
    if (!datos) return
    const lista = objetivos(m)
    if (!lista.length) return uso(sock, m, '#promote @usuario')
    await sock.groupParticipantsUpdate(m.key.remoteJid, lista, 'promote')
    await enviar(sock, m, caja('PROMOTE', [['NUEVO ADMIN', lista.map((j) => `@${numero(j)}`).join(' ')]]), { mentions: lista })
  }
}
