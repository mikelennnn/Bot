import { enviar, caja, obtenerJSON, uso, error, entero } from '../../lib/util.js'

const TIPOS = {
  normal: 'Normal', fire: '🔥 Fuego', water: '💧 Agua', grass: '🌿 Planta', electric: '⚡ Eléctrico', ice: '❄️ Hielo',
  fighting: '🥊 Lucha', poison: '☠️ Veneno', ground: '🌍 Tierra', flying: '🕊️ Volador', psychic: '🔮 Psíquico',
  bug: '🐛 Bicho', rock: '🪨 Roca', ghost: '👻 Fantasma', dragon: '🐉 Dragón', dark: '🌑 Siniestro', steel: '⚙️ Acero', fairy: '🧚 Hada'
}

export default {
  name: 'pokemon',
  alias: ['poke'],
  categoria: 'multimedia',
  desc: 'Datos de un Pokémon (nombre o número)',
  async execute(sock, m, { args }) {
    const busqueda = (args[0] || String(entero(1, 1025))).toLowerCase()
    let p
    try {
      p = await obtenerJSON(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(busqueda)}`)
    } catch (e) {
      return uso(sock, m, '#pokemon pikachu', 'No encontré ese Pokémon')
    }
    const stat = (n) => p.stats.find((s) => s.stat.name === n)?.base_stat ?? '?'
    const texto = caja('POKÉMON', [
      ['NOMBRE', p.name.toUpperCase()],
      ['NÚMERO', `#${p.id}`],
      ['TIPO', p.types.map((t) => TIPOS[t.type.name] || t.type.name).join(' / ')],
      ['ALTURA', `${p.height / 10} m`],
      ['PESO', `${p.weight / 10} kg`],
      ['PS', stat('hp')],
      ['ATAQUE', stat('attack')],
      ['DEFENSA', stat('defense')],
      ['VELOCIDAD', stat('speed')]
    ])
    const imagen = p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || null
    if (!imagen) return error(sock, m, [['MOTIVO', 'Ese Pokémon no tiene imagen']])
    await enviar(sock, m, texto, { imagen, botones: [{ text: '🎲 POKÉMON AL AZAR', id: '#pokemon' }], canal: false })
  }
}
