import { enviar, caja, textoCitado, uso } from '../../lib/util.js'

// Estilos de letra: [nombre, mayúscula A, minúscula a, dígito 0 o null]
const ESTILOS = [
  ['NEGRITA', 0x1d400, 0x1d41a, 0x1d7ce],
  ['CURSIVA', 0x1d434, 0x1d44e, null],
  ['GÓTICA', 0x1d56c, 0x1d586, null],
  ['DOBLE', 0x1d538, 0x1d552, 0x1d7d8],
  ['MONO', 0x1d670, 0x1d68a, 0x1d7f6],
  ['SANS', 0x1d5d4, 0x1d5ee, 0x1d7ec]
]

// Letras que Unicode guarda en otro lugar (huecos de los bloques matemáticos)
const EXCEPCIONES = { 0x1d455: 0x210e, 0x1d53a: 0x2102, 0x1d53f: 0x210d, 0x1d545: 0x2115, 0x1d547: 0x2119, 0x1d548: 0x211a, 0x1d549: 0x211d, 0x1d551: 0x2124 }

function convertir(texto, [, may, min, dig]) {
  return [...texto]
    .map((c) => {
      const code = c.charCodeAt(0)
      let nuevo = null
      if (code >= 65 && code <= 90) nuevo = may + code - 65
      else if (code >= 97 && code <= 122) nuevo = min + code - 97
      else if (dig && code >= 48 && code <= 57) nuevo = dig + code - 48
      if (nuevo === null) return c
      return String.fromCodePoint(EXCEPCIONES[nuevo] || nuevo)
    })
    .join('')
}

function burbuja(texto) {
  return [...texto]
    .map((c) => {
      const code = c.charCodeAt(0)
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x24b6 + code - 65)
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x24d0 + code - 97)
      return c
    })
    .join('')
}

export default {
  name: 'fancy',
  alias: ['letras'],
  categoria: 'herramientas',
  desc: 'Convierte tu texto en letras bonitas',
  async execute(sock, m, { args }) {
    const texto = args.join(' ') || textoCitado(m)
    if (!texto) return uso(sock, m, '#fancy Erza Bot')
    const filas = ESTILOS.map((e) => [e[0], convertir(texto, e)])
    filas.push(['BURBUJA', burbuja(texto)])
    await enviar(sock, m, caja('FANCY', filas), { canal: false })
  }
}
