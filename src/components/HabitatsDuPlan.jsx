import { useMemo, useState } from 'react'
import { Checkbox, Input, Popover } from 'antd'
import {
  FR_HABITAT,
  MAX_COLOCATAIRES,
  comparerParNumero,
  frPokemon,
  habitatDe,
  logeable,
  numeroAffiche,
  pokemonParNom,
  prefsParPokemon,
  spritePokemon,
} from '../data'
import { urlSpritePokemon } from '../data/images'
import { correspond, normaliser } from '../utils/recherche'
import { ICONE_HABITAT } from './Icones'
import { TEINTES_HABITAT } from '../utils/planPerso'
import { cleVilleDe, nomVille, useAttributions, useNomsVilles } from '../utils/villesStorage'

/**
 * Le nom d'un habitat du plan : les Pokémon qu'on y prévoit, « Bulbizarre et Salamèche ».
 * Vide, il garde son numéro.
 */
export function nomHabitat(h, occupants) {
  const noms = (occupants.get(h.cle) ?? []).filter((n) => pokemonParNom.has(n)).map(frPokemon)
  if (!noms.length) return `Habitat ${h.numero}`
  return noms.length === 1 ? noms[0] : `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`
}

/** Tous les Pokémon qu'on peut loger, dans l'ordre du Pokédex : la liste du sélecteur. */
const CANDIDATS = [...prefsParPokemon.keys()].filter(logeable).sort(comparerParNumero)

/**
 * Les habitats valides d'un plan, numérotés comme sur la grille, et les Pokémon qu'on y
 * prévoit.
 *
 * C'est un projet : rien ici n'écrit dans « Mes habitats ». Un Pokémon déjà logé dans une
 * fiche habitat peut donc figurer dans un plan — c'est justement le cas d'un
 * réaménagement. Au sein d'un même plan, en revanche, il n'occupe qu'un habitat : le
 * choisir ailleurs l'y déplace.
 *
 * @param {{ habitats: { cle: string, numero: number, largeur: number, longueur: number }[],
 *           occupants: Map<string, string[]>, onChanger: (occupants: Map<string, string[]>) => void,
 *           survole: string | null, setSurvole: (cle: string | null) => void,
 *           plusieursNiveaux?: boolean, lieu?: string | null,
 *           teintes?: Map<string, string>, onTeinter?: (cle: string, teinte: string | null) => void }} props
 *
 * `lieu`, la ville du plan, restreint les Pokémon proposés à ceux qui y vivent — ville de
 * rattachement, réattributions comprises (cf. villesStorage.js).
 */
