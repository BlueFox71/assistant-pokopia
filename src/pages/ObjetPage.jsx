import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ICONE_CATEGORIE } from '../components/Icones'
import { VignettePokemon } from '../components/Vignette'
import { urlSpriteObjet } from '../data/images'
import {
  categorieDe,
  comparerParNumero,
  frObjet,
  objetParNom,
  prefParSlug,
  prefsParObjet,
  spriteObjet,
} from '../data'
import { FR_TYPE_OBJET, typeObjet } from '../data/categories'
import './Fiche.css'

/**
 * Fiche d'un objet : les préférences qu'il coche, et tous les Pokémon qu'il contente.
 *
 * C'est la question posée dans l'autre sens que la vue habitat — « j'ai cet objet, à qui
 * sert-il ? » — utile quand on tombe sur un plan de fabrication en jeu.
 */
export default function ObjetPage() {
  const { nom: nomBrut } = useParams()
  const navigate = useNavigate()
  const nom = decodeURIComponent(nomBrut || '')
  const connu = prefsParObjet.has(nom)

  const slugs = useMemo(() => (connu ? prefsParObjet.get(nom) : []), [connu, nom])

  /** Un Pokémon est contenté dès qu'il apprécie l'une des préférences de l'objet. */
  const pokemonContents = useMemo(() => {
    const vus = new Set()
    for (const slug of slugs) for (const p of prefParSlug.get(slug).pokemon) vus.add(p)
    return [...vus].sort(comparerParNumero)
  }, [slugs])

  if (!connu) {
    return (
      <div className="wrap vide">
        <p>
          Objet inconnu. <Link to="/preferences">Retour à l’index</Link>
        </p>
      </div>
    )
  }

  const categorie = categorieDe(nom)
  const meuble = typeObjet(nom, objetParNom.get(nom)?.categorie)
  const IconeCat = ICONE_CATEGORIE[meuble]

  return (
    <div className="wrap fiche">
      <Link to="/preferences" className="retour">
        ← Index des préférences
      </Link>

      <header className="fiche-tete">
        <img src={urlSpriteObjet(spriteObjet(nom))} alt="" width="96" height="96" />
        <div>
          <h1>{frObjet(nom)}</h1>
          <p className="fiche-tags-ligne">
            <span
              className="pastille"
              style={{ '--teinte': `var(--c-${meuble})`, '--teinte-fond': `var(--c-${meuble}-fond)` }}
            >
              <IconeCat />
              {FR_TYPE_OBJET[meuble]}
            </span>
          </p>
          <p className="fiche-sous">
            {frObjet(nom) === nom ? '' : `${nom} · `}
            {categorie ? `confort : ${categorie.toLowerCase()}` : 'sans catégorie de confort'} ·{' '}
            {slugs.length} préférence{slugs.length > 1 ? 's' : ''} · {pokemonContents.length}{' '}
            Pokémon contentés
          </p>
        </div>
      </header>

      {!categorie && (
        <p className="fiche-note">
          Cet objet n’a pas de catégorie en jeu : il ne compte donc ni comme Repos, ni comme
          Décoration, ni comme Jouet dans le calcul du confort d’un habitat.
        </p>
      )}

      <section className="fiche-bloc">
        <h2 className="etiquette">
          Coche {slugs.length} préférence{slugs.length > 1 ? 's' : ''}
        </h2>
        <div className="fiche-tags">
          {slugs.map((slug) => (
            <span key={slug} className="chip-tag statique">
              {prefParSlug.get(slug).fr}{' '}
              <b>{prefParSlug.get(slug).pokemon.length} pkmn</b>
            </span>
          ))}
        </div>
      </section>

      <section className="fiche-bloc">
        <h2 className="etiquette">{pokemonContents.length} Pokémon qu’il contente</h2>
        <p className="fiche-note">
          Chacun apprécie au moins une des préférences ci-dessus. Cliquez pour ouvrir sa fiche.
        </p>
        <div className="chips">
          {pokemonContents.map((p) => (
            <VignettePokemon
              key={p}
              nom={p}
              onClick={() => navigate(`/pokedex/${encodeURIComponent(p)}`)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
