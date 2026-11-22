import { enviar, caja, obtenerJSON, uso } from '../../lib/util.js'

export default {
  name: 'github',
  alias: ['gh'],
  categoria: 'multimedia',
  desc: 'Perfil de un usuario de GitHub',
  async execute(sock, m, { args }) {
    const usuario = args[0]
    if (!usuario) return uso(sock, m, '#github torvalds')
    let u
    try {
      u = await obtenerJSON(`https://api.github.com/users/${encodeURIComponent(usuario)}`, {
        headers: { Accept: 'application/vnd.github+json' }
      })
    } catch (e) {
      return uso(sock, m, '#github torvalds', 'No encontré ese usuario')
    }
    const texto = caja('GITHUB', [
      ['USUARIO', u.login],
      ['NOMBRE', u.name || 'Sin nombre'],
      ['REPOS', u.public_repos],
      ['SEGUIDORES', u.followers],
      ['SIGUIENDO', u.following],
      ['DESDE', new Date(u.created_at).toLocaleDateString('es-MX')],
      `❯ ${(u.bio || 'Sin biografía').slice(0, 150)}`
    ])
    await enviar(sock, m, texto, { imagen: u.avatar_url, botones: [{ text: '🐙 VER PERFIL', url: u.html_url }], canal: false })
  }
}