export default function HabitatsDuPlan({
  habitats,
  occupants,
  onChanger,
  survole,
  setSurvole,
  plusieursNiveaux = false,
  lieu = null,
  teintes = new Map(),
  onTeinter,
  spritesGrille,
  onSpritesGrille,
}) {
  /** Où loge chaque Pokémon de ce plan, pour le signaler dans les autres sélecteurs. */
  const logeDans = useMemo(() => {
    const table = new Map()
    for (const h of habitats) for (const n of occupants.get(h.cle) ?? []) table.set(n, h.numero)
    return table
  }, [habitats, occupants])

  if (!habitats.length) return null

  /** Une seule table rendue par geste : un seul Ctrl+Z défait un déménagement entier. */
  const poser = (h, noms, depuis = null, nom = null) => {
    const suivante = new Map(occupants)
    if (depuis) suivante.set(depuis.cle, suivante.get(depuis.cle).filter((n) => n !== nom))
    suivante.set(h.cle, noms)
    for (const [k, liste] of suivante) if (!liste.length) suivante.delete(k)
    onChanger(suivante)
  }

  const ajouter = (h, nom) => {
    const actuels = occupants.get(h.cle) ?? []
    if (actuels.includes(nom) || actuels.length >= MAX_COLOCATAIRES) return
    // Déjà prévu dans un autre habitat du plan : il déménage, il ne se dédouble pas.
    const ailleurs = habitats.find((a) => a.cle !== h.cle && (occupants.get(a.cle) ?? []).includes(nom))
    poser(h, [...actuels, nom], ailleurs, nom)
  }

  return (
    <section className="habitats-plan" aria-label="Habitats prévus du plan">
      <div className="habitats-plan-tete">
        <h3 className="etiquette">Habitats prévus</h3>
        {onSpritesGrille && (
          <Checkbox className="coche-sprites" checked={spritesGrille} onChange={(e) => onSpritesGrille(e.target.checked)}>
            Sur la grille
          </Checkbox>
        )}
      </div>
      <ol className="habitats-plan-liste">
        {habitats.map((h) => {
          const noms = (occupants.get(h.cle) ?? []).filter((n) => pokemonParNom.has(n))
          const ambiances = [...new Set(noms.map((n) => pokemonParNom.get(n).habitat).filter(Boolean))]
          const plein = noms.length >= MAX_COLOCATAIRES
          return (
            <li
              key={h.cle}
              className={'habitat-plan' + (survole === h.cle ? ' survole' : '')}
              onMouseEnter={() => setSurvole(h.cle)}
              onMouseLeave={() => setSurvole(null)}
            >
              <div className="habitat-plan-tete">
                <ChoixTeinte numero={h.numero} teinte={teintes.get(h.cle) ?? null} onChoisir={(t) => onTeinter?.(h.cle, t)} />
                <span className="habitat-plan-numero">{h.numero}</span>
                {noms.length > 0 && <span className="habitat-plan-nom">{nomHabitat(h, occupants)}</span>}
                <span className="habitat-plan-dims">
                  {h.largeur} × {h.longueur}
                  {plusieursNiveaux ? ` · niveau ${h.niveau + 1}` : ''}
                </span>
                {ambiances.length === 1 && <MarqueAmbiance cle={ambiances[0]} />}
                {ambiances.length > 1 && (
                  <span className="habitat-plan-alerte" title="Un même enclos n’offre qu’une ambiance">
                    Ambiances mêlées
                  </span>
                )}
              </div>

              {/* Les sprites, puis le « + » à la suite du dernier : on ajoute là où la liste s'arrête. */}
              <ul className="habitat-plan-pokemon">
                  {noms.map((n) => (
                    <li key={n} title={`${frPokemon(n)}${habitatDe(n) ? ` · ${habitatDe(n).toLowerCase()}` : ''}`}>
                      <img src={urlSpritePokemon(spritePokemon(n))} alt={frPokemon(n)} width="48" height="48" />
                      <button
                        type="button"
                        className="retirer"
                        aria-label={`Retirer ${frPokemon(n)} de l’habitat ${h.numero}`}
                        onClick={() => poser(h, noms.filter((m) => m !== n))}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                {!plein && (
                  <li className="habitat-plan-ajout">
                    <ChoixPokemon
                      lieu={lieu}
                      numero={h.numero}
                      exclus={noms}
                      logeDans={logeDans}
                      restant={MAX_COLOCATAIRES - noms.length}
                      onChoisir={(nom) => ajouter(h, nom)}
                    />
                  </li>
                )}
              </ul>
              {plein && <span className="note-max">{MAX_COLOCATAIRES} Pokémon maximum</span>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/**
 * La couleur d'un habitat : une pastille à sa couleur, qui ouvre la palette au clic. Le
 * premier choix rend le vert ordinaire des habitats.
 */
function ChoixTeinte({ numero, teinte, onChoisir }) {
  const [ouvert, setOuvert] = useState(false)
  const nom = TEINTES_HABITAT.find((t) => t.id === teinte)?.nom ?? 'par défaut'
  const choisir = (t) => {
    onChoisir(t)
    setOuvert(false)
  }
  const palette = (
    <div className="palette-teintes" role="radiogroup" aria-label={`Couleur de l’habitat ${numero}`}>
      <button
        type="button"
        role="radio"
        aria-checked={!teinte}
        className={'pastille-teinte' + (!teinte ? ' choisie' : '')}
        title="Couleur par défaut"
        aria-label="Couleur par défaut"
        onClick={() => choisir(null)}
      />
      {TEINTES_HABITAT.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={teinte === t.id}
          className={`pastille-teinte teinte-${t.id}` + (teinte === t.id ? ' choisie' : '')}
          title={t.nom}
          aria-label={t.nom}
          onClick={() => choisir(t.id)}
        />
      ))}
    </div>
  )
  return (
    <Popover open={ouvert} onOpenChange={setOuvert} trigger="click" placement="bottomLeft" content={palette}>
      <button
        type="button"
        className={'pastille-teinte habitat-plan-teinte' + (teinte ? ` teinte-${teinte}` : '')}
        title={`Couleur de l’habitat : ${nom.toLowerCase()} — cliquez pour la changer`}
        aria-label={`Couleur de l’habitat ${numero} : ${nom}`}
      />
    </Popover>
  )
}

/**
 * Choisir un Pokémon à loger : un bouton qui ouvre la grille de leurs sprites, dans l'ordre
 * du Pokédex, avec une recherche au-dessus. La grille reste ouverte pour en ajouter
 * plusieurs d'affilée, et se referme quand l'habitat est plein. Le nom, le numéro,
 * l'ambiance et l'habitat du plan où il loge déjà sont dans l'infobulle de chaque sprite.
 *
 * Un plan qui a un lieu ne propose que les Pokémon de cette ville ; un lien lève le filtre,
 * le temps d'un choix.
 */
function ChoixPokemon({ lieu, numero, exclus, logeDans, restant, onChoisir }) {
  const [ouvert, setOuvert] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [tous, setTous] = useState(false)
  const attributions = useAttributions()
  const nomsVilles = useNomsVilles()
  const filtre = lieu && !tous
  const q = normaliser(saisie.trim())
  const liste = CANDIDATS.filter(
    (n) =>
      !exclus.includes(n) &&
      (!filtre || cleVilleDe(attributions, n) === lieu) &&
      (!q || correspond(q, n, frPokemon(n))),
  )

  const choisir = (nom) => {
    onChoisir(nom)
    if (restant <= 1) setOuvert(false)
  }

  const grille = (
    <div className="choix-pokemon">
      <Input
        size="small"
        autoFocus
        allowClear
        placeholder="Rechercher un Pokémon…"
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        aria-label="Rechercher un Pokémon"
      />
      {lieu && (
        <div className="choix-pokemon-lieu">
          <span>{filtre ? `Pokémon de ${nomVille(nomsVilles, lieu)}` : 'Toutes les villes'}</span>
          <button type="button" className="mini-btn" onClick={() => setTous(!tous)}>
            {filtre ? 'Voir tous' : `Seulement ${nomVille(nomsVilles, lieu)}`}
          </button>
        </div>
      )}
      {liste.length ? (
        <div className="choix-pokemon-grille">
          {liste.map((n) => {
            const infos = `${frPokemon(n)} · ${numeroAffiche(n)}${habitatDe(n) ? ` · ${habitatDe(n).toLowerCase()}` : ''}${
              logeDans.has(n) ? ` — déjà dans l’habitat ${logeDans.get(n)}, il y déménagera` : ''
            }`
            return (
              <button
                key={n}
                type="button"
                className={'choix-pokemon-case' + (logeDans.has(n) ? ' ailleurs' : '')}
                title={infos}
                aria-label={`Ajouter ${infos}`}
                onClick={() => choisir(n)}
              >
                <img src={urlSpritePokemon(spritePokemon(n))} alt="" width="40" height="40" loading="lazy" />
              </button>
            )
          })}
        </div>
      ) : (
        <p className="choix-pokemon-vide">Aucun Pokémon ne correspond.</p>
      )}
    </div>
  )

  return (
    <Popover
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o)
        // Le filtre revient à chaque ouverture : « voir tous » vaut pour un choix.
        if (!o) setTous(false)
      }}
      trigger="click" placement="leftTop" content={grille}>
      <button
        type="button"
        className="habitat-plan-choix"
        title="Ajouter un Pokémon"
        aria-label={`Ajouter un Pokémon à l’habitat ${numero}`}
      >
        +
      </button>
    </Popover>
  )
}

function MarqueAmbiance({ cle, petite = false }) {
  const Icone = ICONE_HABITAT[cle]
  return (
    <span className={'marque-habitat hab-' + cle + (petite ? ' petite' : '')}>
      {Icone && <Icone />}
      {FR_HABITAT[cle]?.toLowerCase()}
    </span>
  )
}
