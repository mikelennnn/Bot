import { enviar, caja, formatearTiempo } from '../../lib/util.js'

export default {
  name: 'runtime',
  alias: ['uptime'],
  categoria: 'main',
  desc: 'Tiempo que lleva encendido el bot',
  async execute(sock, m) {
    const segundos = process.uptime()
    const inicio = new Date(Date.now() - segundos * 1000)
    const texto = caja('RUNTIME', [
      ['ACTIVO', formatearTiempo(segundos)],
      ['DESDE', inicio.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })]
    ])
    await enviar(sock, m, texto, { botones: [{ text: '🏓 PING', id: '#ping' }] })
  }
}
