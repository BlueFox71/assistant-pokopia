import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Checkbox, Input, Segmented, Select } from 'antd'
import { urlSpriteMethode } from '../data/images'
import { filtrerMethodes } from '../data/filtreMethodes'
import { FAMILLES, FR_SOURCE, cleFiltre, libelleSource, methodes, nomsMethodes } from '../data/methodes'
import { VILLES } from '../data/villes'
import { basculer, exporterMethodes, importerMethodes, useConnues } from '../utils/methodesStorage'
import { normaliser } from '../utils/recherche'
import { nomVille, useNomsVilles } from '../utils/villesStorage'
import './MethodesPage.css'

const VIDE = new Set()

/**
 * Afficher ou non, sous chaque vignette, où obtenir la méthode. Retenu d'une visite à
 * l'autre, comme les réglages de la grille du plan : sans les sources, la grille se
 * resserre, ce qu'on veut pour cocher vite ce qu'on reconnaît d'un coup d'œil.
 */
const CLE_SOURCES = 'pokopia:methodes-sources'
const lireSources = () => {
  try {
    return localStorage.getItem(CLE_SOURCES) !== 'non'
  } catch {
    return true
  }
}

const VUES = [
  { value: 'a-trouver', label: 'À trouver' },
  { value: 'connues', label: 'Connues' },
  { value: 'toutes', label: 'Toutes' },
]

/**
 * Les méthodes de fabrication, à cocher.
 *
 * La boutique du PC finit par ne plus proposer que des méthodes déjà connues, et le jeu ne
 * dit jamais combien il en reste. Cette page tient le compte : on coche ce qu'on connaît, et
 * « À trouver » dit, pour le reste, où chercher — la boutique de quelle ville à quel niveau,
 * l'offre du jour, les remous, un palier du Pokédex.
 */
