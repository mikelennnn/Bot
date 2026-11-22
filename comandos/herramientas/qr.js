import { enviar, caja, descargar, textoCitado, uso, error } from '../../lib/util.js'

export default {
  name: 'qr',
  alias: ['codigoqr'],
  categoria: 'herramientas',
  desc: 'Crea un código QR de un texto o enlace',
  async execute(sock, m, { args }) {
    const texto = args.join(' ') || textoCitado(m)
    if (!texto) return uso(sock, m, '#qr https://google.com')
    let imagen
    try {
      imagen = await descargar(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&data=${encodeURIComponent(texto)}`)
    } catch (e) {
      return error(sock, m, [['MOTIVO', 'No se pudo crear el QR, intenta más tarde']])
    }
    await enviar(sock, m, caja('QR', [['CONTENIDO', texto.slice(0, 100)]]), { imagen, canal: false })
  }
}
