import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Popconfirm, Typography, message } from 'antd'
import {
  ajouterInspiration,
  imagesDe,
  listerInspirations,
  renommerInspiration,
  supprimerInspiration,
} from '../utils/inspirationsStorage'
import './InspirationsPage.css'

/**
 * La vue Inspirations : une galerie d'images trouvées ailleurs, à faire défiler.
 *
 * On y ajoute une image en la collant (Ctrl+V n'importe où sur la page), en la déposant,
 * ou depuis un fichier. Pas de tri ni de recherche : la galerie se parcourt, elle ne se
 * consulte pas — seul un nom facultatif, sous chaque vignette.
 *
 * Les images vivent dans IndexedDB (cf. utils/inspirationsStorage.js) ; la page n'en
 * garde que des URL `blob:`, qu'elle libère en partant.
 */
export default function InspirationsPage() {
  const [images, setImages] = useState(null)
  const [ouverte, setOuverte] = useState(-1)
  const [survol, setSurvol] = useState(false)
  const [notif, contexteNotif] = message.useMessage()
  const fichier = useRef(null)
  const urls = useRef(new Map())

  const urlDe = (entree) => {
    let url = urls.current.get(entree.id)
    if (!url) {
      url = URL.createObjectURL(entree.blob)
      urls.current.set(entree.id, url)
    }
    return url
  }

  useEffect(() => {
    listerInspirations()
      .then(setImages)
      .catch(() => {
        setImages([])
        notif.error('Impossible de lire les images enregistrées.')
      })
    const mesUrls = urls.current
    return () => {
      for (const url of mesUrls.values()) URL.revokeObjectURL(url)
      mesUrls.clear()
    }
  }, [notif])

  const ajouter = useCallback(
    async (blobs) => {
      try {
        const nouvelles = []
        for (const blob of blobs) nouvelles.push(await ajouterInspiration(blob))
        setImages((avant) => [...nouvelles.reverse(), ...(avant || [])])
        notif.success(nouvelles.length > 1 ? `${nouvelles.length} images ajoutées.` : 'Image ajoutée.')
      } catch {
        notif.error('L’image n’a pas pu être enregistrée.')
      }
    },
    [notif],
  )

  // Le collage s'écoute sur toute la fenêtre : on revient de Google, on fait Ctrl+V, sans
  // viser de zone. Seule exception, le champ de nom en cours d'édition, où coller du texte
  // doit rester du texte.
  useEffect(() => {
    const surCollage = (e) => {
      const blobs = imagesDe(e.clipboardData)
      if (blobs.length) {
        e.preventDefault()
        ajouter(blobs)
        return
      }
      const cible = e.target
      if (cible instanceof HTMLElement && cible.closest('input, textarea, [contenteditable="true"]')) return
      notif.info('Pas d’image dans le presse-papiers : sur Google, faites clic droit → « Copier l’image ».')
    }
    window.addEventListener('paste', surCollage)
    return () => window.removeEventListener('paste', surCollage)
  }, [ajouter, notif])

  const deposer = (e) => {
    e.preventDefault()
    setSurvol(false)
    const blobs = imagesDe(e.dataTransfer)
    if (blobs.length) ajouter(blobs)
    else notif.info('Ce qui a été déposé n’est pas une image.')
  }

  const renommer = async (entree, nom) => {
    if ((nom || '').trim() === entree.nom) return
    try {
      const suivante = await renommerInspiration(entree, nom)
      setImages((avant) => avant.map((i) => (i.id === entree.id ? suivante : i)))
    } catch {
      notif.error('Le nom n’a pas pu être enregistré.')
    }
  }

  const supprimer = async (entree) => {
    try {
      await supprimerInspiration(entree.id)
      const url = urls.current.get(entree.id)
      if (url) URL.revokeObjectURL(url)
      urls.current.delete(entree.id)
      setImages((avant) => avant.filter((i) => i.id !== entree.id))
    } catch {
      notif.error('L’image n’a pas pu être supprimée.')
    }
  }

  const nb = images?.length ?? 0

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
          <h1>{nb ? `${nb} image${nb > 1 ? 's' : ''} gardée${nb > 1 ? 's' : ''}` : 'Inspirations'}</h1>
          <p className="liste-chapeau">
            Les idées trouvées ailleurs, à garder sous la main. Copiez une image (sur Google : clic
            droit → « Copier l’image »), revenez ici et faites <kbd>Ctrl</kbd>+<kbd>V</kbd>. Vous
            pouvez aussi déposer une image sur la page.
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
        </div>
      </div>

      <div className="wrap">
        {images && !nb && (
          <div className="inspirations-vide">
            <p>
              Aucune image pour l’instant. Copiez-en une, puis <kbd>Ctrl</kbd>+<kbd>V</kbd> ici.
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
              {images.map((entree, index) => (
                <li key={entree.id} className="inspiration">
                  <button
                    type="button"
                    className="inspiration-image"
                    onClick={() => setOuverte(index)}
                    aria-label={`Agrandir ${entree.nom || 'l’image'}`}
                  >
                    <img src={urlDe(entree)} alt={entree.nom} loading="lazy" />
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
                    <Popconfirm
                      title="Supprimer cette image ?"
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
              ))}
            </ul>
          </Image.PreviewGroup>
        )}
      </div>
    </div>
  )
}
