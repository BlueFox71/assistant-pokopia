import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input, Segmented } from 'antd'
import { VignetteObjet, VignettePokemon } from '../components/Vignette'
import { urlSpriteObjet, urlSpritePokemon } from '../data/images'
import {
  categorieDe,
  comparerParNumero,
  frObjet,
  frPokemon,
  habitatDe,
  preferences,
  prefParSlug,
  prefsParObjet,
  prefsParPokemon,
  spriteObjet,
  spritePokemon,
} from '../data'
import { correspond, normaliser } from '../utils/recherche'
import './IndexPage.css'

const VUES = [
  { value: 'tout', label: 'Objets + Pokémon' },
  { value: 'objets', label: 'Objets' },
  { value: 'pokemon', label: 'Pokémon' },
]

/** Une carte de préférence, dépliable. Mémoïsée : les 43 cartes traversent chaque frappe. */
const CartePreference = memo(function CartePreference({
  pref,
  ouverte,
  terme,
  vue,
  onBascule,
  onObjet,
  onPokemon,
  refCarte,
}) {
  const pokemonTries = useMemo(() => [...pref.pokemon].sort(comparerParNumero), [pref])

  return (
    <section ref={refCarte} className={'carte' + (ouverte ? ' est-ouverte' : '')}>
      <button type="button" className="carte-tete" aria-expanded={ouverte} onClick={onBascule}>
        <span className="carte-titre">
          {pref.fr}
          <span className="carte-en">{pref.en}</span>
        </span>
        <span className="carte-compteurs">
          <i>{pref.objets.length} obj.</i> · <em>{pref.pokemon.length} pkmn</em>
        </span>
        <span className="chevron" aria-hidden="true">
          ▸
        </span>
      </button>

      {ouverte && (
        <div className="carte-corps">
          {vue !== 'pokemon' && (
            <div className="bloc">
              <h3 className="etiquette">{pref.objets.length} objets qui comptent</h3>
              <div className="chips">
                {pref.objets.map((nom) => (
                  <VignetteObjet
                    key={nom}
                    nom={nom}
                    trouve={!!terme && correspond(terme, nom, frObjet(nom))}
                    onClick={() => onObjet(nom)}
                  />
                ))}
              </div>
            </div>
          )}
          {vue !== 'objets' && (
            <div className="bloc">
              <h3 className="etiquette">{pref.pokemon.length} Pokémon qui l’apprécient</h3>
              <div className="chips">
                {pokemonTries.map((nom) => (
                  <VignettePokemon
                    key={nom}
                    nom={nom}
                    trouve={!!terme && correspond(terme, nom, frPokemon(nom))}
                    onClick={() => onPokemon(nom)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
})

/**
 * Recherche inversée : « Coffre uni » coche six préférences, et c’est ce croisement qui
 * décide de poser l’objet. Les six premiers objets et les trois premiers Pokémon
 * correspondants sont détaillés au-dessus de la grille, avec leurs préférences en
 * raccourcis vers les cartes concernées.
 */
function RechercheInverse({ terme, onCarte, onObjet, onPokemon }) {
  const trouvailles = useMemo(() => {
    if (!terme) return null
    const objets = [...prefsParObjet.keys()]
      .filter((nom) => correspond(terme, nom, frObjet(nom)))
      .sort(
        (a, b) =>
          prefsParObjet.get(b).length - prefsParObjet.get(a).length ||
          frObjet(a).localeCompare(frObjet(b), 'fr'),
      )
    // Pour les Pokémon on reste sur le début du nom : « eau » ne doit pas remonter
    // trente Pokémon dont le nom contient la séquence.
    const pokemon = [...prefsParPokemon.keys()].filter((nom) => {
      const en = normaliser(nom)
      const fr = normaliser(frPokemon(nom))
      return en === terme || fr === terme || en.startsWith(terme) || fr.startsWith(terme)
    })
    return objets.length || pokemon.length ? { objets, pokemon } : null
  }, [terme])

  if (!trouvailles) return null

  const raccourcis = (slugs) => (
    <div className="inverse-tags">
      {slugs.map((slug) => (
        <button key={slug} type="button" className="chip-tag" onClick={() => onCarte(slug)}>
          {prefParSlug.get(slug).fr}
        </button>
      ))}
    </div>
  )

  return (
    <section className="inverse">
      <h2 className="etiquette">Un objet, plusieurs préférences</h2>

      {trouvailles.objets.slice(0, 6).map((nom) => {
        const slugs = prefsParObjet.get(nom)
        const categorie = categorieDe(nom)
        return (
          <div key={nom} className="inverse-ligne">
            <button type="button" className="inverse-tuile chip-tag" onClick={() => onObjet(nom)}>
              <img src={urlSpriteObjet(spriteObjet(nom))} alt="" width="34" height="34" />
              <span className="inverse-nom">{frObjet(nom)}</span>
            </button>
            <span className="inverse-note">
              coche {slugs.length} préférence{slugs.length > 1 ? 's' : ''}
              {categorie ? ` · ${categorie}` : ''}
              {frObjet(nom) === nom ? '' : ` · ${nom}`}
            </span>
            {raccourcis(slugs)}
          </div>
        )
      })}

      {trouvailles.pokemon.slice(0, 3).map((nom) => {
        const slugs = prefsParPokemon.get(nom)
        const habitat = habitatDe(nom)
        return (
          <div key={nom} className="inverse-ligne">
            <button
              type="button"
              className="inverse-tuile chip-tag"
              title={`Voir les objets pour ${frPokemon(nom)}`}
              onClick={() => onPokemon(nom)}
            >
              <img src={urlSpritePokemon(spritePokemon(nom))} alt="" width="34" height="34" />
              <span className="inverse-nom">{frPokemon(nom)}</span>
            </button>
            <span className="inverse-note">
              aime {slugs.length} préférence{slugs.length > 1 ? 's' : ''}
              {habitat ? ` · habitat ${habitat.toLowerCase()}` : ''}
            </span>
            {raccourcis(slugs)}
          </div>
        )
      })}

      {trouvailles.objets.length > 6 && (
        <p className="inverse-reste">
          + {trouvailles.objets.length - 6} autres objets correspondent — précisez le terme.
        </p>
      )}
    </section>
  )
}

export default function IndexPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // ?q= sert de point d'entrée depuis l'accueil ; ensuite le champ vit sa vie, sans réécrire
  // l'URL à chaque frappe — ça remplirait l'historique du navigateur.
  const [saisie, setSaisie] = useState(() => params.get('q') || '')
  const [vue, setVue] = useState('tout')
  const [depliees, setDepliees] = useState(() => new Set())
  const [toutDeplie, setToutDeplie] = useState(false)
  const cartes = useRef(new Map())

  // La frappe reste fluide même toutes cartes dépliées : le filtrage travaille sur la
  // valeur différée, le champ sur la valeur immédiate.
  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())

  const allerObjet = useCallback((nom) => navigate(`/objet/${encodeURIComponent(nom)}`), [navigate])
  const allerPokemon = useCallback(
    (nom) => navigate(`/habitat?pokemon=${encodeURIComponent(nom)}`),
    [navigate],
  )

  const resultats = useMemo(() => {
    let objetsTrouves = 0
    let pokemonTrouves = 0
    const visibles = []

    for (const pref of preferences) {
      const titreTrouve = !!terme && correspond(terme, pref.en, pref.fr)
      const objets = terme ? pref.objets.filter((n) => correspond(terme, n, frObjet(n))) : []
      const pokemon = terme ? pref.pokemon.filter((n) => correspond(terme, n, frPokemon(n))) : []
      objetsTrouves += objets.length
      pokemonTrouves += pokemon.length
      if (terme && !titreTrouve && !objets.length && !pokemon.length) continue
      // Une carte retenue pour son contenu s’ouvre d’office : sinon la correspondance
      // resterait cachée derrière un titre replié.
      visibles.push({ pref, ouvertureForcee: !!terme && !titreTrouve })
    }
    return { visibles, objetsTrouves, pokemonTrouves }
  }, [terme])

  const basculer = useCallback(
    (slug) => {
      setDepliees((precedent) => {
        // « Tout déplier » est un état global : le premier clic sur une carte le convertit
        // en sélection explicite, sinon replier une carte les replierait toutes.
        const base = toutDeplie ? new Set(preferences.map((p) => p.slug)) : new Set(precedent)
        if (base.has(slug)) base.delete(slug)
        else base.add(slug)
        return base
      })
      setToutDeplie(false)
    },
    [toutDeplie],
  )

  const versCarte = useCallback((slug) => {
    setDepliees((precedent) => new Set(precedent).add(slug))
    // Le dépliage n’est appliqué qu’au rendu suivant : on laisse passer une frame.
    requestAnimationFrame(() =>
      cartes.current.get(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }, [])

  const nb = resultats.visibles.length
  const statut = terme
    ? `${nb} préférence${nb > 1 ? 's' : ''} · ${resultats.objetsTrouves} objet${resultats.objetsTrouves > 1 ? 's' : ''} · ${resultats.pokemonTrouves} Pokémon`
    : `${prefsParObjet.size} objets indexés`

  return (
    <>
      <div className="intro">
        <div className="wrap intro-inner">
          <div>
            <p className="etiquette">Pokémon Pokopia · aménagement</p>
            <h1>Index des préférences</h1>
            <p className="chapeau">
              Les 43 préférences du jeu, chacune avec la liste complète des objets qui la
              satisfont et des Pokémon qui l’apprécient. Cherchez un objet pour voir toutes
              les préférences qu’il coche — ou ouvrez un Pokémon pour obtenir, à l’inverse,
              tous les objets qui lui plaisent.
            </p>
          </div>
          <div className="totaux">
            <span>
              <b>{preferences.length}</b>préférences
            </span>
            <span>
              <b>{prefsParObjet.size}</b>objets distincts
            </span>
            <span>
              <b>{prefsParPokemon.size}</b>Pokémon
            </span>
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="wrap controls-inner">
          <div className="field">
            <Input
              allowClear
              size="large"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Chercher un objet, un Pokémon ou une préférence…"
              aria-label="Recherche"
            />
          </div>
          <Segmented options={VUES} value={vue} onChange={setVue} size="large" />
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setToutDeplie((v) => !v)
              setDepliees(new Set())
            }}
          >
            {toutDeplie ? 'Tout replier' : 'Tout déplier'}
          </button>
          <span className="statut">{statut}</span>
        </div>
      </div>

      <div className="wrap">
        <RechercheInverse
          terme={terme}
          onCarte={versCarte}
          onObjet={allerObjet}
          onPokemon={allerPokemon}
        />

        <div className="grille">
          {resultats.visibles.map(({ pref, ouvertureForcee }) => (
            <CartePreference
              key={pref.slug}
              pref={pref}
              vue={vue}
              terme={terme}
              ouverte={toutDeplie || depliees.has(pref.slug) || ouvertureForcee}
              onBascule={() => basculer(pref.slug)}
              onObjet={allerObjet}
              onPokemon={allerPokemon}
              refCarte={(el) => {
                if (el) cartes.current.set(pref.slug, el)
                else cartes.current.delete(pref.slug)
              }}
            />
          ))}
        </div>

        {!nb && (
          <div className="vide">
            <p>
              Aucune correspondance. La recherche accepte le français et l’anglais — essayez
              un autre terme.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
