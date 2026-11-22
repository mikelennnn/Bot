import { enviar, caja, numero, aleatorio, esGrupo, error } from '../../lib/util.js'

export default {
  name: 'sorteo',
  alias: ['random'],
  categoria: 'juegos',
  desc: 'Elige un ganador al azar del grupo',
  async execute(sock, m, { args }) {
    if (!esGrupo(m.key.remoteJid)) return error(sock, m, [['MOTIVO', 'Solo funciona en grupos']])
    const meta = await sock.groupMetadata(m.key.remoteJid)
    const ganador = aleatorio(meta.participants).id
    const premio = args.join(' ') || 'Nada, pero ganó'
    const texto = caja('SORTEO', [['PREMIO', premio], ['GANADOR', `@${numero(ganador)}`], '🎉 ¡Felicidades!'])
    await enviar(sock, m, texto, { mentions: [ganador], botones: [{ text: '🎁 OTRO SORTEO', id: '#sorteo' }], canal: false })
  }
}
