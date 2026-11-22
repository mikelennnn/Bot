import { enviar, caja, formatearTiempo } from '../../lib/util.js'

const TITULOS = {
  main: '♦️ MAIN',
  grupos: '👥 GRUPOS',
  juegos: '🎮 JUEGOS',
  herramientas: '🛠️ HERRAMIENTAS',
  multimedia: '🎬 MULTIMEDIA'
}

export default {
  name: 'infobot',
  alias: ['bot'],
  categoria: 'main',
  desc: 'Información del bot',
  async execute(sock, m, { comandos }) {
    const unicos = [...new Set(comandos.values())]
    const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(1)

    const texto = caja('INFO BOT', [
      ['NOMBRE', 'ERZA-BOT'],
      ['CREADOR', 'ANÓNIMO'],
      ['COMANDOS', unicos.length],
      ['PREFIJO', '#'],
      ['ACTIVO', formatearTiempo(process.uptime())],
      ['RAM', `${ram} MB`],
      ['NODE', process.version],
      ['LIBRERÍA', '@itsliaaa/baileys']
    ])

    // Lista desplegable con los comandos de cada categoría (máximo 10 por sección)
    const sections = Object.entries(TITULOS)
      .map(([clave, titulo]) => ({
        title: titulo,
        rows: unicos
          .filter((c) => (c.categoria || 'main') === clave)
          .slice(0, 10)
          .map((c) => ({ header: '', title: `#${c.name}`, description: c.desc || '', id: `#${c.name}` }))
      }))
      .filter((s) => s.rows.length)

    await enviar(sock, m, texto, {
      botones: [
        { text: '📂 COMANDOS', sections },
        { text: '🏓 PING', id: '#ping' }
      ]
    })
  }
}
