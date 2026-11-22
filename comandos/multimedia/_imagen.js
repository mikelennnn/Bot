// Fábrica para comandos que mandan una imagen al azar desde una API (no es un comando)
import { enviar, caja, error } from '../../lib/util.js'

export function comandoImagen({ name, alias, desc, titulo, boton, obtenerUrl, filas = () => [] }) {
  return {
    name,
    alias,
    categoria: 'multimedia',
    desc,
    async execute(sock, m) {
      let datos
      try {
        datos = await obtenerUrl()
      } catch (e) {
        return error(sock, m, [['MOTIVO', 'El servidor de imágenes no responde, intenta más tarde']])
      }
      await enviar(sock, m, caja(titulo, filas(datos)), {
        imagen: datos.url,
        botones: [{ text: boton, id: `#${name}` }],
        canal: false
      })
    }
  }
}
