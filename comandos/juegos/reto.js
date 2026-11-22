import { enviar, caja, aleatorio } from '../../lib/util.js'

const RETOS = [
  'Manda un audio cantando tu canción favorita', 'Cambia tu foto de perfil por una de un animal durante 1 hora',
  'Escribe un poema de 4 líneas para el grupo', 'Manda el último sticker que guardaste',
  'Escribe con los ojos cerrados: "Soy el mejor del grupo"', 'Cuenta un chiste malo', 'Imita a alguien del grupo en un audio',
  'Pon de estado "Amo a Erza-Bot" por 30 minutos', 'Manda una foto de lo que tienes enfrente',
  'Escribe tu nombre con emojis', 'Di 3 cosas buenas de la persona de arriba', 'Habla como robot en los próximos 3 mensajes',
  'Manda un audio diciendo un trabalenguas', 'Comparte tu canción más escuchada', 'Escribe una frase motivadora para el grupo'
]

export default {
  name: 'reto',
  alias: ['dare'],
  categoria: 'juegos',
  desc: 'Reto al azar',
  async execute(sock, m) {
    await enviar(sock, m, caja('RETO', [['RETO', aleatorio(RETOS)]]), {
      botones: [{ text: '🔄 OTRO RETO', id: '#reto' }, { text: '🤔 VERDAD', id: '#verdad' }],
      canal: false
    })
  }
}
