import { obtenerJSON } from '../../lib/util.js'
import { comandoImagen } from './_imagen.js'

export default comandoImagen({
  name: 'anime',
  alias: ['waifu'],
  desc: 'Imagen de anime al azar',
  titulo: 'ANIME',
  boton: '🌸 OTRA',
  obtenerUrl: async () => ({ url: (await obtenerJSON('https://api.waifu.pics/sfw/waifu')).url }),
  filas: () => [['TIPO', '🌸 WAIFU']]
})
