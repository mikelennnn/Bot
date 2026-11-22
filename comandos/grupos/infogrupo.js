import { enviar, caja, numero } from '../../lib/util.js'
import { validar } from './_comun.js'

export default {
  name: 'infogrupo',
  alias: ['gp'],
  categoria: 'grupos',
  desc: 'Información del grupo',
  async execute(sock, m) {
    const datos = await validar(sock, m)
    if (!datos) return
    const { meta, admins } = datos
    const creado = meta.creation
      ? new Date(meta.creation * 1000).toLocaleDateString('es-MX')
      : 'Desconocido'
    const desc = (meta.desc || 'Sin descripción').toString().slice(0, 200)
    const creador = meta.owner ? `@${numero(meta.owner)}` : 'Desconocido'

    const texto = caja('INFO GRUPO', [
      ['NOMBRE', meta.subject],
      ['MIEMBROS', meta.participants.length],
      ['ADMINS', admins.length],
      ['CREADO', creado],
      ['CREADOR', creador],
      ['SOLO ADMINS', meta.announce ? 'SÍ' : 'NO'],
      `❯ ${desc}`
    ])

    let foto = null
    try {
      foto = await sock.profilePictureUrl(m.key.remoteJid, 'image')
    } catch (e) {}

    await enviar(sock, m, texto, {
      imagen: foto,
      mentions: meta.owner ? [meta.owner] : [],
      botones: [{ text: '👥 ADMINS', id: '#admins' }]
    })
  }
}
