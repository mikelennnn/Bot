import { enviar, caja, obtenerJSON, uso, error } from '../../lib/util.js'

export default {
  name: 'divisa',
  alias: ['convertir'],
  categoria: 'multimedia',
  desc: 'Convierte monedas (#divisa 100 USD MXN)',
  async execute(sock, m, { args }) {
    const cantidad = parseFloat((args[0] || '').replace(',', '.'))
    const de = (args[1] || '').toUpperCase()
    const a = (args[2] || '').toUpperCase()
    if (!cantidad || !/^[A-Z]{3}$/.test(de) || !/^[A-Z]{3}$/.test(a)) return uso(sock, m, '#divisa 100 USD MXN')
    let d
    try {
      d = await obtenerJSON(`https://open.er-api.com/v6/latest/${de}`)
      if (d.result !== 'success') throw new Error('moneda')
    } catch (e) {
      return error(sock, m, [['MOTIVO', `No conozco la moneda ${de}`]])
    }
    const tasa = d.rates?.[a]
    if (!tasa) return error(sock, m, [['MOTIVO', `No conozco la moneda ${a}`]])
    const total = (cantidad * tasa).toLocaleString('es-MX', { maximumFractionDigits: 2 })
    await enviar(
      sock,
      m,
      caja('DIVISA', [['CANTIDAD', `${cantidad} ${de}`], ['EQUIVALE', `${total} ${a}`], ['TASA', `1 ${de} = ${tasa} ${a}`]]),
      { canal: false }
    )
  }
}
