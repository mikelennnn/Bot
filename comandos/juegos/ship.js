import { enviar, caja, numero, objetivos, remitente, uso } from '../../lib/util.js'

function porcentaje(a, b) {
  // Siempre da el mismo resultado para la misma pareja
  const clave = [numero(a), numero(b)].sort().join('')
  let h = 0
  for (const c of clave) h = (h * 31 + c.charCodeAt(0)) % 1000003
  return h % 101
}

export default {
  name: 'ship',
  alias: ['amor'],
  categoria: 'juegos',
  desc: 'Compatibilidad de amor entre dos personas',
  async execute(sock, m) {
    const lista = objetivos(m)
    if (!lista.length) return uso(sock, m, '#ship @persona1 @persona2')
    const [a, b] = lista.length >= 2 ? lista : [remitente(sock, m), lista[0]]
    const p = porcentaje(a, b)
    const barra = '❤️'.repeat(Math.round(p / 20)) + '🤍'.repeat(5 - Math.round(p / 20))
    const veredicto = p >= 80 ? '💍 ALMAS GEMELAS' : p >= 50 ? '💕 HAY QUÍMICA' : p >= 25 ? '🤝 SOLO AMIGOS' : '💔 NI LO INTENTEN'
    const texto = caja('SHIP', [
      ['PAREJA', `@${numero(a)} ❤️ @${numero(b)}`],
      ['AMOR', `${p}%`],
      barra,
      ['VEREDICTO', veredicto]
    ])
    await enviar(sock, m, texto, { mentions: [a, b], canal: false })
  }
}
