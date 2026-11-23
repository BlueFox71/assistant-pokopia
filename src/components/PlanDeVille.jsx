import { useMemo, useState } from 'react'
import { Checkbox, Segmented } from 'antd'
import { frPokemon, pokemonParNom, spritePokemon } from '../data'
import { urlSpritePokemon } from '../data/images'
import { habitatDuPokemon } from '../utils/habitatsStorage'
import { TYPES_BLOC, TYPE_DEFAUT, analyserEnclos } from '../utils/planPerso'
// Les couleurs des blocs et des habitats : celles de la grille du plan personnalisé.
import '../pages/ConstructionPage.css'
import './PlanDeVille.css'

const niveauxDe = (plan) => [plan, ...(plan.etages ?? [])]
const nomNiveau = (i) => (i === 0 ? 'Sol' : `Étage ${i}`)

/** Un tracé SVG d'une case par élément « x,y ». */
const chemin = (liste) => {
  let d = ''
  for (const k of liste) {
    const [x, y] = k.split(',')
    d += `M${x} ${y}h1v1h-1z`
  }
  return d
}

/** Le niveau du premier habitat qui prévoit l'un de ces Pokémon, sinon le sol. */
function niveauDe(plan, noms) {
  if (!plan || !noms.length) return 0
  const i = niveauxDe(plan).findIndex((n) =>
    Object.values(n.occupants ?? {}).some((liste) => liste.some((p) => noms.includes(p))),
  )
  return Math.max(0, i)
}

/** Les plans qui prévoient au moins un de ces Pokémon, dans un habitat de n'importe quel niveau. */
export const plansAvec = (plans, noms) =>
  plans.filter((plan) =>
    niveauxDe(plan).some((n) =>
      Object.values(n.occupants ?? {}).some((liste) => liste.some((p) => noms.includes(p))),
    ),
  )

/**
 * Le carré à afficher : les blocs de tous les niveaux et une case de marge, plutôt que toute
 * la grille — un petit plan dessiné dans un coin y gagne en taille, et ses sprites avec.
 * Le même pour chaque niveau, pour que changer d'étage ne fasse pas sauter le dessin.
 */
function cadrer(plan) {
  const toutes = niveauxDe(plan).flatMap((n) => n.cases)
  if (!toutes.length) return { x: 0, y: 0, cote: plan.cote }
  const xs = toutes.map((k) => Number(k.split(',')[0]))
  const ys = toutes.map((k) => Number(k.split(',')[1]))
  const [x0, x1, y0, y1] = [Math.min(...xs) - 1, Math.max(...xs) + 2, Math.min(...ys) - 1, Math.max(...ys) + 2]
  const cote = Math.max(x1 - x0, y1 - y0)
  return { x: (x0 + x1 - cote) / 2, y: (y0 + y1 - cote) / 2, cote }
}

/**
 * Les sprites d'un habitat, le plus grands possible : on essaie 1 rangée, 2, 3…, et on
 * garde celle qui donne la plus grande taille, le groupe centré dans l'intérieur.
 */
function disposer(a) {
  const n = a.occupants.length
  if (!n) return { cote: 0, places: [] }
  const marge = 0.15
  let mieux = { cote: 0, rangees: 1, colonnes: n }
  for (let rangees = 1; rangees <= n; rangees++) {
    const colonnes = Math.ceil(n / rangees)
    const cote = Math.min((a.largeur - 2 * marge) / colonnes, (a.longueur - 2 * marge) / rangees, 2.6)
    if (cote > mieux.cote) mieux = { cote, rangees, colonnes }
  }
  const { cote, rangees, colonnes } = mieux
  const x0 = a.x + (a.largeur - colonnes * cote) / 2
  const y0 = a.y + (a.longueur - rangees * cote) / 2
  return {
    cote,
    places: a.occupants.map((_, i) => ({ x: x0 + (i % colonnes) * cote, y: y0 + Math.floor(i / colonnes) * cote })),
  }
}

/**
 * Les habitats valides de tout le plan, numérotés comme sur la grille du plan personnalisé :
 * niveau après niveau, et dans chacun de haut en bas puis de gauche à droite.
 */
