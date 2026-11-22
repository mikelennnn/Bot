import { enviar, caja, obtenerJSON, textoCitado, uso, error } from '../../lib/util.js'

export default {
  name: 'traducir',
  alias: ['tr'],
  categoria: 'herramientas',
  desc: 'Traduce un texto (#traducir en hola)',
  async execute(sock, m, { args }) {
    let idioma = 'es'
    let texto = args.join(' ')
    if (args[0] && /^[a-z]{2}(-[a-z]{2})?$/i.test(args[0]) && args.length > 1) {
      idioma = args[0].toLowerCase()
      texto = args.slice(1).join(' ')
    }
    if (args.length === 1 && /^[a-z]{2}$/i.test(args[0]) && textoCitado(m)) {
      idioma = args[0].toLowerCase()
      texto = textoCitado(m)
    }
    if (!texto) texto = textoCitado(m)
    if (!texto) return uso(sock, m, '#traducir en Hola, ¿cómo estás?')

    let traduccion, origen
    try {
      const datos = await obtenerJSON(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${idioma}&dt=t&q=${encodeURIComponent(texto)}`
      )
      traduccion = datos[0].map((x) => x[0]).join('')
      origen = datos[2] || '?'
    } catch (e) {
      return error(sock, m, [['MOTIVO', 'No se pudo traducir, revisa el idioma']])
    }
    await enviar(sock, m, caja('TRADUCIR', [['DE', origen.toUpperCase()], ['A', idioma.toUpperCase()], ['TEXTO', traduccion]]), {
      botones: [{ text: '📋 COPIAR', copy: traduccion }],
      canal: false
    })
  }
}
