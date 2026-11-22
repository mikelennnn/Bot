import { enviar, caja, entero } from '../../lib/util.js'

const CARAS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export default {
  name: 'dado',
  alias: ['dice'],
  categoria: 'juegos',
  desc: 'Lanza un dado',
  async execute(sock, m) {
    const n = entero(1, 6)
    await enviar(sock, m, caja('DADO', [['RESULTADO', `${CARAS[n - 1]} ${n}`]]), {
      botones: [{ text: '🎲 OTRA VEZ', id: '#dado' }],
      canal: false
    })
  }
}
