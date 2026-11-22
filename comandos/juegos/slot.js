import { enviar, caja, aleatorio } from '../../lib/util.js'

const SIMBOLOS = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎', '7️⃣']

export default {
  name: 'slot',
  alias: ['tragamonedas'],
  categoria: 'juegos',
  desc: 'Máquina tragamonedas',
  async execute(sock, m) {
    const giro = [aleatorio(SIMBOLOS), aleatorio(SIMBOLOS), aleatorio(SIMBOLOS)]
    const unicos = new Set(giro).size
    const resultado = unicos === 1 ? '🟩 ¡JACKPOT!' : unicos === 2 ? '🟨 CASI, DOS IGUALES' : '🟥 PERDISTE'
    const texto = caja('SLOT', [`  ┆ ${giro.join(' ┆ ')} ┆`, ['RESULTADO', resultado]])
    await enviar(sock, m, texto, { botones: [{ text: '🎰 GIRAR', id: '#slot' }], canal: false })
  }
}
