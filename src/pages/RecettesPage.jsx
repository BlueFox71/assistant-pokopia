import { Fragment, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Tooltip } from 'antd'
import { ICONE_GOUT, IconeSpecialite } from '../components/Icones'
import { FR_GOUT, comparerParNumero, frPokemon, pokemon, spritePokemon } from '../data'
import { urlSpritePokemon, urlSpriteRecette } from '../data/images'
import fichier from '../data/recettes.json'
import { useHabitats } from '../utils/habitatsStorage'
import './RecettesPage.css'

const FAMILLES = fichier.familles

/** Une teinte par famille, pour son onglet et son bandeau. */
const TEINTES = {
  salades: 'hsl(122 45% var(--lum))',
  soupes: 'hsl(200 55% var(--lum))',
  pains: 'hsl(36 70% calc(var(--lum) - 4 * var(--clair)))',
  steaks: 'hsl(12 55% var(--lum))',
  smoothies: 'hsl(330 50% var(--lum))',
}

/** spécialité -> les Pokémon qui l'ont, dans l'ordre du Pokédex. */
const pokemonParSpecialite = new Map()
for (const p of [...pokemon].sort((a, b) => comparerParNumero(a.en, b.en)))
  for (const s of p.specialites || []) {
    if (!pokemonParSpecialite.has(s)) pokemonParSpecialite.set(s, [])
    pokemonParSpecialite.get(s).push(p.en)
  }

/**
 * L'offrande à Ronflex Moussu (spécialité Gloutonnerie) : un aliment par jour, et un bonus
 * jusqu'au lendemain. La saveur choisit l'effet, le plat sa puissance — d'après la page
 * « Ronflex Moussu et Gloutonnerie » de Pokékalos. Serebii (mosslaxboosts.shtml) donne à
 * la saveur acide des remises en boutique plutôt que des trocs plus rares ; on suit
 * Pokékalos, comme pour le reste de la page.
 */
const SOURCE_OFFRANDE = 'https://www.pokekalos.fr/jeux/switch2/pokopia/articles-ronflex-moussu-et-gloutonnerie-6327.html'
const OFFRANDES = {
  aucun: 'L’amitié des Pokémon monte plus vite',
  sour: 'Les Pokémon proposent des objets plus rares au troc',
  dry: 'Ho-Oh et Lugia apparaissent plus souvent',
  bitter: 'Plus de chances de trouver des objets rares',
  spicy: 'Les Pokémon arrivent plus vite dans les habitats',
  sweet: 'Plus de trésors enfouis',
}

/** « Soupe » dans une recette : n'importe quelle soupe fait l'affaire. */
const libelleFamille = (nom) => `n’importe quel${/^(soupe|salade)/i.test(nom) ? 'le' : ''} ${nom.toLowerCase()}`

/**
 * La page Recettes : les plats du jeu, un onglet par ustensile, chaque recette écrite comme
 * une formule — ingrédients, commis, plat. On y vient pour savoir quoi réunir avant de
 * cuisiner, et ce que le plat apportera à Métamorph : c'est donc l'effet qui nomme l'onglet.
 */
