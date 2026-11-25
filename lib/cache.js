// Memorias (cachés) para que mandar a grupos grandes gaste mucho menos CPU.
// Sin esto, CADA sticker volvía a pedir la lista completa de miembros del grupo
// y los dispositivos de todos cada 5 minutos.

const VIDA_GRUPO = 10 * 60 * 1000 // cada 10 min se vuelve a pedir la lista completa, por si acaso
const VIDA_DISPOSITIVOS = 60 * 60 * 1000 // dispositivos de cada usuario: 1 hora (antes 5 min)

// ---------- Datos de grupos ----------
const grupos = new Map() // jid → { datos, hasta }
const pidiendo = new Map() // jid → promesa (para no pedir lo mismo varias veces a la vez)
let sockActual = null

// La usa Baileys antes de mandar a un grupo: si no está guardado, lo pide UNA vez y lo guarda
export async function datosGrupoGuardados(jid) {
  const g = grupos.get(jid)
  if (g && g.hasta > Date.now()) return g.datos
  if (!sockActual) return undefined
  if (!pidiendo.has(jid)) {
    pidiendo.set(jid, sockActual.groupMetadata(jid).catch(() => undefined).finally(() => pidiendo.delete(jid)))
  }
  return pidiendo.get(jid)
}

export function escucharGrupos(sock) {
  sockActual = sock
  // Guarda los datos cada vez que se piden al servidor
  const original = sock.groupMetadata
  sock.groupMetadata = async (jid) => {
    const datos = await original(jid)
    if (datos?.participants) grupos.set(jid, { datos, hasta: Date.now() + VIDA_GRUPO })
    return datos
  }
  sock.ev.on('groups.update', (cambios) => {
    for (const c of cambios) {
      const g = grupos.get(c.id)
      if (g) Object.assign(g.datos, Object.fromEntries(Object.entries(c).filter(([k]) => !k.startsWith('author'))))
    }
  })
  // Gente que entra o sale: se actualiza la lista sin volver a pedirla completa
  sock.ev.on('group-participants.update', ({ id, participants, action }) => {
    const g = grupos.get(id)
    if (!g) return
    const lista = (participants || []).map((p) => (typeof p === 'string' ? { id: p } : p))
    const datos = g.datos
    if (action === 'add') {
      const ya = new Set(datos.participants.map((p) => p.id))
      for (const p of lista) if (p.id && !ya.has(p.id)) datos.participants.push({ id: p.id, phoneNumber: p.phoneNumber, admin: p.admin || null })
    } else if (action === 'remove') {
      const fuera = new Set()
      for (const p of lista) {
        if (p.id) fuera.add(p.id)
        if (p.phoneNumber) fuera.add(p.phoneNumber)
      }
      datos.participants = datos.participants.filter((p) => !fuera.has(p.id) && !fuera.has(p.phoneNumber))
    } else if (action === 'promote' || action === 'demote') {
      for (const p of datos.participants) {
        if (lista.some((x) => x.id === p.id || (x.phoneNumber && x.phoneNumber === p.phoneNumber))) p.admin = action === 'promote' ? 'admin' : null
      }
    } else {
      grupos.delete(id) // otro cambio raro: se vuelve a pedir la próxima vez
    }
  })
}

// ---------- Dispositivos de cada usuario ----------
const dispositivos = new Map() // usuario → { valor, hasta }
function leer(clave) {
  const d = dispositivos.get(clave)
  if (!d) return undefined
  if (d.hasta < Date.now()) {
    dispositivos.delete(clave)
    return undefined
  }
  return d.valor
}
export const cacheDispositivos = {
  get: (clave) => leer(clave),
  set: (clave, valor) => void dispositivos.set(clave, { valor, hasta: Date.now() + VIDA_DISPOSITIVOS }),
  mget: (claves) => {
    const r = {}
    for (const c of claves) {
      const v = leer(c)
      if (v !== undefined) r[c] = v
    }
    return r
  },
  mset: (lista) => {
    for (const { key, value } of lista) dispositivos.set(key, { valor: value, hasta: Date.now() + VIDA_DISPOSITIVOS })
  },
  del: (clave) => void dispositivos.delete(clave),
  flushAll: () => dispositivos.clear(),
  close: () => {}
}
// Limpieza de vencidos para no gastar memoria
setInterval(() => {
  const ahora = Date.now()
  for (const [k, d] of dispositivos) if (d.hasta < ahora) dispositivos.delete(k)
  for (const [k, g] of grupos) if (g.hasta < ahora) grupos.delete(k)
}, 5 * 60 * 1000).unref()
