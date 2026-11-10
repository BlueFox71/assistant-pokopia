/**
 * Les liens vidéo des inspirations : YouTube et TikTok.
 *
 * `lireVideo(texte)` reconnaît un lien dans un texte collé et renvoie
 * `{ url, site, id, embed, miniature }` — `id`, `embed` et `miniature` à null quand le
 * lien ne dit pas lequel (un lien court TikTok `vm.tiktok.com/…` ne se résout qu'en
 * suivant sa redirection) : on garde alors le lien, qu'on ouvre sur le site.
 */

const SITES = { youtube: 'YouTube', tiktok: 'TikTok' }
export const nomSite = (site) => SITES[site] || 'Vidéo'

const ID_YOUTUBE = /^[\w-]{11}$/

function idYoutube(u) {
  const hote = u.hostname.replace(/^(www\.|m\.|music\.)/, '')
  if (hote === 'youtu.be') return u.pathname.split('/')[1] || null
  if (hote !== 'youtube.com' && hote !== 'youtube-nocookie.com') return null
  if (u.pathname === '/watch') return u.searchParams.get('v')
  const [, genre, id] = u.pathname.split('/')
  return ['shorts', 'embed', 'live', 'v'].includes(genre) ? id : null
}

/** Le premier lien http(s) d'un texte, ou null. */
function premierLien(texte) {
  const m = String(texte || '').match(/https?:\/\/[^\s<>"']+/i)
  return m ? m[0] : null
}

export function lireVideo(texte) {
  const brut = premierLien(texte)
  if (!brut) return null
  let u
  try {
    u = new URL(brut)
  } catch {
    return null
  }
  const hote = u.hostname.toLowerCase()

  if (/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(hote)) {
    const id = idYoutube(u)
    if (!id || !ID_YOUTUBE.test(id)) return null
    return {
      url: `https://www.youtube.com/watch?v=${id}`,
      site: 'youtube',
      id,
      embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
      miniature: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    }
  }

  if (/(^|\.)tiktok\.com$/.test(hote)) {
    const id = u.pathname.match(/\/(?:video|photo|v)\/(\d+)/)?.[1] || null
    return {
      url: id ? `${u.origin}${u.pathname}` : brut,
      site: 'tiktok',
      id,
      embed: id ? `https://www.tiktok.com/embed/v2/${id}` : null,
      miniature: null,
    }
  }

  return null
}
