import { enviar, caja, aleatorio } from '../../lib/util.js'

const OPCIONES = { piedra: '🪨', papel: '📄', tijera: '✂️' }
const GANA_A = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' }
const BOTONES = [
  { text: '🪨 PIEDRA', id: '#ppt piedra' },
  { text: '📄 PAPEL', id: '#ppt papel' },
  { text: '✂️ TIJERA', id: '#ppt tijera' }
]

export default {
  name: 'ppt',
  alias: ['piedrapapeltijera'],
  categoria: 'juegos',
  desc: 'Piedra, papel o tijera contra el bot',
  async execute(sock, m, { args }) {
    let tu = (args[0] || '').toLowerCase().replace('tijeras', 'tijera')
    if (!OPCIONES[tu]) {
      return enviar(sock, m, caja('PPT', [['JUEGO', 'PIEDRA, PAPEL O TIJERA'], 'Elige una opción con los botones']), {
        botones: BOTONES,
        canal: false
      })
    }
    const bot = aleatorio(Object.keys(OPCIONES))
    const resultado = tu === bot ? '🟨 EMPATE' : GANA_A[tu] === bot ? '🟩 GANASTE' : '🟥 PERDISTE'
    const texto = caja('PPT', [
      ['TÚ', `${OPCIONES[tu]} ${tu.toUpperCase()}`],
      ['BOT', `${OPCIONES[bot]} ${bot.toUpperCase()}`],
      ['RESULTADO', resultado]
    ])
    await enviar(sock, m, texto, { botones: BOTONES, canal: false })
  }
}
