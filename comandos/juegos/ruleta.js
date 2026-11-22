import { enviar, caja, numero, remitente, entero } from '../../lib/util.js'

export default {
  name: 'ruleta',
  alias: ['ruletarusa'],
  categoria: 'juegos',
  desc: 'Ruleta rusa: 1 de 6 pierde',
  async execute(sock, m) {
    const jugador = remitente(sock, m)
    const bala = entero(1, 6) === 1
    const texto = caja('RULETA', [
      ['JUGADOR', `@${numero(jugador)}`],
      ['RESULTADO', bala ? '💥 BANG, PERDISTE' : '😮‍💨 CLICK, SOBREVIVISTE']
    ])
    await enviar(sock, m, texto, {
      mentions: [jugador],
      botones: [{ text: '🔫 JUGAR OTRA', id: '#ruleta' }],
      canal: false
    })
  }
}
