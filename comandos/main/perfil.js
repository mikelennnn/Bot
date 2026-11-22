import { enviar, caja, error, numero, objetivos, remitente } from '../../lib/util.js'

export default {
  name: 'perfil',
  alias: ['pp'],
  categoria: 'main',
  desc: 'Foto de perfil tuya o de quien menciones',
  async execute(sock, m) {
    const objetivo = objetivos(m)[0] || remitente(sock, m)

    let url = null
    try {
      url = await sock.profilePictureUrl(objetivo, 'image')
    } catch (e) {}

    if (!url) {
      return error(sock, m, [['MOTIVO', 'Sin foto de perfil o es privada']])
    }

    const texto = caja('PERFIL', [['USUARIO', `@${numero(objetivo)}`]])
    await enviar(sock, m, texto, { imagen: url, mentions: [objetivo] })
  }
}
