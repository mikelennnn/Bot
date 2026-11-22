import { enviar, caja } from '../../lib/util.js'

export default {
  name: 'creador',
  alias: ['owner'],
  categoria: 'main',
  desc: 'Información del creador',
  async execute(sock, m) {
    const texto = caja('CREADOR', [
      ['NOMBRE', 'ANÓNIMO'],
      ['BOT', 'ERZA-BOT'],
      ['CONTACTO', 'Por el canal']
    ])
    await enviar(sock, m, texto)
  }
}
