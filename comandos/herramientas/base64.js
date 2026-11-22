import { enviar, caja, uso } from '../../lib/util.js'

export default {
  name: 'base64',
  alias: ['b64'],
  categoria: 'herramientas',
  desc: 'Codifica o decodifica Base64 (cod / dec)',
  async execute(sock, m, { args }) {
    const modo = (args[0] || '').toLowerCase()
    const texto = args.slice(1).join(' ')
    if (!['cod', 'dec'].includes(modo) || !texto) return uso(sock, m, '#base64 cod hola  |  #base64 dec aG9sYQ==')
    const resultado =
      modo === 'cod' ? Buffer.from(texto, 'utf8').toString('base64') : Buffer.from(texto, 'base64').toString('utf8')
    await enviar(sock, m, caja('BASE64', [['MODO', modo === 'cod' ? 'CODIFICAR' : 'DECODIFICAR'], ['RESULTADO', resultado]]), {
      botones: [{ text: '📋 COPIAR', copy: resultado }],
      canal: false
    })
  }
}