function numeroter(plan) {
  let numero = 0
  return niveauxDe(plan).flatMap((n, niveau) => {
    const blocs = new Set(n.cases)
    return n.habitats
      .map((k) => {
        const [x, y] = k.split(',').map(Number)
        return { cle: k, ...analyserEnclos(blocs, plan.cote, { x, y }) }
      })
      .filter((a) => a.statut === 'ok')
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((a) => ({
        ...a,
        niveau,
        numero: ++numero,
        occupants: (n.occupants?.[a.cle] ?? []).filter((p) => pokemonParNom.has(p)),
        teinte: n.teintes?.[a.cle] ?? null,
      }))
  })
}

/**
 * Le plan personnalisé d'une ville, en lecture seule : on le garde sous les yeux pendant
 * qu'on compose un habitat. Plusieurs plans pour la ville, ou plusieurs niveaux : un choix
 * au-dessus de la grille.
 *
 * « Sans habitat seulement » grise les Pokémon prévus qui ont déjà une fiche dans Mes
 * habitats : restent vifs ceux qu'il reste à loger. Survoler une carte de la liste fait
 * briller son habitat sur la grille.
 *
 * @param {{ plans: object[], mesHabitats: object[], sansHabitatInitial?: boolean }} props
 *   `plans` : les plans enregistrés dont le lieu est la ville ; `mesHabitats` : les fiches
 *   de Mes habitats. `onCreer(noms)`, s'il est donné, ajoute à chaque carte un bouton qui
 *   crée l'habitat de ses Pokémon qui n'en ont pas encore.
 */
