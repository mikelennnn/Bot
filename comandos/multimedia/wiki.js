import { enviar, caja, obtenerJSON, uso, error } from '../../lib/util.js'

export default {
  name: 'wiki',
  alias: ['wikipedia'],
  categoria: 'multimedia',
  desc: 'Busca un tema en Wikipedia',
  async execute(sock, m, { args }) {
    const tema = args.join(' ')
    if (!tema) return uso(sock, m, '#wiki Fairy Tail')
    let d
    try {
      // Busca primero el título exacto del artículo
      const busqueda = await obtenerJSON(
        `https://es.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&format=json&search=${encodeURIComponent(tema)}`
      )
      const titulo = busqueda?.[1]?.[0]
      if (!titulo) throw new Error('sin resultados')
      d = await obtenerJSON(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`)
    } catch (e) {
      return error(sock, m, [['MOTIVO', 'No encontré ese tema en Wikipedia']])
    }
    const resumen = (d.extract || 'Sin resumen').slice(0, 700)
    const enlace = d.content_urls?.desktop?.page || `https://es.wikipedia.org/wiki/${encodeURIComponent(d.title)}`
    await enviar(sock, m, caja('WIKI', [['TEMA', d.title], `❯ ${resumen}`]), {
      imagen: d.thumbnail?.source || null,
      botones: [{ text: '📖 LEER MÁS', url: enlace }],
      canal: false
    })
  }
}
