import { enviar, caja, uso } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'setname',
  alias: ['nombre'],
  categoria: 'grupos',
  desc: 'Cambia el nombre del grupo',
  async execute(sock, m, { args }) {
    const datos = await validar(sock, m, { admin: true, bot: true })
    if (!datos) return
    const nuevo = args.join(' ').trim()
    if (!nuevo) return uso(sock, m, '#setname Nuevo nombre')
    if (nuevo.length > 100) return uso(sock, m, '#setname Nombre corto', 'Máximo 100 letras')
    await sock.groupUpdateSubject(m.key.remoteJid, nuevo)
    await enviar(sock, m, caja('SETNAME', [['ANTES', datos.meta.subject], ['AHORA', nuevo]]))
  }
}
