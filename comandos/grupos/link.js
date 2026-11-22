import { enviar, caja } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'link',
  alias: ['enlace'],
  categoria: 'grupos',
  desc: 'Enlace de invitación del grupo',
  async execute(sock, m) {
    const datos = await validar(sock, m, { bot: true })
    if (!datos) return
    const codigo = await sock.groupInviteCode(m.key.remoteJid)
    const url = `https://chat.whatsapp.com/${codigo}`
    await enviar(sock, m, caja('LINK', [['GRUPO', datos.meta.subject], url]), {
      botones: [{ text: '📋 COPIAR ENLACE', copy: url }]
    })
  }
}