export default function RecettesPage() {
  const [params, setParams] = useSearchParams()
  const cle = FAMILLES.some((f) => f.cle === params.get('famille')) ? params.get('famille') : FAMILLES[0].cle
  const famille = FAMILLES.find((f) => f.cle === cle)
  const choisir = (suivante) =>
    setParams(
      (p) => {
        const suivant = new URLSearchParams(p)
        suivant.set('famille', suivante)
        return suivant
      },
      { replace: true },
    )

  const nbPlats = FAMILLES.reduce((n, f) => n + f.plats.length, 0)

  return (
    <>
      <div className="wrap page-tete">
        <div>
          <p className="etiquette">Objets</p>
          <h1>Recettes</h1>
          <p className="liste-chapeau">
            Les {nbPlats} plats du jeu et ce qu’il faut réunir pour les cuisiner. On cuisine après
            avoir rencontré Rongragoût à Collinangle, avec quatre ustensiles — et un cinquième, le
            blender, dans le DLC. Chaque famille de plats renforce une capacité de Métamorph ;
            certaines recettes demandent en plus un Pokémon en commis. Offert à Ronflex Moussu, un
            plat donne en plus un bonus jusqu’au lendemain, selon sa saveur.
          </p>
        </div>
      </div>

      <div className="wrap recettes">
        <div className="recettes-onglets" role="tablist" aria-label="Familles de plats">
          {FAMILLES.map((f) => (
            <button
              key={f.cle}
              type="button"
              role="tab"
              aria-selected={f.cle === cle}
              className="recettes-onglet"
              style={{ '--teinte': TEINTES[f.cle] }}
              onClick={() => choisir(f.cle)}
            >
              <img src={urlSpriteRecette(f.plats[0].image)} alt="" width="26" height="26" />
              <span>
                {f.nom}
                <small>{f.capacite}</small>
              </span>
            </button>
          ))}
        </div>

        <section className="recettes-panneau" role="tabpanel" style={{ '--teinte': TEINTES[cle] }}>
          <Bandeau famille={famille} />
          <ol className="recettes-liste">
            {/* Le premier plat de chaque famille est sa version « simple » (cf. Offrande). */}
            {famille.plats.map((plat, i) => (
              <Recette key={plat.nom} plat={plat} cle={famille.ingredientCle} simple={i === 0} />
            ))}
          </ol>
        </section>

        <p className="note-source">
          Recettes, saveurs et commis d’après la{' '}
          <a href={fichier._source} target="_blank" rel="noreferrer">
            liste des plats de Pokékalos
          </a>
          ; offrandes d’après sa page{' '}
          <a href={SOURCE_OFFRANDE} target="_blank" rel="noreferrer">
            Ronflex Moussu et Gloutonnerie
          </a>
          .
        </p>
      </div>
    </>
  )
}

function Bandeau({ famille }) {
  const plat = famille.plats.find((p) => p.ingredients[0]?.nom === famille.ingredientCle)
  const imageCle = plat?.ingredients[0]?.image
  return (
    <header className="recettes-bandeau">
      <div className="recettes-capacite">
        <small>Manger un plat de la famille améliore</small>
        {famille.capacite}
        <p>{famille.effet}</p>
      </div>
      <dl className="recettes-materiel">
        <div>
          <dt>Ustensile</dt>
          <dd>{famille.ustensile}</dd>
        </div>
        <div>
          <dt>Ingrédient clé</dt>
          <dd>
            {imageCle && <img src={urlSpriteRecette(imageCle)} alt="" width="22" height="22" />}
            {famille.ingredientCle}
          </dd>
        </div>
        {famille.remarque && (
          <div className="recettes-remarque">
            <dt>À savoir</dt>
            <dd>{famille.remarque}</dd>
          </div>
        )}
      </dl>
    </header>
  )
}

function Recette({ plat, cle, simple }) {
  const Gout = plat.gout ? ICONE_GOUT[plat.gout] : null
  return (
    <li className="recette">
      <div className="recette-formule">
        {plat.ingredients.map((ing, i) => (
          <Fragment key={ing.nom + i}>
            {i > 0 && <span className="recette-plus" aria-hidden="true">+</span>}
            <Ingredient ingredient={ing} cle={i === 0 && ing.nom === cle} />
          </Fragment>
        ))}
        {plat.commis && (
          <>
            <span className="recette-plus" aria-hidden="true">+</span>
            <Commis specialite={plat.commis} />
          </>
        )}
      </div>
      <span className="recette-fleche" aria-hidden="true">→</span>
      <div className="recette-plat">
        <img src={urlSpriteRecette(plat.image)} alt="" width="64" height="64" />
        <div>
          <h3>{plat.nom}</h3>
          <span className={'recette-gout' + (plat.gout ? ' gout-' + plat.gout : '')}>
            {Gout && <Gout />}
            {plat.gout ? FR_GOUT[plat.gout] : 'Sans saveur'}
          </span>
        </div>
      </div>
      <Offrande gout={plat.gout} simple={simple} />
    </li>
  )
}

