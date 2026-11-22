import { enviar, caja, aleatorio, uso } from '../../lib/util.js'

export default {
  name: 'elegir',
  alias: ['choose'],
  categoria: 'juegos',
  desc: 'Elige entre varias opciones separadas por |',
  async execute(sock, m, { args }) {
    const opciones = args.join(' ').split('|').map((x) => x.trim()).filter(Boolean)
    if (opciones.length < 2) return uso(sock, m, '#elegir pizza | tacos | sushi')
    await enviar(sock, m, caja('ELEGIR', [['OPCIONES', opciones.length], ['ELIJO', aleatorio(opciones)]]), { canal: false })
  }
}
