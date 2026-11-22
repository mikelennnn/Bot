import { enviar, caja, URL_CANAL } from '../../lib/util.js'

export default {
  name: 'canal',
  alias: ['channel'],
  categoria: 'main',
  desc: 'Canal oficial del bot',
  async execute(sock, m) {
    const texto = caja('CANAL', [
      ['NOMBRE', 'ERZA-BOT'],
      ['ESTADO', '🟩 ACTIVO'],
      'Síguelo para enterarte de las novedades'
    ])
    await enviar(sock, m, texto, { botones: [{ text: '📋 COPIAR ENLACE', copy: URL_CANAL }] })
  }
}
