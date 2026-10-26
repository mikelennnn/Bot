let lastDispatch = 0

export default {
  name: 'opencode',
  alias: ['oc'],
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

    const prefixLower = prefijo.toLowerCase()
    const textoLower = texto.toLowerCase()
    const cmdName = 'opencode'
    const aliasName = 'oc'
    let idx = textoLower.indexOf(prefixLower + cmdName)
    if (idx === -1) {
      idx = textoLower.indexOf(prefixLower + aliasName)
      if (idx === -1) return
      let tarea = texto.slice(idx + prefixLower.length + aliasName.length).trim()
      if (!tarea) {
        await sock.sendMessage(jid, { text: 'Pide la tarea' }, { quoted: m })
        return
      }
      await this._dispatch(sock, jid, m, tarea)
      return
    }
    let tarea = texto.slice(idx + prefixLower.length + cmdName.length).trim()

    if (!tarea) {
      await sock.sendMessage(jid, { text: 'Pide la tarea' }, { quoted: m })
      return
    }

    await this._dispatch(sock, jid, m, tarea)
  },

  async _dispatch(sock, jid, m, tarea) {
    const now = Date.now()
    if (now - lastDispatch < 30000) {
      return
    }

    await sock.sendMessage(jid, { text: 'Recibido' }, { quoted: m })

    const ghRepo = process.env.GH_REPO || process.env.REPO || ''
    const ghToken = process.env.GH_DISPATCH_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
    const workflow = process.env.OPENCODE_WORKFLOW || 'opencode.yml'
    const ref = process.env.OPENCODE_REF || 'main'

    if (!ghRepo || !ghToken) {
      await sock.sendMessage(jid, { text: 'Error al enviar la tarea' }, { quoted: m })
      return
    }

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
            tarea,
            task: tarea,
            prompt: tarea
          }
        })
      })

      if (res.ok) {
        const actionsUrl = `https://github.com/${ghRepo}/actions`
        await sock.sendMessage(jid, { text: `Tarea enviada\n${actionsUrl}` }, { quoted: m })
        lastDispatch = now
      } else {
        await res.text().catch(() => '')
        await sock.sendMessage(jid, { text: 'Error al enviar la tarea' }, { quoted: m })
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: 'Error al enviar la tarea' }, { quoted: m })
    }
  }
}
