import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Image, Input, Popconfirm, Typography, message } from 'antd'
import { frObjet, frPokemon, objetParNom, pokemonParNom, spriteObjet, spritePokemon } from '../data'
import { CHANCE_LEGENDAIRE, PELUCHES } from '../data/ilesDeReve'
import { nomVilleParDefaut } from '../data/villes'
import { urlIconeVille, urlSpriteAliment, urlSpriteObjet, urlSpriteIle, urlSpritePokemon, urlSpriteRecette } from '../data/images'
import { imagesDe } from '../utils/baseLocale'
import { codeComplet, extraireCode, formaterCode } from '../utils/codeIle'
import { ajouterIle, listerIles, modifierIle, supprimerIle } from '../utils/ilesStorage'
import './IlesDeRevePage.css'

const ONGLETS = [
  { cle: 'peluches', libelle: 'Peluches', detail: 'Ce qu’on trouve sur chaque île' },
  { cle: 'abonnes', libelle: 'Abonnés', detail: 'Les codes d’île gardés' },
]

/**
 * La page « Îles de rêve », en deux onglets : les peluches (quelle île, quelles
 * ressources) et les îles des abonnés (codes `XXXX XXXX`, image facultative). L'onglet
 * ouvert vit dans l'URL (`?onglet=abonnes`), comme la famille de la page Recettes.
 */
