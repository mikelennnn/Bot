import { enviar, caja, entero } from '../../lib/util.js'

const ADIVINANZAS = [
  ['Blanco por dentro, verde por fuera. Si quieres que te lo diga, espera.', 'La pera'],
  ['Tiene dientes y no come, tiene cabeza y no es hombre.', 'El ajo'],
  ['Cuanto más lo quitas, más grande es.', 'Un hoyo'],
  ['Vuela sin alas, silba sin boca, pega sin manos y no lo ves.', 'El viento'],
  ['Tengo agujas y no sé coser, tengo números y no sé leer.', 'El reloj'],
  ['Oro parece, plata no es. El que no lo adivine bien tonto es.', 'El plátano'],
  ['Me rompo si me nombras.', 'El silencio'],
  ['Tiene ojos y no ve, tiene agua y no la bebe.', 'El coco'],
  ['Mientras más seca, más moja.', 'La toalla'],
  ['Todos pasan por mí y yo no paso por nadie.', 'La puerta'],
  ['Una vieja con un diente que llama a toda la gente.', 'La campana'],
  ['Si me tienes, quieres compartirme; si me compartes, ya no me tienes.', 'Un secreto']
]

export default {
  name: 'adivinanza',
  alias: ['acertijo'],
  categoria: 'juegos',
  desc: 'Adivinanza con botón para ver la respuesta',
  async execute(sock, m, { args }) {
    const i = Number(args[0])
    if (Number.isInteger(i) && ADIVINANZAS[i]) {
      const [pregunta, respuesta] = ADIVINANZAS[i]
      return enviar(sock, m, caja('RESPUESTA', [['ADIVINANZA', pregunta], ['RESPUESTA', respuesta]]), {
        botones: [{ text: '🧩 OTRA', id: '#adivinanza' }],
        canal: false
      })
    }
    const n = entero(0, ADIVINANZAS.length - 1)
    await enviar(sock, m, caja('ADIVINANZA', [`🧩 ${ADIVINANZAS[n][0]}`]), {
      botones: [{ text: '👀 VER RESPUESTA', id: `#adivinanza ${n}` }, { text: '🧩 OTRA', id: '#adivinanza' }],
      canal: false
    })
  }
}
