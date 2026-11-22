import { enviar, caja, textoCitado, uso } from '../../lib/util.js'

export default {
  name: 'reverso',
  alias: ['reverse'],
  categoria: 'herramientas',
  desc: 'Escribe un texto al revés',
  async execute(sock, m, { args }) {
    const texto = args.join(' ') || textoCitado(m)
    if (!texto) return uso(sock, m, '#reverso hola mundo')
    const alReves = [...texto].reverse().join('')
    await enviar(sock, m, caja('REVERSO', [['ORIGINAL', texto], ['AL REVÉS', alReves]]), {
      botones: [{ text: '📋 COPIAR', copy: alReves }],
      canal: false
    })
  }
}
