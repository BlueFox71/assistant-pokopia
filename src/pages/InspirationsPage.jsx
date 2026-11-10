import { useCallback, useEffect, useRef, useState } from 'react'
import { Dropdown, Image, Input, Modal, Popconfirm, Typography, message } from 'antd'
import {
  ajouterInspiration,
  ajouterVideo,
  changerImage,
  imagesDe,
  lierVideo,
  listerInspirations,
  renommerInspiration,
  supprimerInspiration,
} from '../utils/inspirationsStorage'
import { lireVideo, nomSite } from '../utils/videos'
import './InspirationsPage.css'

/** Un élément où coller du texte doit rester du texte. */
const estChamp = (cible) => cible instanceof HTMLElement && !!cible.closest('input, textarea, [contenteditable="true"]')

/**
 * La vue Inspirations : une galerie d'images et de vidéos trouvées ailleurs, à faire défiler.
 *
 * On y ajoute une image en la collant (Ctrl+V n'importe où sur la page), en la déposant,
 * ou depuis un fichier ; une vidéo YouTube ou TikTok en collant son lien. Une image peut
 * recevoir un lien vidéo, une vidéo une image (utile pour TikTok, qui n'a pas de miniature
 * publique). Pas de tri ni de recherche : seul un nom facultatif, sous chaque vignette.
 *
 * Les entrées vivent dans IndexedDB (cf. utils/inspirationsStorage.js) ; la page n'en
 * garde que des URL `blob:`, qu'elle libère en partant.
 */
