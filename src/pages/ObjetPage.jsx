import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ICONE_CATEGORIE, IconePinceau } from '../components/Icones'
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
import {
  BAIES,
  COULEURS,
  FR_PERSONNALISATION,
  frCouleur,
  motifs,
  objetPeinture,
  personnalisationDe,
  repeignable,
} from '../data/couleurs'
import './Fiche.css'

/** « Rouge + Jaune », « 2 × Bleu » : ce que Smearguru réclame pour appliquer la teinte. */
const recetteEnClair = (recette) =>
  recette.map(([cle, n]) => (n > 1 ? `${n} × ${frCouleur(cle)}` : frCouleur(cle))).join(' + ')

/**
 * Les couleurs disponibles pour cet objet.
 *
 * La palette ne dépend pas de l'objet : les 18 teintes sont les mêmes partout, et c'est la
 * question de départ — « quelles couleurs pour ce meuble ? » — qui est mal posée. Ce qui
 * change, c'est seulement si l'objet accepte la peinture, les motifs, les deux ou rien.
 * Le bloc dit donc d'abord ce que celui-ci accepte, et ne déroule la palette que s'il se
 * repeint.
 */
function Couleurs({ nom }) {
  const etat = personnalisationDe(nom)
  const peinture = repeignable(nom)
  const motif = motifs(nom)

  return (
    <section className="fiche-bloc">
      <h2 className="etiquette">
        <IconePinceau /> Variantes de couleurs
        {etat && <span className="etat-perso">{FR_PERSONNALISATION[etat]}</span>}
      </h2>

      {etat === null && (
        <p className="fiche-note">
          Rien de publié pour cet objet : seule la table des meubles de Serebii porte la
          colonne « Colour », et elle ne couvre ni les matériaux, ni les revêtements, ni les
          fossiles. Absence de donnée, donc — pas une impossibilité.
        </p>
      )}

      {etat === 'aucune' && (
        <p className="fiche-note">
          Smearguru n’y peut rien : l’objet se pose tel quel, sans peinture ni motif.
        </p>
      )}

      {motif && !peinture && (
        <p className="fiche-note">
          Pas de peinture, mais des motifs : Smearguru peut changer l’imprimé de ses parties
          en tissu, sans toucher à la couleur.
        </p>
      )}

      {peinture && (
        <>
          <p className="fiche-note">
            Les 18 couleurs du jeu, identiques pour tous les objets repeignables. La mention
            donne ce que coûte la teinte en peintures de base — huit se ramassent, les dix
            autres se mélangent. Un ballon de peinture lancé sur l’objet déjà posé fait la
            même chose sans le ramasser.
            {motif && ' Ses parties en tissu acceptent en plus les motifs de Smearguru.'}
          </p>

          <ul className="palette">
            {COULEURS.map((c) => (
              <li key={c.cle} className="teinte" style={{ '--teinte': c.hex }}>
                <span className="teinte-pastille" aria-hidden="true" />
                <span className="teinte-nom">{c.fr}</span>
                <span className="teinte-recette">{recetteEnClair(c.recette)}</span>
              </li>
            ))}
          </ul>

          <p className="fiche-note baies">
            Les peintures de base se broient : chaque baie donne la sienne, et parfois du
            blanc ou du noir en second — les deux seules teintes qu’aucune baie ne rend en
            principal.{' '}
            {BAIES.map((b, i) => (
              <span key={b.en}>
                {i > 0 ? ' · ' : ''}
                {b.fr} →{' '}
                <Link to={`/objet/${encodeURIComponent(objetPeinture(b.principale))}`}>
                  {frCouleur(b.principale)}
                </Link>{' '}
                <i>({frCouleur(b.secondaire)})</i>
              </span>
            ))}
          </p>
        </>
      )}
    </section>
  )
}

/**
 * Fiche d'un objet : les couleurs qu'il accepte, les préférences qu'il coche, et tous les
 * Pokémon qu'il contente.
 *
 * C'est la question posée dans l'autre sens que la vue habitat — « j'ai cet objet, à qui
 * sert-il ? » — utile quand on tombe sur un plan de fabrication en jeu.
 */
export default function ObjetPage() {
  const { nom: nomBrut } = useParams()
  const navigate = useNavigate()
  const nom = decodeURIComponent(nomBrut || '')
  // Le catalogue fait foi, pas l'index des préférences : une vingtaine de meubles n'en
  // cochent aucune (cf. objets-complement.json) et méritent quand même leur fiche.
  const connu = objetParNom.has(nom)

  const slugs = useMemo(() => prefsParObjet.get(nom) || [], [nom])

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
          Objet inconnu. <Link to="/objets">Retour au catalogue</Link>
        </p>
      </div>
    )
  }

  const categorie = categorieDe(nom)
  const meuble = typeObjet(nom, objetParNom.get(nom)?.categorie)
  const IconeCat = ICONE_CATEGORIE[meuble]

  return (
    <div className="wrap fiche">
      <Link to="/objets" className="retour">
        ← Tous les objets
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

      <Couleurs nom={nom} />

      <section className="fiche-bloc">
        <h2 className="etiquette">
          Coche {slugs.length} préférence{slugs.length > 1 ? 's' : ''}
        </h2>
        {slugs.length ? (
          <div className="fiche-tags">
            {slugs.map((slug) => (
              <span key={slug} className="chip-tag statique">
                {prefParSlug.get(slug).fr}{' '}
                <b>{prefParSlug.get(slug).pokemon.length} pkmn</b>
              </span>
            ))}
          </div>
        ) : (
          <p className="fiche-note">
            Aucune : cet objet n’apparaît dans la liste d’aucune préférence. Il se pose, mais
            il ne fera plaisir à personne en particulier — et l’assistant ne le proposera donc
            jamais pour un habitat.
          </p>
        )}
      </section>

      {slugs.length > 0 && (
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
      )}
    </div>
  )
}