/**
 * Ce que le plat rapporte offert à Ronflex Moussu. Un plat « simple » donne une puissance
 * améliorée, les autres une puissance fortement améliorée ; un ingrédient seul — une baie —
 * resterait à la puissance de base, la première des trois pastilles.
 */
function Offrande({ gout, simple }) {
  const niveau = simple ? 2 : 3
  return (
    <div className="recette-offrande" title="Offert à Ronflex Moussu : bonus jusqu’au lendemain">
      <small>Offrande à Ronflex Moussu</small>
      <span>{OFFRANDES[gout || 'aucun']}</span>
      <span className="offrande-puissance" aria-label={`Puissance ${niveau === 3 ? 'fortement améliorée' : 'améliorée'}`}>
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= niveau ? 'pleine' : undefined} />
        ))}
        {niveau === 3 ? 'fortement améliorée' : 'améliorée'}
      </span>
    </div>
  )
}

function Ingredient({ ingredient, cle }) {
  const { nom, quantite, image, libre, famille } = ingredient
  return (
    <div
      className={'ingredient' + (cle ? ' cle' : '') + (libre ? ' libre' : '')}
      title={libre ? 'N’importe quel ingrédient' : famille ? `${nom} : ${libelleFamille(nom)}` : nom}
    >
      <span className="ingredient-pastille">
        {libre ? '?' : image && <img src={urlSpriteRecette(image)} alt="" width="40" height="40" />}
        <b>×{quantite}</b>
      </span>
      <span className="ingredient-nom">
        {libre ? 'au choix' : nom}
        {famille && <small>au choix</small>}
      </span>
    </div>
  )
}

/**
 * Le Pokémon à mettre en cuisine. Sa bulle dit qui a la spécialité — ceux qui vivent déjà
 * dans un de vos habitats en tête : c'est eux qu'on peut appeler tout de suite. Un clic
 * ouvre le Pokédex filtré sur la spécialité.
 */
function Commis({ specialite }) {
  const habitats = useHabitats()
  const { tous, chezVous } = useMemo(() => {
    const loges = new Set(habitats.flatMap((h) => h.pokemon))
    const liste = pokemonParSpecialite.get(specialite) || []
    const chez = liste.filter((n) => loges.has(n))
    return { tous: [...chez, ...liste.filter((n) => !loges.has(n))], chezVous: new Set(chez) }
  }, [habitats, specialite])

  const bulle = (
    <div className="commis-bulle">
      <p className="commis-titre">
        <IconeSpecialite nom={specialite} />
        <strong>{specialite}</strong>
        <span>
          {tous.length} Pokémon
          {chezVous.size > 0 && ` · ${chezVous.size} dans vos habitats`}
        </span>
      </p>
      <ul className="commis-grille">
        {tous.map((nom) => (
          <li key={nom} className={chezVous.has(nom) ? 'chez-vous' : undefined}>
            <img src={urlSpritePokemon(spritePokemon(nom))} alt="" width="36" height="36" loading="lazy" />
            {frPokemon(nom)}
          </li>
        ))}
      </ul>
      <p className="commis-pied">Cliquez pour les voir dans le Pokédex.</p>
    </div>
  )

  return (
    <Tooltip title={bulle} placement="top" mouseEnterDelay={0.15} classNames={{ root: 'bulle-commis' }}>
      <Link
        to={`/pokedex?specialite=${encodeURIComponent(specialite)}`}
        className="ingredient commis"
        aria-label={`Commis : un Pokémon avec la spécialité ${specialite}`}
      >
        <span className="ingredient-pastille">
          <IconeSpecialite nom={specialite} />
        </span>
        <span className="ingredient-nom">
          Commis
          <small>{specialite}</small>
        </span>
      </Link>
    </Tooltip>
  )
}
