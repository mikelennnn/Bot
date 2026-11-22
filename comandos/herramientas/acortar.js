import { enviar, caja, obtenerTexto, uso, error } from '../../lib/util.js'

export default {
  name: 'acortar',
  alias: ['short'],
  categoria: 'herramientas',
  desc: 'Acorta un enlace',
  async execute(sock, m, { args }) {
    const url = args[0]
    if (!url || !/^https?:\/\//i.test(url)) return uso(sock, m, '#acortar https://www.google.com')
    let corto
    try {
      corto = (await obtenerTexto(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`)).trim()
      if (!corto.startsWith('http')) throw new Error(corto)
    } catch (e) {
      return error(sock, m, [['MOTIVO', 'No se pudo acortar el enlace']])
    }
    await enviar(sock, m, caja('ACORTAR', [['ORIGINAL', url.slice(0, 80)], ['CORTO', corto]]), {
      botones: [{ text: '📋 COPIAR', copy: corto }, { text: '🔗 ABRIR', url: corto }],
      canal: false
    })
  }
}
