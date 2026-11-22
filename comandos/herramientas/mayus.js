import { enviar, caja, textoCitado, uso } from '../../lib/util.js'

export default {
  name: 'mayus',
  alias: ['upper'],
  categoria: 'herramientas',
  desc: 'Convierte un texto a MAYÚSCULAS',
  async execute(sock, m, { args }) {
    const texto = args.join(' ') || textoCitado(m)
    if (!texto) return uso(sock, m, '#mayus hola mundo')
    const resultado = texto.toUpperCase()
    await enviar(sock, m, caja('MAYÚSCULAS', [['RESULTADO', resultado]]), {
      botones: [{ text: '📋 COPIAR', copy: resultado }],
      canal: false
    })
  }
}
