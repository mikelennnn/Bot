import { caja, enviar, obtenerJSON, uso, error } from '../../lib/util.js'

export default {
  name: 'tiktok',
  alias: ['tt'],
  categoria: 'multimedia',
  desc: 'Descarga un video de TikTok sin marca de agua',
  async execute(sock, m, { args }) {
    const url = args[0]
    if (!url || !/tiktok\.com/i.test(url)) return uso(sock, m, '#tiktok https://vm.tiktok.com/xxxx')

    await enviar(sock, m, caja('TIKTOK', [['ESTADO', '⏳ DESCARGANDO']]), { canal: false })

    let d
    try {
      const r = await obtenerJSON(`https://www.tikwm.com/api/?hd=1&url=${encodeURIComponent(url)}`)
      if (r.code !== 0 || !r.data?.play) throw new Error(r.msg || 'sin video')
      d = r.data
    } catch (e) {
      return error(sock, m, [['MOTIVO', 'No pude descargar ese TikTok']])
    }

    const leyenda = caja('TIKTOK', [
      ['AUTOR', d.author?.nickname || '?'],
      ['DURACIÓN', `${d.duration || '?'}s`],
      ['LIKES', d.digg_count ?? '?'],
      `❯ ${(d.title || '').slice(0, 150)}`
    ])
    const video = d.hdplay || d.play
    await sock.sendMessage(m.key.remoteJid, { video: { url: video }, caption: leyenda, mimetype: 'video/mp4' }, { quoted: m })
  }
}
