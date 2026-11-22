import { randomInt } from 'crypto'
import { enviar, caja } from '../../lib/util.js'

const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%&*?'

export default {
  name: 'clave',
  alias: ['password'],
  categoria: 'herramientas',
  desc: 'Genera una contraseña segura',
  async execute(sock, m, { args }) {
    const largo = Math.min(Math.max(parseInt(args[0]) || 16, 6), 64)
    const clave = Array.from({ length: largo }, () => CARACTERES[randomInt(CARACTERES.length)]).join('')
    await enviar(sock, m, caja('CLAVE', [['LONGITUD', largo], ['CONTRASEÑA', clave]]), {
      botones: [{ text: '📋 COPIAR', copy: clave }, { text: '🔄 OTRA', id: `#clave ${largo}` }],
      canal: false
    })
  }
}
