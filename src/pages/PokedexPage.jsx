import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input, Segmented, Select } from 'antd'
import { ICONE_HABITAT, IconeSpecialite } from '../components/Icones'
import { VignettePokemon } from '../components/Vignette'
import {
  FR_DEX,
  FR_HABITAT,
  FR_TYPE,
  comparerParNumero,
  frPokemon,
  pokemon,
  pokemonParNom,
  prefsParPokemon,
  specialitesUtilisees,
  typesUtilises,
} from '../data'
import { correspond, normaliser } from '../utils/recherche'
import './PokedexPage.css'

const TRIS = [
  { value: 'numero', label: 'Numéro' },
  { value: 'nom', label: 'Nom' },
  { value: 'prefs', label: 'Préférences' },
]

/** Les six habitats, dans l'ordre des paires (clair/sombre, humide/sec, chaud/froid). */
const HABITATS = ['Bright', 'Dark', 'Humid', 'Dry', 'Warm', 'Cool']

/**
 * Les 366 Pokémon de Pokopia, filtrables par Pokédex (principal, bassin DLC, événement),
 * habitat, type et spécialité.
 *
 * Le tri « Préférences » remonte les Pokémon les plus faciles à contenter — ceux qui
 * apprécient le plus de préférences différentes, donc le plus d'objets.
 */
export default function PokedexPage() {
  const navigate = useNavigate()
  // `?q=` comme point d'entrée, à l'image du catalogue : l'accueil y renvoie sa recherche.
  const [params] = useSearchParams()
  const [saisie, setSaisie] = useState(() => params.get('q') || '')
  const [tri, setTri] = useState('numero')
  const [habitat, setHabitat] = useState(null)
  const [type, setType] = useState(null)
  const [specialite, setSpecialite] = useState(null)
  const [dex, setDex] = useState(null)

  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())

  const liste = useMemo(() => {
    let noms = pokemon.map((p) => p.en)
    if (dex) noms = noms.filter((n) => (pokemonParNom.get(n)?.dex || 'principal') === dex)
    if (habitat) noms = noms.filter((n) => pokemonParNom.get(n)?.habitat === habitat)
    if (type) noms = noms.filter((n) => pokemonParNom.get(n)?.types?.includes(type))
    if (specialite) noms = noms.filter((n) => pokemonParNom.get(n)?.specialites?.includes(specialite))
    if (terme) noms = noms.filter((n) => correspond(terme, n, frPokemon(n)))

    if (tri === 'nom') noms.sort((a, b) => frPokemon(a).localeCompare(frPokemon(b), 'fr'))
    else if (tri === 'prefs')
      noms.sort(
        (a, b) =>
          (prefsParPokemon.get(b) || []).length - (prefsParPokemon.get(a) || []).length ||
          comparerParNumero(a, b),
      )
    else noms.sort(comparerParNumero)

    return noms
  }, [terme, tri, habitat, type, specialite, dex])

  /** Combien de Pokémon dans chacun des trois Pokédex — affiché dans le sélecteur. */
  const repartitionDex = useMemo(() => {
    const compte = {}
    for (const p of pokemon) compte[p.dex || 'principal'] = (compte[p.dex || 'principal'] || 0) + 1
    return compte
  }, [])

  const repartition = useMemo(() => {
    const compte = {}
    for (const p of pokemon) compte[p.habitat] = (compte[p.habitat] || 0) + 1
    return compte
  }, [])

  return (
    <>
      <div className="wrap page-tete">
        <div>
          <p className="etiquette">Pokédex</p>
          <h1>{pokemon.length} Pokémon</h1>
          <p className="liste-chapeau">
            Tous les Pokémon de l’île, des trois Pokédex. Filtrez par habitat, type ou
            spécialité ; chaque fiche donne ses préférences, ses objets les plus utiles et
            ses meilleurs colocataires.
          </p>
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
              placeholder="Chercher un Pokémon…"
              aria-label="Chercher un Pokémon"
            />
          </div>
          <Select
            allowClear
            size="large"
            value={dex}
            onChange={setDex}
            placeholder="Pokédex"
            aria-label="Filtrer par Pokédex"
            style={{ minWidth: 160 }}
            options={Object.entries(FR_DEX).map(([valeur, libelle]) => ({
              value: valeur,
              label: `${libelle} (${repartitionDex[valeur] || 0})`,
            }))}
          />
          <Select
            allowClear
            size="large"
            value={type}
            onChange={setType}
            placeholder="Type"
            aria-label="Filtrer par type"
            style={{ minWidth: 130 }}
            options={typesUtilises.map((t) => ({ value: t, label: FR_TYPE[t] || t }))}
          />
          <Select
            allowClear
            size="large"
            value={specialite}
            onChange={setSpecialite}
            placeholder="Spécialité"
            aria-label="Filtrer par spécialité"
            style={{ minWidth: 165 }}
            options={specialitesUtilisees.map((s) => ({
              value: s,
              label: (
                <span className="option-specialite">
                  <IconeSpecialite nom={s} />
                  {s}
                </span>
              ),
            }))}
          />
          <Segmented options={TRIS} value={tri} onChange={setTri} size="large" />
          <span className="statut">{liste.length} Pokémon</span>
        </div>
      </div>

      <div className="wrap pokedex">
        <div className="habitats">
          <button
            type="button"
            className="bascule reset"
            aria-pressed={habitat === null}
            onClick={() => setHabitat(null)}
          >
            Tous les habitats <b>{pokemon.length}</b>
          </button>
          {HABITATS.map((h) => {
            const IconeHab = ICONE_HABITAT[h]
            return (
              <button
                key={h}
                type="button"
                className="bascule teintee"
                style={{
                  '--teinte': `var(--h-${h.toLowerCase()})`,
                  '--teinte-fond': `var(--h-${h.toLowerCase()}-fond)`,
                }}
                aria-pressed={habitat === h}
                onClick={() => setHabitat(habitat === h ? null : h)}
              >
                <IconeHab />
                {FR_HABITAT[h]} <b>{repartition[h] || 0}</b>
              </button>
            )
          })}
        </div>

        {(type || specialite) && (
          <p className="note-source">
            Les types viennent du Pokédex de Pokébip, qui couvre 288 des 366 Pokémon : les
            autres — surtout des Pokémon aquatiques — n’apparaissent dans aucun filtre de
            type. Les spécialités couvrent tout le monde, sauf Ho-Oh, Kyogre, Lugia et
            Magicarpe, qui n’en ont pas.
          </p>
        )}

        {liste.length ? (
          <div className="chips">
            {liste.map((nom) => (
              <VignettePokemon
                key={nom}
                nom={nom}
                trouve={!!terme}
                onClick={() => navigate(`/pokedex/${encodeURIComponent(nom)}`)}
              />
            ))}
          </div>
        ) : (
          <div className="vide">
            <p>
              Aucun Pokémon ne correspond
              {habitat ? ` à l’habitat ${FR_HABITAT[habitat].toLowerCase()}` : ''}. La recherche
              accepte le français et l’anglais.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
