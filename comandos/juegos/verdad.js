import { enviar, caja, aleatorio } from '../../lib/util.js'

export const VERDADES = [
  '¿Cuál es tu mayor miedo?', '¿Quién fue tu primer amor?', '¿Qué es lo más vergonzoso que has hecho?',
  '¿Alguna vez mentiste para salir de un problema?', '¿Cuál es tu peor hábito?', '¿A quién de este grupo le contarías un secreto?',
  '¿Qué es lo que más te arrepientes de haber dicho?', '¿Cuál ha sido tu peor cita?', '¿Qué app usas más en tu celular?',
  '¿Cuál es tu talento oculto?', '¿Has stalkeado a tu ex?', '¿Qué es lo más raro que has comido?',
  '¿Cuál es la canción que te da vergüenza que te guste?', '¿Alguna vez lloraste con una película? ¿Cuál?',
  '¿Qué harías si fueras invisible un día?'
]

export default {
  name: 'verdad',
  alias: ['truth'],
  categoria: 'juegos',
  desc: 'Pregunta de verdad al azar',
  async execute(sock, m) {
    await enviar(sock, m, caja('VERDAD', [['PREGUNTA', aleatorio(VERDADES)]]), {
      botones: [{ text: '🔄 OTRA VERDAD', id: '#verdad' }, { text: '🔥 RETO', id: '#reto' }],
      canal: false
    })
  }
}
