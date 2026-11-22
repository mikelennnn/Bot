import { obtenerJSON } from '../../lib/util.js'
import { comandoImagen } from './_imagen.js'

const SUBREDDITS = ['MemesESP', 'memexico', 'yo_elvr']

export default comandoImagen({
  name: 'meme',
  alias: ['memes'],
  desc: 'Meme al azar',
  titulo: 'MEME',
  boton: '😂 OTRO MEME',
  obtenerUrl: async () => {
    // Pide varios y se queda con uno apto y que sea imagen
    const sub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)]
    const { memes } = await obtenerJSON(`https://meme-api.com/gimme/${sub}/10`)
    const validos = (memes || []).filter((x) => !x.nsfw && !x.spoiler && /\.(jpe?g|png)$/i.test(x.url))
    if (!validos.length) throw new Error('sin memes')
    const meme = validos[Math.floor(Math.random() * validos.length)]
    return { url: meme.url, titulo: meme.title }
  },
  filas: (d) => [`😂 ${d.titulo.slice(0, 120)}`]
})
