// Comprobaciones compartidas de los comandos de grupo (no es un comando)
import { esGrupo, error, datosGrupo } from '../../lib/util.js'

export async function validar(sock, m, { admin = false, bot = false } = {}) {
  if (!esGrupo(m.key.remoteJid)) {
    await error(sock, m, [['MOTIVO', 'Solo funciona en grupos']])
    return null
  }
  const datos = await datosGrupo(sock, m)
  if (admin && !datos.esAdmin) {
    await error(sock, m, [['MOTIVO', 'Solo para administradores']])
    return null
  }
  if (bot && !datos.botAdmin) {
    await error(sock, m, [['MOTIVO', 'El bot necesita ser administrador']])
    return null
  }
  return datos
}
