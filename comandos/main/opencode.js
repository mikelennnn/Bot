let lastDispatch = 0

export default {
  name: 'opencode',
  alias: [],
  async execute(sock, m, { texto, prefijo }) {
    const jid = m.key.remoteJid
    const senderJid = m.key.participant || m.key.remoteJid
    const senderNumber = senderJid.split('@')[0]

    const owner = process.env.OWNER_NUMBER || ''
    const ownerClean = owner.replace(/\D/g, '')

    if (ownerClean && senderNumber !== ownerClean) {
      await sock.sendMessage(jid, { text: 'No está autorizado' }, { quoted: m })
      return
    }

    // Extract text after #opencode
    const prefixLower = prefijo.toLowerCase()
    const textoLower = texto.toLowerCase()
    const cmdName = 'opencode'
    // Find position after command name
    const idx = textoLower.indexOf(prefixLower + cmdName)
    if (idx === -1) return
    let tarea = texto.slice(idx + prefixLower.length + cmdName.length).trim()

    if (!tarea) {
      await sock.sendMessage(jid, { text: 'Pide la tarea' }, { quoted: m })
      return
    }

    const now = Date.now()
    if (now - lastDispatch < 30000) {
      // Avoid duplicate tasks within 30s - just ignore silently or could respond, but issue says "Evita tareas duplicadas con un límite de una tarea cada 30 segundos." - probably ignore without spamming
      return
    }

    await sock.sendMessage(jid, { text: 'Recibido' }, { quoted: m })

    const ghRepo = process.env.GH_REPO || ''
    const ghToken = process.env.GH_DISPATCH_TOKEN || ''
    const workflow = 'opencode.yml'
    const ref = 'main'

    try {
      const url = `https://api.github.com/repos/${ghRepo}/actions/workflows/${workflow}/dispatches`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${ghToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref,
          inputs: {
            tarea
          }
        })
      })

      if (res.ok) {
        const actionsUrl = `https://github.com/${ghRepo}/actions`
        await sock.sendMessage(jid, { text: `Tarea enviada\n${actionsUrl}` }, { quoted: m })
        lastDispatch = now
      } else {
        const errText = await res.text().catch(() => '')
        // Don't log token or task text
        await sock.sendMessage(jid, { text: `Error al enviar la tarea` }, { quoted: m })
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `Error al enviar la tarea` }, { quoted: m })
    }
  }
}
