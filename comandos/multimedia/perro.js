import { obtenerJSON } from '../../lib/util.js'
import { comandoImagen } from './_imagen.js'

export default comandoImagen({
  name: 'perro',
  alias: ['dog'],
  desc: 'Foto de un perro al azar',
  titulo: 'PERRO',
  boton: '🐶 OTRO PERRO',
  obtenerUrl: async () => {
    const { message } = await obtenerJSON('https://dog.ceo/api/breeds/image/random')
    const raza = message.split('/breeds/')[1]?.split('/')[0]?.replace('-', ' ') || 'desconocida'
    return { url: message, raza }
  },
  filas: (d) => [['RAZA', d.raza.toUpperCase()]]
})
