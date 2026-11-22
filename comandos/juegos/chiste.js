import { enviar, caja, aleatorio } from '../../lib/util.js'

const CHISTES = [
  '¿Qué le dice un jaguar a otro? Jaguar you.',
  '¿Por qué el libro de matemáticas estaba triste? Porque tenía muchos problemas.',
  '¿Cómo se despiden los químicos? Ácido un placer.',
  '¿Qué hace una abeja en el gimnasio? ¡Zum-ba!',
  '¿Cuál es el café más peligroso del mundo? El ex-preso.',
  '¿Qué le dijo el 0 al 8? Bonito cinturón.',
  '¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter.',
  '¿Qué le dice una iguana a su hermana gemela? Iguanita.',
  '—Doctor, veo bolitas de colores. —¿Y ha visto un oculista? —No, solo bolitas de colores.',
  '¿Cómo se dice pañuelo en japonés? Saka-moko.',
  '¿Qué le dijo un pez a otro? Nada.',
  '¿Por qué el tomate no toma té? Porque es tomate.',
  '—Mamá, en la escuela me dicen distraído. —Niño, tú vives en la casa de enfrente.',
  '¿Cuál es el colmo de un electricista? Que su esposa se llame Luz y sus hijos le sigan la corriente.',
  '¿Qué le dice un techo a otro? Techo de menos.'
]

export default {
  name: 'chiste',
  alias: ['joke'],
  categoria: 'juegos',
  desc: 'Cuenta un chiste',
  async execute(sock, m) {
    await enviar(sock, m, caja('CHISTE', [`😂 ${aleatorio(CHISTES)}`]), {
      botones: [{ text: '😂 OTRO CHISTE', id: '#chiste' }],
      canal: false
    })
  }
}
