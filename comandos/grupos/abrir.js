import { enviar, caja } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'abrir',
  alias: ['open'],
  categoria: 'grupos',
  desc: 'Todos pueden escribir',
  async execute(sock, m) {
    const datos = await validar(sock, m, { admin: true, bot: true })
    if (!datos) return
    await sock.groupSettingUpdate(m.key.remoteJid, 'not_announcement')
    await enviar(sock, m, caja('GRUPO', [['ESTADO', '🔓 ABIERTO']]), {
      botones: [{ text: '🔒 CERRAR', id: '#cerrar' }]
    })
  }
}
