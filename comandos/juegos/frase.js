import { enviar, caja, aleatorio } from '../../lib/util.js'

const FRASES = [
  ['El único modo de hacer un gran trabajo es amar lo que haces.', 'Steve Jobs'],
  ['La vida es lo que pasa mientras estás ocupado haciendo otros planes.', 'John Lennon'],
  ['No cuentes los días, haz que los días cuenten.', 'Muhammad Ali'],
  ['El éxito es la suma de pequeños esfuerzos repetidos día tras día.', 'Robert Collier'],
  ['La imaginación es más importante que el conocimiento.', 'Albert Einstein'],
  ['Si puedes soñarlo, puedes hacerlo.', 'Walt Disney'],
  ['Caer está permitido, levantarse es obligatorio.', 'Proverbio ruso'],
  ['El que no arriesga no gana.', 'Refrán popular'],
  ['Sé el cambio que quieres ver en el mundo.', 'Mahatma Gandhi'],
  ['No sabía que era imposible y lo hice.', 'Jean Cocteau'],
  ['Hasta la persona más débil puede cambiar el rumbo del futuro.', 'Galadriel'],
  ['La fuerza no viene de la capacidad física, sino de una voluntad indomable.', 'Mahatma Gandhi']
]

export default {
  name: 'frase',
  alias: ['quote'],
  categoria: 'juegos',
  desc: 'Frase célebre al azar',
  async execute(sock, m) {
    const [frase, autor] = aleatorio(FRASES)
    await enviar(sock, m, caja('FRASE', [`❝ ${frase} ❞`, ['AUTOR', autor]]), {
      botones: [{ text: '✨ OTRA FRASE', id: '#frase' }],
      canal: false
    })
  }
}