export default function IlesDeRevePage() {
  const [params, setParams] = useSearchParams()
  const onglet = ONGLETS.some((o) => o.cle === params.get('onglet')) ? params.get('onglet') : ONGLETS[0].cle
  const choisir = (cle) =>
    setParams(
      (p) => {
        const suivant = new URLSearchParams(p)
        suivant.set('onglet', cle)
        return suivant
      },
      { replace: true },
    )

  return (
    <>
      <div className="wrap page-tete">
        <div>
          <p className="etiquette">Objets</p>
          <h1>Îles de rêve</h1>
          <p className="liste-chapeau">
            Posez une peluche chez vous et interagissez avec : Baudrive propose de vous emmener sur
            l’Île Rêve qui lui correspond. Une île par jour ; elle se réinitialise le lendemain,
            avec ce qu’on y a laissé. Et gardez ici les codes des îles de vos abonnés.
          </p>
        </div>
      </div>

      <div className="wrap iles">
        <div className="iles-onglets" role="tablist" aria-label="Îles de rêve">
          {ONGLETS.map((o) => (
            <button
              key={o.cle}
              type="button"
              role="tab"
              aria-selected={o.cle === onglet}
              className="iles-onglet"
              onClick={() => choisir(o.cle)}
            >
              {o.libelle}
              <small>{o.detail}</small>
            </button>
          ))}
        </div>
        <section className="iles-panneau" role="tabpanel">
          {onglet === 'peluches' ? <Peluches /> : <Abonnes />}
        </section>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ Peluches -- */

function urlRessource(sprite) {
  if (!sprite) return null
  if (sprite.objet) return urlSpriteObjet(sprite.objet)
  if (sprite.aliment) return urlSpriteAliment(sprite.aliment)
  if (sprite.recette) return urlSpriteRecette(sprite.recette)
  if (sprite.ile) return urlSpriteIle(sprite.ile)
  return null
}

function Peluches() {
  return (
    <div className="peluches">
      <aside className="peluches-legendaires">
        <h3>Légendaires</h3>
        <p>
          Certaines îles cachent un Pokémon légendaire, au fond d’une grotte, derrière des murs
          friables à casser avec Éclate-Roc. Chaque légendaire a son île, et n’y apparaît qu’avec
          environ {CHANCE_LEGENDAIRE} de chances : revenez plusieurs jours de suite. Une fois
          rencontré, recrutez-le, puis ramenez-le en ville pour lui installer un habitat.
        </p>
      </aside>

      <ul className="peluches-grille">
        {PELUCHES.map((p) => (
          <Peluche key={p.cle} peluche={p} />
        ))}
      </ul>
    </div>
  )
}

function Peluche({ peluche }) {
  const sprite = urlSpriteObjet(spriteObjet(peluche.objet))
  const nom = objetParNom.has(peluche.objet) ? frObjet(peluche.objet) : peluche.objet
  const ville = peluche.ville
  return (
    <li className={`peluche${peluche.hasard ? ' hasard' : ''}`}>
      <header className="peluche-tete">
        {sprite && <img src={sprite} alt="" width="56" height="56" />}
        <div>
          <h3>
            {objetParNom.has(peluche.objet) ? (
              <Link to={`/objet/${encodeURIComponent(peluche.objet)}`}>{nom}</Link>
            ) : (
              nom
            )}
          </h3>
          <p className="peluche-ile">
            {peluche.ile}
            {peluche.dlc && <span className="peluche-dlc">DLC</span>}
          </p>
          {ville && (
            <p className="peluche-ville">
              {urlIconeVille(ville) && <img src={urlIconeVille(ville)} alt="" width="16" height="16" />}
              façon {nomVilleParDefaut(ville)}
            </p>
          )}
        </div>
      </header>
      {peluche.biome && <p className="peluche-biome">{peluche.biome}</p>}
      {peluche.hasard ? (
        <p className="peluche-hasard">
          Mène à l’une des îles ci-contre, tirée au hasard : ses ressources sont celles de l’île
          tirée.
        </p>
      ) : (
        <ul className="peluche-ressources">
          {peluche.ressources.map((r) => {
            const url = urlRessource(r.sprite)
            const contenu = (
              <>
                {url ? <img src={url} alt="" width="28" height="28" /> : <span className="ressource-sans-image" />}
                <span>
                  {r.fr}
                  {r.traduit && <sup title={`Nom traduit — en anglais : ${r.en}`}>*</sup>}
                </span>
              </>
            )
            return (
              <li key={r.en} className="ressource" title={r.en}>
                {objetParNom.has(r.en) ? <Link to={`/objet/${encodeURIComponent(r.en)}`}>{contenu}</Link> : contenu}
              </li>
            )
          })}
        </ul>
      )}
      {!peluche.hasard && <Legendaire nom={peluche.legendaire} />}
    </li>
  )
}

/** Le légendaire de l'île, ou la mention qu'elle n'en a pas (rien pour le DLC : on ne sait pas). */
function Legendaire({ nom }) {
  if (!nom) return null
  const sprite = urlSpritePokemon(spritePokemon(nom))
  return (
    <p className="peluche-legendaire">
      <span>Légendaire possible</span>
      <Link to={`/pokedex/${encodeURIComponent(nom)}`}>
        {sprite && <img src={sprite} alt="" width="32" height="32" />}
        {pokemonParNom.has(nom) ? frPokemon(nom) : nom}
      </Link>
    </p>
  )
}

/* ------------------------------------------------------------------- Abonnés -- */

function useUrlsBlob() {
  const urls = useRef(new Map())
  useEffect(() => {
    const mesUrls = urls.current
    return () => {
      for (const u of mesUrls.values()) URL.revokeObjectURL(u.href)
      mesUrls.clear()
    }
  }, [])
  return useCallback((entree) => {
    if (!entree?.blob) return null
    let u = urls.current.get(entree.id)
    if (!u || u.blob !== entree.blob) {
      if (u) URL.revokeObjectURL(u.href)
      u = { href: URL.createObjectURL(entree.blob), blob: entree.blob }
      urls.current.set(entree.id, u)
    }
    return u.href
  }, [])
}

function Abonnes() {
  const [iles, setIles] = useState(null)
  const [code, setCode] = useState('')
  const [nom, setNom] = useState('')
  const [image, setImage] = useState(null)
  const [filtre, setFiltre] = useState('')
  const [notif, contexteNotif] = message.useMessage()
  const fichier = useRef(null)
  const fichierPour = useRef(null)
  const cible = useRef(null)
  const urlDe = useUrlsBlob()
  const apercu = useMemo(() => (image ? URL.createObjectURL(image) : null), [image])
  useEffect(() => () => apercu && URL.revokeObjectURL(apercu), [apercu])

  useEffect(() => {
    listerIles()
      .then(setIles)
      .catch(() => {
        setIles([])
        notif.error('Impossible de lire les îles enregistrées.')
      })
  }, [notif])

  // Coller une image n'importe où sur l'onglet la joint à l'île en cours de saisie.
  useEffect(() => {
    const surCollage = (e) => {
      const blobs = imagesDe(e.clipboardData)
      if (!blobs.length) return
      e.preventDefault()
      setImage(blobs[0])
      notif.success('Image jointe à l’île en cours de saisie.')
    }
    window.addEventListener('paste', surCollage)
    return () => window.removeEventListener('paste', surCollage)
  }, [notif])

  const doublon = codeComplet(code) && iles?.find((i) => i.code === formaterCode(code))

  const enregistrer = async () => {
    if (!codeComplet(code)) return
    try {
      const entree = await ajouterIle({ code, nom, blob: image })
      setIles((avant) => [entree, ...(avant || [])])
      setCode('')
      setNom('')
      setImage(null)
      notif.success(`Île ${entree.code} enregistrée.`)
    } catch {
      notif.error('L’île n’a pas pu être enregistrée.')
    }
  }

  const remplacer = (suivante) => setIles((avant) => avant.map((i) => (i.id === suivante.id ? suivante : i)))
  const modifier = async (entree, champs) => {
    try {
      remplacer(await modifierIle(entree, champs))
    } catch {
      notif.error('La modification n’a pas pu être enregistrée.')
    }
  }
  const supprimer = async (entree) => {
    try {
      await supprimerIle(entree.id)
      setIles((avant) => avant.filter((i) => i.id !== entree.id))
    } catch {
      notif.error('L’île n’a pas pu être supprimée.')
    }
  }
  const copier = async (entree) => {
    try {
      await navigator.clipboard.writeText(entree.code)
      notif.success(`Code ${entree.code} copié.`)
    } catch {
      notif.error('Le presse-papiers est inaccessible.')
    }
  }

  const f = filtre.trim().toLowerCase()
  const fBrut = f.replace(/[^a-z0-9]/g, '')
  const visibles = (iles || []).filter(
    (i) => !f || i.nom.toLowerCase().includes(f) || (fBrut && i.code.replace(' ', '').toLowerCase().includes(fBrut)),
  )

  return (
    <div className="abonnes">
      {contexteNotif}
      <form
        className="abonnes-saisie"
        onSubmit={(e) => {
          e.preventDefault()
          enregistrer()
        }}
      >
        <div className="abonnes-champs">
          <label>
            <span>Code de l’île</span>
            <Input
              className="abonnes-code"
              placeholder="XXXX XXXX"
              value={code}
              maxLength={9}
              onChange={(e) => setCode(formaterCode(e.target.value))}
              onPaste={(e) => {
                const trouve = extraireCode(e.clipboardData.getData('text'))
                if (trouve) {
                  e.preventDefault()
                  setCode(trouve)
                }
              }}
              status={doublon ? 'warning' : undefined}
            />
          </label>
          <label>
            <span>Nom (facultatif)</span>
            <Input
              placeholder="L’abonné, ce qu’on y trouve…"
              value={nom}
              maxLength={80}
              onChange={(e) => setNom(e.target.value)}
            />
          </label>
          <div className="abonnes-image">
            <span>Image (facultative)</span>
            {apercu ? (
              <div className="abonnes-apercu">
                <img src={apercu} alt="" />
                <button type="button" className="mini-btn" onClick={() => setImage(null)}>
                  Retirer
                </button>
              </div>
            ) : (
              <button type="button" className="abonnes-zone" onClick={() => fichier.current?.click()}>
                <kbd>Ctrl</kbd>+<kbd>V</kbd> ou choisir un fichier
              </button>
            )}
          </div>
          <button type="submit" className="ghost-btn primaire" disabled={!codeComplet(code)}>
            Enregistrer
          </button>
        </div>
        {doublon && (
          <p className="abonnes-doublon">
            Ce code est déjà enregistré{doublon.nom ? ` (« ${doublon.nom} »)` : ''}.
          </p>
        )}
        <input
          ref={fichier}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const blob = [...e.target.files].find((x) => x.type.startsWith('image/'))
            e.target.value = ''
            if (blob) setImage(blob)
          }}
        />
        <input
          ref={fichierPour}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const blob = [...e.target.files].find((x) => x.type.startsWith('image/'))
            e.target.value = ''
            if (blob && cible.current) modifier(cible.current, { blob })
            cible.current = null
          }}
        />
      </form>

      {iles && iles.length > 3 && (
        <Input.Search
          className="abonnes-filtre"
          allowClear
          placeholder="Filtrer par nom ou par code"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
        />
      )}

      {iles && !iles.length && (
        <div className="abonnes-vide">Aucune île pour l’instant : saisissez un code ci-dessus.</div>
      )}

      {visibles.length > 0 && (
        <Image.PreviewGroup>
          <ul className="abonnes-grille">
            {visibles.map((ile) => {
              const url = urlDe(ile)
              return (
                <li key={ile.id} className="abonne">
                  <div className="abonne-image">
                    {url ? (
                      <Image src={url} alt={ile.nom} />
                    ) : (
                      <button
                        type="button"
                        className="abonne-sans-image"
                        onClick={() => {
                          cible.current = ile
                          fichierPour.current?.click()
                        }}
                      >
                        + image
                      </button>
                    )}
                  </div>
                  <div className="abonne-corps">
                    <Typography.Text
                      className="abonne-code"
                      editable={{
                        text: ile.code,
                        maxLength: 9,
                        tooltip: 'Corriger le code',
                        onChange: (v) => codeComplet(v) && v !== ile.code && modifier(ile, { code: v }),
                      }}
                    >
                      {ile.code}
                    </Typography.Text>
                    <Typography.Text
                      className={`abonne-nom${ile.nom ? '' : ' sans-nom'}`}
                      editable={{
                        text: ile.nom,
                        maxLength: 80,
                        tooltip: 'Nommer',
                        onChange: (v) => v.trim() !== ile.nom && modifier(ile, { nom: v }),
                      }}
                    >
                      {ile.nom || 'Sans nom'}
                    </Typography.Text>
                    <div className="abonne-actions">
                      <button type="button" className="mini-btn" onClick={() => copier(ile)}>
                        Copier le code
                      </button>
                      {url && (
                        <button
                          type="button"
                          className="mini-btn"
                          onClick={() => {
                            cible.current = ile
                            fichierPour.current?.click()
                          }}
                        >
                          Changer l’image
                        </button>
                      )}
                      <Popconfirm
                        title="Supprimer cette île ?"
                        okText="Supprimer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => supprimer(ile)}
                      >
                        <button type="button" className="mini-btn">
                          Supprimer
                        </button>
                      </Popconfirm>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Image.PreviewGroup>
      )}

      {iles && iles.length > 0 && !visibles.length && <div className="abonnes-vide">Aucune île ne correspond.</div>}
    </div>
  )
}