export default function MethodesPage() {
  const [params, setParams] = useSearchParams()
  const connues = useConnues()
  const noms = useNomsVilles()
  const [saisie, setSaisie] = useState(() => params.get('q') || '')
  const [sauvegarde, setSauvegarde] = useState(null)
  const [message, setMessage] = useState('')
  const [avecSources, setAvecSources] = useState(lireSources)
  const changerSources = (oui) => {
    setAvecSources(oui)
    try {
      if (oui) localStorage.removeItem(CLE_SOURCES)
      else localStorage.setItem(CLE_SOURCES, 'non')
    } catch {
      /* le réglage vaut au moins pour la session */
    }
  }

  const vue = VUES.some((v) => v.value === params.get('vue')) ? params.get('vue') : 'a-trouver'
  const famille = params.get('famille') || null
  const source = params.get('source') || null

  /** Change un paramètre de l'URL sans empiler l'historique : un lien partagé rouvre la même vue. */
  const regler = (cle, valeur) =>
    setParams(
      (p) => {
        const suivant = new URLSearchParams(p)
        if (valeur) suivant.set(cle, valeur)
        else suivant.delete(cle)
        return suivant
      },
      { replace: true },
    )

  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())
  const ville = (cle) => nomVille(noms, cle)

  const nbConnues = useMemo(() => [...connues].filter((n) => nomsMethodes.has(n)).length, [connues])

  /** Les sources proposées au filtre, avec leur effectif : la boutique se détaille par ville. */
  const optionsSource = useMemo(() => {
    const compte = new Map()
    for (const m of methodes) {
      const cles = new Set(m.sources.map(cleFiltre))
      if (m.sources.some((s) => s.type === 'boutique')) cles.add('boutique')
      for (const c of cles) compte.set(c, (compte.get(c) || 0) + 1)
    }
    const options = []
    for (const type of Object.keys(FR_SOURCE)) {
      if (compte.has(type)) options.push({ value: type, label: `${FR_SOURCE[type]} (${compte.get(type)})` })
      if (type === 'boutique')
        for (const v of VILLES) {
          const c = `boutique-${v.cle}`
          if (compte.has(c)) options.push({ value: c, label: `   Boutique – ${ville(v.cle)} (${compte.get(c)})` })
        }
    }
    return options
  }, [noms])

  // Ce qu'on coche en « À trouver » reste affiché tant que la vue ne change pas : la liste
  // ne remonte pas sous le pointeur, et une coche de travers se défait sur place.
  const cleVue = `${vue}|${famille}|${source}|${terme}`
  const [cochees, setCochees] = useState({ cle: cleVue, noms: new Set() })
  const gardees = cochees.cle === cleVue ? cochees.noms : VIDE

  const cocher = (en, oui) => {
    basculer(en, oui)
    if (oui && vue === 'a-trouver')
      setCochees((c) => ({ cle: cleVue, noms: new Set([...(c.cle === cleVue ? c.noms : []), en]) }))
  }

  const liste = useMemo(
    () => filtrerMethodes(methodes, { vue, connues, gardees, famille, source, terme }),
    [vue, famille, source, terme, connues, gardees],
  )

  /** Les groupes par famille, dans l'ordre de Serebii ; triée par niveau, la liste reste d'un tenant. */
  const groupes = useMemo(() => {
    if (source?.startsWith('boutique-')) return [{ cle: 'niveau', libelle: null, methodes: liste }]
    return FAMILLES.map((f) => ({ ...f, methodes: liste.filter((m) => m.famille === f.cle) })).filter(
      (g) => g.methodes.length,
    )
  }, [liste, source])

  const total = methodes.length
  const pourcent = total ? Math.round((nbConnues / total) * 100) : 0

  return (
    <>
      <div className="wrap page-tete">
        <div>
          <p className="etiquette">Méthodes</p>
          <h1>
            {nbConnues} / {total} connues
          </h1>
          <div className="methodes-jauge" role="progressbar" aria-valuenow={pourcent} aria-valuemin={0} aria-valuemax={100} aria-label="Méthodes connues">
            <span style={{ width: `${pourcent}%` }} />
          </div>
          <p className="liste-chapeau">
            Cochez les méthodes de fabrication que vous connaissez déjà. « À trouver » dit où
            chercher les autres : la boutique du PC d’une ville à un niveau donné, son offre du
            jour, les remous scintillants, un palier du Pokédex ou l’histoire.
          </p>
        </div>
        <div className="liste-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setMessage('')
              setSauvegarde(sauvegarde === null ? exporterMethodes() : null)
            }}
            aria-expanded={sauvegarde !== null}
          >
            Exporter / importer
          </button>
        </div>
      </div>

      <div className="controls">
        <div className="wrap controls-inner">
          <div className="field">
            <Input
              allowClear
              size="large"
              value={saisie}
              onChange={(e) => {
                setSaisie(e.target.value)
                regler('q', e.target.value.trim())
              }}
              placeholder="Chercher une méthode…"
              aria-label="Chercher une méthode"
            />
          </div>
          <Segmented options={VUES} value={vue} onChange={(v) => regler('vue', v === 'a-trouver' ? null : v)} size="large" />
          <Select
            allowClear
            size="large"
            value={famille}
            onChange={(v) => regler('famille', v)}
            placeholder="Famille"
            aria-label="Filtrer par famille"
            style={{ minWidth: 160 }}
            options={FAMILLES.map((f) => ({
              value: f.cle,
              label: `${f.libelle} (${methodes.filter((m) => m.famille === f.cle).length})`,
            }))}
          />
          <Select
            allowClear
            size="large"
            value={source}
            onChange={(v) => regler('source', v)}
            placeholder="Où l’obtenir"
            aria-label="Filtrer par source"
            style={{ minWidth: 230 }}
            popupMatchSelectWidth={false}
            options={optionsSource}
          />
          <Checkbox checked={avecSources} onChange={(e) => changerSources(e.target.checked)}>
            Afficher où l’obtenir
          </Checkbox>
          <span className="statut">{liste.length} méthodes</span>
        </div>
      </div>

      <div className="wrap methodes">
        {sauvegarde !== null && (
          <section className="panneau-sauvegarde">
            <h2 className="etiquette">Exporter / importer les méthodes connues</h2>
            <p className="indice">
              Vos coches, au format JSON : conservez-les quelque part, ou collez-les dans une
              autre installation. Un import <b>ajoute</b> ses coches aux vôtres et n’en retire
              aucune.
            </p>
            <textarea
              className="zone-sauvegarde"
              value={sauvegarde}
              spellCheck={false}
              aria-label="Sauvegarde des méthodes connues, au format JSON"
              onChange={(e) => setSauvegarde(e.target.value)}
            />
            <div className="actions-sauvegarde">
              <button
                type="button"
                className="ghost-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(sauvegarde)
                    setMessage('Copié dans le presse-papier.')
                  } catch {
                    setMessage('Copie impossible : sélectionnez le texte et copiez-le à la main.')
                  }
                }}
              >
                Copier
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  const r = importerMethodes(sauvegarde)
                  setMessage(
                    r.erreur ||
                      `${r.ajoutees} méthode${r.ajoutees > 1 ? 's' : ''} ajoutée${r.ajoutees > 1 ? 's' : ''}` +
                        (r.deja ? `, ${r.deja} déjà cochée${r.deja > 1 ? 's' : ''}` : '') +
                        '.',
                  )
                }}
              >
                Importer
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setSauvegarde(exporterMethodes())
                  setMessage('')
                }}
              >
                Réafficher l’export
              </button>
              {message && <span className="message-sauvegarde">{message}</span>}
            </div>
          </section>
        )}

        {groupes.length ? (
          groupes.map((g) => (
            <section key={g.cle} className="methodes-groupe">
              {g.libelle && (
                <h2 className="etiquette">
                  {g.libelle} <b>{g.methodes.length}</b>
                </h2>
              )}
              <div className="chips methodes-grille">
                {g.methodes.map((m) => (
                  <Tuile
                    key={m.en}
                    m={m}
                    connue={connues.has(m.en)}
                    ville={ville}
                    cocher={cocher}
                    avecSources={avecSources}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="vide">
            <p>
              {vue === 'a-trouver' && !terme && !famille && !source
                ? 'Toutes les méthodes sont cochées : il ne vous en reste aucune à trouver.'
                : 'Aucune méthode ne correspond. La recherche accepte le français et l’anglais.'}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Une méthode, en vignette : un clic la coche ou la décoche — c'est le geste qu'on répète,
 * il prend toute la surface. Connue, elle porte le liseré et la coche de la sélection
 * d'habitat. La fiche de l'objet, quand il en a une, est un lien à part, sous les sources.
 */
function Tuile({ m, connue, ville, cocher, avecSources }) {
  const url = urlSpriteMethode(m)
  return (
    <div className={`chip methode-tuile${connue ? ' sel' : ''}`}>
      <button
        type="button"
        className="methode-bouton"
        aria-pressed={connue}
        title={connue ? 'Connue — cliquer pour la décocher' : 'À trouver — cliquer pour la cocher'}
        onClick={() => cocher(m.en, !connue)}
      >
        {url ? <img src={url} alt="" width={56} height={56} loading="lazy" /> : <span className="methode-sans-image" />}
        <span className="chip-name">{m.fr}</span>
        {m.fr !== m.en && (
          <span className="chip-en" lang="en">
            {m.en}
          </span>
        )}
      </button>
      {avecSources && (
        <ul className="methode-sources">
          {m.sources.map((s, i) => (
            <li key={i} className={`source source-${s.type}`} title={s.texte}>
              {libelleSource(s, ville)}
            </li>
          ))}
        </ul>
      )}
      {m.objet && (
        <Link className="methode-fiche" to={`/objet/${encodeURIComponent(m.objet)}`}>
          fiche
        </Link>
      )}
    </div>
  )
}
