import { obtenerJSON } from '../../lib/util.js'
import { comandoImagen } from './_imagen.js'

export default comandoImagen({
  name: 'gato',
  alias: ['cat'],
  desc: 'Foto de un gato al azar',
  titulo: 'GATO',
  boton: '🐱 OTRO GATO',
  obtenerUrl: async () => ({ url: (await obtenerJSON('https://api.thecatapi.com/v1/images/search'))[0].url }),
  filas: () => [['ANIMAL', '🐱 MIAU']]
})