export default function PlanDeVille({ plans, mesHabitats, sansHabitatInitial = false, enAvant = [], onCreer }) {
  const [planId, setPlanId] = useState(plans[0]?.id)
  const plan = plans.find((p) => p.id === planId) ?? plans[0]
  // Ouvert depuis une fiche, le plan s'ouvre au niveau de l'habitat du Pokémon.
  const [niveauChoisi, setNiveau] = useState(() => (plans[0] ? niveauDe(plans[0], enAvant) : 0))
  const [sansHabitat, setSansHabitat] = useState(sansHabitatInitial)
  const [survole, setSurvole] = useState(null)

  const habitats = useMemo(() => (plan ? numeroter(plan) : []), [plan])
  if (!plan) return null

  const niveaux = niveauxDe(plan)
  const niveau = Math.min(niveauChoisi, niveaux.length - 1)
  const { cases, couleurs = {} } = niveaux[niveau]
  const ici = habitats.filter((a) => a.niveau === niveau)
  const cadre = cadrer(plan)
  const loge = (p) => Boolean(habitatDuPokemon(mesHabitats, p))
  const grise = (p) => sansHabitat && loge(p)
  const cleDe = (a) => `${a.niveau}|${a.cle}`
  // La carte survolée brille ; sans survol, ce sont les habitats des Pokémon de la fiche.
  const brillent = survole
    ? ici.filter((a) => cleDe(a) === survole)
    : ici.filter((a) => a.occupants.some((p) => enAvant.includes(p)))

  return (
    <div className="plan-de-ville">
      {plans.length > 1 && (
        <Segmented
          value={plan.id}
          onChange={(id) => {
            setPlanId(id)
            setNiveau(niveauDe(plans.find((p) => p.id === id), enAvant))
          }}
          options={plans.map((p) => ({ value: p.id, label: p.nom }))}
          aria-label="Plan affiché"
        />
      )}
      {niveaux.length > 1 && (
        <Segmented
          value={niveau}
          onChange={setNiveau}
          options={niveaux.map((_, i) => ({ value: i, label: nomNiveau(i) }))}
          aria-label="Niveau affiché"
        />
      )}
      <Checkbox checked={sansHabitat} onChange={(e) => setSansHabitat(e.target.checked)}>
        Sans habitat seulement
      </Checkbox>

      {/* Le plan à gauche, ses habitats à droite : on survole une carte sans perdre la
          grille de vue. */}
      <div className="plan-de-ville-corps">
        <svg
          className="plan-de-ville-grille"
          viewBox={`${cadre.x} ${cadre.y} ${cadre.cote} ${cadre.cote}`}
          role="img"
          aria-label={`Plan « ${plan.nom} », ${nomNiveau(niveau).toLowerCase()}`}
        >
          <rect x={cadre.x} y={cadre.y} width={cadre.cote} height={cadre.cote} className="grille-fond" />
          {ici.map((a) => (
            <path
              key={a.cle}
              d={chemin(a.zone)}
              className={a.teinte ? `grille-teinte-${a.teinte}` : 'grille-habitat'}
            />
          ))}
          {TYPES_BLOC.map((t) => (
            <path
              key={t.id}
              d={chemin(cases.filter((k) => (couleurs[k] ?? TYPE_DEFAUT) === t.id))}
              className={`grille-bloc-${t.id}`}
            />
          ))}
          {ici.map((a) => {
            const { cote, places } = disposer(a)
            // Le numéro en petit dans le coin : la place va aux Pokémon.
            const num = Math.min(0.9, Math.max(0.5, Math.min(a.largeur, a.longueur) * 0.3))
            return (
              <g key={a.cle}>
                {a.occupants.map((p, i) => (
                  <image
                    key={p}
                    href={urlSpritePokemon(spritePokemon(p))}
                    x={places[i].x}
                    y={places[i].y}
                    width={cote}
                    height={cote}
                    className={grise(p) ? 'grise' : undefined}
                  >
                    <title>{frPokemon(p)}</title>
                  </image>
                ))}
                <text
                  x={a.occupants.length ? a.x + 0.12 : a.x + a.largeur / 2}
                  y={a.occupants.length ? a.y + 0.12 + num / 2 : a.y + a.longueur / 2}
                  fontSize={a.occupants.length ? num : Math.min(1.6, Math.min(a.largeur, a.longueur) * 0.55)}
                  className={'plan-de-ville-numero' + (a.occupants.length ? ' coin' : '')}
                >
                  {a.numero}
                </text>
              </g>
            )
          })}
          {brillent.map((a) => (
            <rect
              key={a.cle}
              x={a.x - 0.15}
              y={a.y - 0.15}
              width={a.largeur + 0.3}
              height={a.longueur + 0.3}
              rx="0.3"
              className="plan-de-ville-brille"
            />
          ))}
        </svg>

        {habitats.length > 0 ? (
          <ol className="plan-de-ville-habitats">
            {habitats.map((a) => (
              <li
                key={cleDe(a)}
                className={[a.niveau === niveau ? '' : 'ailleurs', cleDe(a) === survole ? 'survole' : '']
                  .join(' ')
                  .trim() || undefined}
                onMouseEnter={() => setSurvole(cleDe(a))}
                onMouseLeave={() => setSurvole(null)}
              >
                <div className="plan-de-ville-tete">
                  <b>{a.numero}</b>
                  <span>
                    {niveaux.length > 1 && `${nomNiveau(a.niveau)} · `}
                    {a.largeur} × {a.longueur}
                  </span>
                </div>
                {a.occupants.length ? (
                  <div className="plan-de-ville-pokemon">
                    {a.occupants.map((p) => (
                      <figure key={p} className={grise(p) ? 'grise' : undefined}>
                        <img src={urlSpritePokemon(spritePokemon(p))} alt="" width="64" height="64" />
                        <figcaption>{frPokemon(p)}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <span className="plan-de-ville-vide">aucun Pokémon prévu</span>
                )}
                {onCreer &&
                  (() => {
                    const aLoger = a.occupants.filter((p) => !loge(p))
                    return aLoger.length > 0 ? (
                      <button
                        type="button"
                        className="mini-btn plan-de-ville-creer"
                        title={`Créer l’habitat de ${aLoger.map(frPokemon).join(', ')}`}
                        onClick={() => onCreer(aLoger)}
                      >
                        {aLoger.length > 1 ? 'Créer leur habitat' : 'Créer son habitat'}
                      </button>
                    ) : null
                  })()}
              </li>
            ))}
          </ol>
        ) : (
          <p className="liste-chapeau">Aucun habitat marqué sur ce plan.</p>
        )}
      </div>
    </div>
  )
}
