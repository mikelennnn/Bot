import { enviar, caja, aleatorio, uso } from '../../lib/util.js'

const RESPUESTAS = [
  '🟩 Sí, definitivamente', '🟩 Sin duda', '🟩 Todo indica que sí', '🟩 Puedes contar con ello',
  '🟨 Pregunta más tarde', '🟨 No puedo predecirlo ahora', '🟨 Concéntrate y vuelve a preguntar',
  '🟥 No cuentes con ello', '🟥 Mi respuesta es no', '🟥 Muy dudoso', '🟥 Las fuentes dicen que no'
]

export default {
  name: '8ball',
  alias: ['bola8'],
  categoria: 'juegos',
  desc: 'La bola mágica responde tu pregunta',
  async execute(sock, m, { args }) {
    const pregunta = args.join(' ')
    if (!pregunta) return uso(sock, m, '#8ball ¿Voy a aprobar?')
    await enviar(sock, m, caja('BOLA 8', [['PREGUNTA', pregunta], ['RESPUESTA', aleatorio(RESPUESTAS)]]), { canal: false })
  }
}
