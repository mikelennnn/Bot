// Moderación: recuerda quién mandó cada sticker y a quién se bloqueó.
// Con #bloquear (respondiendo a un sticker) se bloquea el teléfono que lo hizo en la página.
import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'

const ARCHIVO = path.join(process.env.SESION_DIR || 'sesion_bot', 'moderacion.json')
const MAX_ENVIOS = 5000 // se recuerdan los últimos 5000 stickers

let datos = { bloqueados: [], envios: {} } // envios: huella del sticker → id del teléfono
try {
  datos = { ...datos, ...JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) }
} catch (e) {}
const bloqueados = new Set(datos.bloqueados)

let guardando = null
function guardar() {
  if (guardando) return
  guardando = setTimeout(() => {
    guardando = null
    datos.bloqueados = [...bloqueados]
    const llaves = Object.keys(datos.envios)
    if (llaves.length > MAX_ENVIOS) for (const k of llaves.slice(0, llaves.length - MAX_ENVIOS)) delete datos.envios[k]
    fs.promises.writeFile(ARCHIVO, JSON.stringify(datos)).catch((e) => console.log('[moderación] no se pudo guardar:', e?.message || e))
  }, 2000)
}

// La misma huella que WhatsApp guarda en el sticker (fileSha256), así se reconoce al reenviarlo
export const huellaSticker = (buffer) => createHash('sha256').update(buffer).digest('base64')

export function registrarEnvio(huella, cliente) {
  if (!cliente) return
  datos.envios[huella] = cliente
  guardar()
}

export const estaBloqueado = (cliente) => !!cliente && bloqueados.has(cliente)

// Devuelve el id del teléfono afectado, o null si no se sabe quién mandó ese sticker
export function bloquear(huella, si = true) {
  const cliente = datos.envios[huella]
  if (!cliente) return null
  si ? bloqueados.add(cliente) : bloqueados.delete(cliente)
  guardar()
  return cliente
}
