import { enviar, caja } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'cerrar',
  alias: ['close'],
  categoria: 'grupos',
  desc: 'Solo los admins pueden escribir',
  async execute(sock, m) {
    const datos = await validar(sock, m, { admin: true, bot: true })
    if (!datos) return
    await sock.groupSettingUpdate(m.key.remoteJid, 'announcement')
    await enviar(sock, m, caja('GRUPO', [['ESTADO', '🔒 CERRADO']]), {
      botones: [{ text: '🔓 ABRIR', id: '#abrir' }]
    })
  }
}
