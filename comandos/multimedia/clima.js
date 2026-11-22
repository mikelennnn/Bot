import { enviar, caja, obtenerJSON, uso, error } from '../../lib/util.js'

export default {
  name: 'clima',
  alias: ['tiempo'],
  categoria: 'multimedia',
  desc: 'Clima actual de una ciudad',
  async execute(sock, m, { args }) {
    const ciudad = args.join(' ')
    if (!ciudad) return uso(sock, m, '#clima Ciudad de México')
    let d
    try {
      d = await obtenerJSON(`https://wttr.in/${encodeURIComponent(ciudad)}?format=j1&lang=es`)
    } catch (e) {
      return error(sock, m, [['MOTIVO', 'No encontré esa ciudad o el servicio no responde']])
    }
    const actual = d.current_condition?.[0]
    const zona = d.nearest_area?.[0]
    if (!actual) return error(sock, m, [['MOTIVO', 'No encontré esa ciudad']])
    const lugar = [zona?.areaName?.[0]?.value, zona?.country?.[0]?.value].filter(Boolean).join(', ') || ciudad
    const estado = actual.lang_es?.[0]?.value || actual.weatherDesc?.[0]?.value || '?'
    const hoy = d.weather?.[0]
    await enviar(
      sock,
      m,
      caja('CLIMA', [
        ['LUGAR', lugar],
        ['ESTADO', estado],
        ['TEMPERATURA', `${actual.temp_C}°C`],
        ['SENSACIÓN', `${actual.FeelsLikeC}°C`],
        ['MÍN / MÁX', hoy ? `${hoy.mintempC}°C / ${hoy.maxtempC}°C` : '?'],
        ['HUMEDAD', `${actual.humidity}%`],
        ['VIENTO', `${actual.windspeedKmph} km/h`]
      ]),
      { botones: [{ text: '🔄 ACTUALIZAR', id: `#clima ${ciudad}` }], canal: false }
    )
  }
}
