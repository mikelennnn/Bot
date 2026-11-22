import { enviar, caja, aleatorio } from '../../lib/util.js'

export default {
  name: 'moneda',
  alias: ['coin'],
  categoria: 'juegos',
  desc: 'Lanza una moneda: cara o cruz',
  async execute(sock, m) {
    const sale = aleatorio(['🪙 CARA', '🪙 CRUZ'])
    await enviar(sock, m, caja('MONEDA', [['RESULTADO', sale]]), {
      botones: [{ text: '🪙 OTRA VEZ', id: '#moneda' }],
      canal: false
    })
  }
}
