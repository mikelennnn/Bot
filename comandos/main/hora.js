import { enviar, caja } from '../../lib/util.js'

const ZONAS = [
  ['MÉXICO', 'America/Mexico_City'],
  ['COLOMBIA', 'America/Bogota'],
  ['ARGENTINA', 'America/Argentina/Buenos_Aires'],
  ['ESPAÑA', 'Europe/Madrid'],
  ['NUEVA YORK', 'America/New_York']
]

export default {
  name: 'hora',
  alias: ['fecha'],
  categoria: 'main',
  desc: 'Fecha y hora en varios países',
  async execute(sock, m) {
    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const filas = [['FECHA', fecha.toUpperCase()]]
    for (const [pais, zona] of ZONAS) {
      filas.push([pais, ahora.toLocaleTimeString('es-MX', { timeZone: zona, hour: '2-digit', minute: '2-digit' })])
    }
    await enviar(sock, m, caja('HORA', filas))
  }
}
