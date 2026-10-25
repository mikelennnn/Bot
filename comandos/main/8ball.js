const RESPUESTAS = [
  'Sí, definitivamente.',
  'Sin duda alguna.',
  'Puedes contar con ello.',
  'Sí.',
  'Es muy probable.',
  'Todo apunta a que sí.',
  'No cuentes con ello.',
  'No.',
  'Es muy dudoso.',
  'No lo creo.',
  'Pregunta de nuevo más tarde.',
  'No puedo predecirlo ahora.',
  'Concéntrate y pregunta de nuevo.',
  'No te lo puedo decir en este momento.',
  'Mis fuentes dicen que no.',
  'Las perspectivas no son buenas.',
  'Las perspectivas son buenas.',
  'Mejor no te lo digo ahora.',
  'Definitivamente no.',
  'Claro que sí.'
]

export default {
  name: '8ball',
  alias: ['bola8'],
  async execute(sock, m, { args }) {
    const jid = m.key.remoteJid
    const pregunta = args.join(' ').trim()

    if (!pregunta) {
      await sock.sendMessage(
        jid,
        { text: '🎱 Escribe una pregunta. Ejemplo: #8ball ¿Voy a ganar?' },
        { quoted: m }
      )
      return
    }

    const respuesta = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)]
    const texto = `🎱 *Pregunta:* ${pregunta}\n*Respuesta:* ${respuesta}`

    await sock.sendMessage(jid, { text: texto }, { quoted: m })
  }
}