export default function InspirationsPage() {
  const [entrees, setEntrees] = useState(null)
  const [ouverte, setOuverte] = useState(-1)
  const [lecture, setLecture] = useState(null)
  const [aLier, setALier] = useState(null)
  const [lien, setLien] = useState('')
  const [survol, setSurvol] = useState(false)
  const [notif, contexteNotif] = message.useMessage()
  const fichier = useRef(null)
  const fichierPour = useRef(null)
  const cibleImage = useRef(null)
  const urls = useRef(new Map())

  const urlDe = (entree) => {
    if (!entree.blob) return null
    let url = urls.current.get(entree.id)
    if (!url || url.blob !== entree.blob) {
      if (url) URL.revokeObjectURL(url.href)
      url = { href: URL.createObjectURL(entree.blob), blob: entree.blob }
      urls.current.set(entree.id, url)
    }
    return url.href
  }

  const oublierUrl = (id) => {
    const url = urls.current.get(id)
    if (url) URL.revokeObjectURL(url.href)
    urls.current.delete(id)
  }

  useEffect(() => {
    listerInspirations()
      .then(setEntrees)
      .catch(() => {
        setEntrees([])
        notif.error('Impossible de lire les inspirations enregistrées.')
      })
    const mesUrls = urls.current
    return () => {
      for (const url of mesUrls.values()) URL.revokeObjectURL(url.href)
      mesUrls.clear()
    }
  }, [notif])

  const ajouter = useCallback(
    async (blobs) => {
      try {
        const nouvelles = []
        for (const blob of blobs) nouvelles.push(await ajouterInspiration(blob))
        setEntrees((avant) => [...nouvelles.reverse(), ...(avant || [])])
        notif.success(nouvelles.length > 1 ? `${nouvelles.length} images ajoutées.` : 'Image ajoutée.')
      } catch {
        notif.error('L’image n’a pas pu être enregistrée.')
      }
    },
    [notif],
  )

  /** Ajoute la vidéo d'un texte collé ; renvoie false si le texte n'en contient pas. */
  const ajouterLien = useCallback(
    async (texte) => {
      const video = lireVideo(texte)
      if (!video) return false
      try {
        const entree = await ajouterVideo(video)
        setEntrees((avant) => [entree, ...(avant || [])])
        notif.success(`Vidéo ${nomSite(video.site)} ajoutée.`)
      } catch {
        notif.error('La vidéo n’a pas pu être enregistrée.')
      }
      return true
    },
    [notif],
  )

  // Le collage s'écoute sur toute la fenêtre : on revient de Google ou de YouTube, on fait
  // Ctrl+V, sans viser de zone. Seule exception, les champs de saisie, où coller du texte
  // doit rester du texte.
  useEffect(() => {
    const surCollage = (e) => {
      if (aLier) return
      const blobs = imagesDe(e.clipboardData)
      if (blobs.length) {
        e.preventDefault()
        ajouter(blobs)
        return
      }
      if (estChamp(e.target)) return
      const texte = e.clipboardData?.getData('text') || ''
      if (lireVideo(texte)) {
        e.preventDefault()
        ajouterLien(texte)
        return
      }
      notif.info(
        texte.trim()
          ? 'Ce lien n’est pas une vidéo YouTube ou TikTok.'
          : 'Rien à coller : sur Google, faites clic droit → « Copier l’image » ; pour une vidéo, copiez son lien.',
      )
    }
    window.addEventListener('paste', surCollage)
    return () => window.removeEventListener('paste', surCollage)
  }, [ajouter, ajouterLien, aLier, notif])

  const deposer = (e) => {
    e.preventDefault()
    setSurvol(false)
    const blobs = imagesDe(e.dataTransfer)
    if (blobs.length) return ajouter(blobs)
    const texte = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text') || ''
    if (lireVideo(texte)) return ajouterLien(texte)
    notif.info('Ce qui a été déposé n’est ni une image ni un lien vidéo.')
  }

  const remplacer = (suivante) => setEntrees((avant) => avant.map((i) => (i.id === suivante.id ? suivante : i)))

  const renommer = async (entree, nom) => {
    if ((nom || '').trim() === entree.nom) return
    try {
      remplacer(await renommerInspiration(entree, nom))
    } catch {
      notif.error('Le nom n’a pas pu être enregistré.')
    }
  }

  const supprimer = async (entree) => {
    try {
      await supprimerInspiration(entree.id)
      oublierUrl(entree.id)
      setEntrees((avant) => avant.filter((i) => i.id !== entree.id))
    } catch {
      notif.error('L’inspiration n’a pas pu être supprimée.')
    }
  }

  const poserVideo = async () => {
    const video = lireVideo(lien)
    if (!video) {
      notif.warning('Collez un lien YouTube ou TikTok.')
      return
    }
    try {
      remplacer(await lierVideo(aLier, video))
      setALier(null)
      setLien('')
    } catch {
      notif.error('Le lien n’a pas pu être enregistré.')
    }
  }

  const retirerVideo = async (entree) => {
    try {
      remplacer(await lierVideo(entree, null))
    } catch {
      notif.error('Le lien n’a pas pu être retiré.')
    }
  }

  const poserImage = async (entree, blob) => {
    try {
      if (!blob) oublierUrl(entree.id)
      remplacer(await changerImage(entree, blob))
    } catch {
      notif.error('L’image n’a pas pu être enregistrée.')
    }
  }

  // Les images seules s'agrandissent dans la visionneuse ; une entrée avec vidéo, elle, se lit.
  const images = (entrees || []).filter((e) => e.blob && !e.video)
  const nb = entrees?.length ?? 0
  const nbVideos = (entrees || []).filter((e) => e.video).length
  const nbImages = nb - nbVideos

  const ouvrir = (entree) => {
    if (!entree.video) return setOuverte(images.indexOf(entree))
    if (entree.video.embed) return setLecture(entree)
    window.open(entree.video.url, '_blank', 'noopener,noreferrer')
  }

  const titre = nb
    ? [nbImages && `${nbImages} image${nbImages > 1 ? 's' : ''}`, nbVideos && `${nbVideos} vidéo${nbVideos > 1 ? 's' : ''}`]
        .filter(Boolean)
        .join(' et ')
    : 'Inspirations'

  return (
    <div
      className={`inspirations${survol ? ' survol' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setSurvol(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setSurvol(false)
      }}
      onDrop={deposer}
    >
      {contexteNotif}
      <div className="wrap page-tete">
        <div>
          <p className="etiquette">Mes inspirations</p>
          <h1>{titre}</h1>
          <p className="liste-chapeau">
            Les idées trouvées ailleurs, à garder sous la main. Copiez une image (sur Google : clic
            droit → « Copier l’image ») ou le lien d’une vidéo YouTube ou TikTok, revenez ici et
            faites <kbd>Ctrl</kbd>+<kbd>V</kbd>. Vous pouvez aussi déposer une image sur la page.
          </p>
        </div>
        <div className="liste-actions">
          <button type="button" className="ghost-btn" onClick={() => fichier.current?.click()}>
            Ajouter depuis un fichier
          </button>
          <input
            ref={fichier}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const blobs = [...e.target.files].filter((f) => f.type.startsWith('image/'))
              e.target.value = ''
              if (blobs.length) ajouter(blobs)
            }}
          />
          {/* L'image d'une entrée existante, choisie depuis son menu. */}
          <input
            ref={fichierPour}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const blob = [...e.target.files].find((f) => f.type.startsWith('image/'))
              e.target.value = ''
              if (blob && cibleImage.current) poserImage(cibleImage.current, blob)
              cibleImage.current = null
            }}
          />
        </div>
      </div>

      <div className="wrap">
        <ChampLien onAjouter={ajouterLien} />

        {entrees && !nb && (
          <div className="inspirations-vide">
            <p>
              Aucune inspiration pour l’instant. Copiez une image ou un lien vidéo, puis{' '}
              <kbd>Ctrl</kbd>+<kbd>V</kbd> ici.
            </p>
          </div>
        )}

        {nb > 0 && (
          <Image.PreviewGroup
            items={images.map(urlDe)}
            preview={{
              visible: ouverte >= 0,
              current: ouverte,
              onChange: setOuverte,
              onVisibleChange: (v) => !v && setOuverte(-1),
              imageRender: (original, { current }) => (
                <div className="inspirations-apercu">
                  {original}
                  {images[current]?.nom && <p className="inspirations-apercu-nom">{images[current].nom}</p>}
                </div>
              ),
            }}
          >
            <ul className="inspirations-grille">
              {entrees.map((entree) => {
                const vignette = urlDe(entree) || entree.video?.miniature
                const menu = [
                  entree.video
                    ? { key: 'video-', label: 'Retirer le lien vidéo', disabled: !entree.blob }
                    : { key: 'video+', label: 'Lier une vidéo…' },
                  entree.video && { key: 'image+', label: entree.blob ? 'Changer l’image…' : 'Ajouter une image…' },
                  entree.video && entree.blob && { key: 'image-', label: 'Retirer l’image' },
                  entree.video && { key: 'site', label: `Ouvrir sur ${nomSite(entree.video.site)}` },
                ].filter(Boolean)
                return (
                  <li key={entree.id} className="inspiration">
                    <button
                      type="button"
                      className={`inspiration-image${entree.video ? ' video' : ''}`}
                      onClick={() => ouvrir(entree)}
                      aria-label={`${entree.video ? 'Lire' : 'Agrandir'} ${entree.nom || (entree.video ? 'la vidéo' : 'l’image')}`}
                    >
                      {vignette ? (
                        <img src={vignette} alt={entree.nom} loading="lazy" />
                      ) : (
                        <span className={`inspiration-sans-image site-${entree.video?.site}`}>
                          {nomSite(entree.video?.site)}
                        </span>
                      )}
                      {entree.video && (
                        <span className="inspiration-lecture" aria-hidden="true">
                          <span className="triangle" />
                          {nomSite(entree.video.site)}
                        </span>
                      )}
                    </button>
                    <div className="inspiration-pied">
                      <Typography.Text
                        className={`inspiration-nom${entree.nom ? '' : ' sans-nom'}`}
                        editable={{
                          text: entree.nom,
                          maxLength: 80,
                          tooltip: 'Nommer',
                          onChange: (nom) => renommer(entree, nom),
                        }}
                      >
                        {entree.nom || 'Sans nom'}
                      </Typography.Text>
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: menu,
                          onClick: ({ key }) => {
                            if (key === 'video+') {
                              setLien('')
                              setALier(entree)
                            } else if (key === 'video-') retirerVideo(entree)
                            else if (key === 'image+') {
                              cibleImage.current = entree
                              fichierPour.current?.click()
                            } else if (key === 'image-') poserImage(entree, null)
                            else if (key === 'site') window.open(entree.video.url, '_blank', 'noopener,noreferrer')
                          },
                        }}
                      >
                        <button type="button" className="mini-btn">
                          {entree.video ? 'Vidéo' : 'Lien'} ▾
                        </button>
                      </Dropdown>
                      <Popconfirm
                        title="Supprimer cette inspiration ?"
                        okText="Supprimer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => supprimer(entree)}
                      >
                        <button type="button" className="mini-btn">
                          Supprimer
                        </button>
                      </Popconfirm>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Image.PreviewGroup>
        )}
      </div>

      <Modal
        open={!!lecture}
        onCancel={() => setLecture(null)}
        footer={null}
        destroyOnClose
        centered
        width={lecture?.video.site === 'tiktok' ? 380 : 900}
        title={lecture?.nom || `Vidéo ${nomSite(lecture?.video.site)}`}
      >
        {lecture && (
          <div className="inspirations-lecteur">
            <iframe
              className={`lecteur-${lecture.video.site}`}
              src={lecture.video.embed}
              title={lecture.nom || 'Vidéo'}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <a href={lecture.video.url} target="_blank" rel="noreferrer">
              Ouvrir sur {nomSite(lecture.video.site)} ↗
            </a>
          </div>
        )}
      </Modal>

      <Modal
        open={!!aLier}
        onCancel={() => setALier(null)}
        onOk={poserVideo}
        okText="Lier"
        cancelText="Annuler"
        title="Lier une vidéo à cette image"
        destroyOnClose
      >
        <Input
          autoFocus
          placeholder="https://www.youtube.com/… ou https://www.tiktok.com/…"
          value={lien}
          onChange={(e) => setLien(e.target.value)}
          onPressEnter={poserVideo}
        />
      </Modal>
    </div>
  )
}

/** Le champ « coller un lien vidéo », pour qui préfère viser une zone. */
function ChampLien({ onAjouter }) {
  const [texte, setTexte] = useState('')
  const valider = async () => {
    if (!texte.trim()) return
    if (await onAjouter(texte)) setTexte('')
  }
  const reconnu = lireVideo(texte)
  return (
    <div className="inspirations-lien">
      <Input
        allowClear
        placeholder="Coller le lien d’une vidéo YouTube ou TikTok"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onPressEnter={valider}
        status={texte.trim() && !reconnu ? 'warning' : undefined}
      />
      <button type="button" className="ghost-btn" onClick={valider} disabled={!reconnu}>
        Ajouter la vidéo
      </button>
    </div>
  )
}
