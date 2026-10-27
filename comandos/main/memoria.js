import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const memoriaFile = path.join(__dirname, '..', '..', 'memoria.json')

function cargarMemoria() {
  try {
    if (fs.existsSync(memoriaFile)) {
      const data = fs.readFileSync(memoriaFile, 'utf8')
      return JSON.parse(data)
    }
  } catch (e) {
    // ignore
  }
  return []
}

function guardarMemoria(memoria) {
  try {
    fs.writeFileSync(memoriaFile, JSON.stringify(memoria.slice(-1000), null, 2))
  } catch (e) {
    // ignore
  }
}

export default {
  name: 'memoria',
  alias: ['recuerdos', 'historial', 'conversaciones'],
  category: 'main',
  description: 'Muestra lo que hemos hablado en sesiones anteriores',
  usage: '#memoria [cantidad]',
  async execute(sock, m, { args }) {
    const jid = m.key.remoteJid
    const memoria = cargarMemoria().filter(m => m.jid === jid)
    const cantidad = parseInt(args[0]) || 10
    
    if (memoria.length === 0) {
      await sock.sendMessage(jid, { text: 'No hay recuerdos guardados de esta conversación.' }, { quoted: m })
      return
    }
    
    const recuerdos = memoria.slice(-cantidad).reverse()
    let texto = `🧠 *Memoria de esta conversación*\n\n`
    
    for (let i = 0; i < recuerdos.length; i++) {
      const rec = recuerdos[i]
      const fecha = new Date(rec.fecha).toLocaleString('es-ES')
      texto += `*${i + 1}.* [${fecha}]\n`
      if (rec.usuario) texto += `👤 ${rec.usuario}: ${rec.mensaje}\n`
      if (rec.respuesta) texto += `🤖 Bot: ${rec.respuesta}\n`
      texto += '\n'
    }
    
    if (memoria.length > cantidad) {
      texto += `_Mostrando últimos ${cantidad} de ${memoria.length} recuerdos_`
    }
    
    await sock.sendMessage(jid, { text: texto }, { quoted: m })
  }
}
