import { textoCitado, uso } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'hidetag',
  alias: ['tag'],
  categoria: 'grupos',
  desc: 'Mensaje que notifica a todos sin mostrar menciones',
  async execute(sock, m, { args }) {
    const datos = await validar(sock, m, { admin: true })
    if (!datos) return
    const texto = args.join(' ') || textoCitado(m)
    if (!texto) return uso(sock, m, '#hidetag Hola a todos')
    const ids = datos.meta.participants.map((p) => p.id)
    await sock.sendMessage(m.key.remoteJid, { text: texto, mentions: ids })
  }
}
