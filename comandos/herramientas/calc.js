import { enviar, caja, uso } from '../../lib/util.js'

export default {
  name: 'calc',
  alias: ['calcular'],
  categoria: 'herramientas',
  desc: 'Calculadora (+ - * / ^ % y paréntesis)',
  async execute(sock, m, { args }) {
    const expr = args.join(' ').replace(/x/gi, '*').replace(/÷/g, '/').replace(/,/g, '.')
    if (!expr || !/^[\d+\-*/().%^\s]+$/.test(expr)) return uso(sock, m, '#calc (5+3)*2^2')
    let resultado
    try {
      resultado = Function(`"use strict"; return (${expr.replace(/\^/g, '**')})`)()
    } catch (e) {
      return uso(sock, m, '#calc (5+3)*2^2', 'Operación no válida')
    }
    if (typeof resultado !== 'number' || !Number.isFinite(resultado)) {
      return uso(sock, m, '#calc 10/2', 'El resultado no es un número válido')
    }
    const limpio = Number.isInteger(resultado) ? resultado : Number(resultado.toFixed(8))
    await enviar(sock, m, caja('CALC', [['OPERACIÓN', expr], ['RESULTADO', limpio]]), {
      botones: [{ text: '📋 COPIAR', copy: String(limpio) }],
      canal: false
    })
  }
}
