import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Image, Modal, Select } from 'antd'
import { ZoomInOutlined } from '@ant-design/icons'
import { ICONE_HABITAT, ICONE_VILLE, IconeSpecialite } from '../components/Icones'
import { VignetteObjet, VignettePokemon } from '../components/Vignette'
import { urlSpriteObjet, urlSpritePokemon } from '../data/images'
import {
  FR_TYPE,
  comparerParNumero,
  frObjet,
  frPokemon,
  habitatDe,
  logeable,
  numeroAffiche,
  objetsPourGroupe,
  pokemonParNom,
  prefParSlug,
  prefsParPokemon,
  specialitesDe,
  spriteObjet,
  spritePokemon,
  typesDe,
} from '../data'
import {
  ETOILES_RARETE,
  FR_METEO,
  FR_MOMENT,
  FR_RARETE,
  habitatsJeuDe,
  numeroHabitat,
  vignetteHabitat,
} from '../data/habitatsJeu'
import { FR_SOURCE_VILLE, VILLES, habitatsDeVille } from '../data/villes'
import { habitatDuPokemon, useHabitats } from '../utils/habitatsStorage'
import {
  attribuerVille,
  cleVilleDe,
  nomVille,
  reinitialiserVille,
  useAttributions,
  useNomsVilles,
  villeDe,
} from '../utils/villesStorage'
import './Fiche.css'

/** Objets mis en avant sur la fiche ; la vue habitat donne la liste complète. */
const APERCU = 24
/** Voisins de goût proposés en bas de fiche, par groupe. */
const VOISINS = 6
/** Les autres Pokémon qu'une recette attire, nommés sous la carte avant un « … ». */
const AUTRES_ATTIRES = 5

/** « le soir, la nuit » : n'apparaît que si la recette le restreint. */
const listeFr = (valeurs, table) => valeurs.map((v) => table[v] || v).join(', ')

/**
 * Une recette de l'Habitadex : sa vignette, ce qu'elle demande, et ce qu'elle réserve à
 * ce Pokémon — rareté, moments, météo. Les objets du catalogue mènent à leur fiche ; les
 * requis génériques (« Siège (au choix) ») n'en ont pas.
 */
function CarteHabitatJeu({ habitat, venue, nom }) {
  const navigate = useNavigate()
  const vignette = vignetteHabitat(habitat)
  const etoiles = ETOILES_RARETE[venue.rarete] || 0
  const autres = habitat.pokemon.map((p) => p.nom).filter((n) => n !== nom)
  return (
    <article className="habitat-jeu">
      {/* Un clic agrandit la vignette : c'est en la regardant de près qu'on voit comment
          les objets se disposent. L'aperçu d'antd zoome à la molette et se ferme sur Échap. */}
      {vignette && (
        <Image
          rootClassName="habitat-jeu-image"
          src={vignette}
          alt={habitat.fr || habitat.en}
          loading="lazy"
          preview={{ mask: <ZoomInOutlined aria-label="Agrandir" /> }}
        />
      )}
      <div className="habitat-jeu-corps">
        <p className="habitat-jeu-num">{numeroHabitat(habitat)}</p>
        <h3>{habitat.fr || habitat.en}</h3>
        <p className="habitat-jeu-venue">
          <span className="etoiles" aria-hidden="true">
            {'★'.repeat(etoiles)}
            {'☆'.repeat(3 - etoiles)}
          </span>{' '}
          {FR_RARETE[venue.rarete] || 'Rareté non publiée'}
          {venue.moments && ` · ${listeFr(venue.moments, FR_MOMENT)} seulement`}
          {venue.meteos && ` · par ${listeFr(venue.meteos, FR_METEO)}`}
        </p>
        <ul className="recette">
          {habitat.requis.map((r, i) =>
            r.objet ? (
              <li key={i}>
                <button
                  type="button"
                  className="recette-objet"
                  onClick={() => navigate(`/objet/${encodeURIComponent(r.objet)}`)}
                >
                  {urlSpriteObjet(spriteObjet(r.objet)) && (
                    <img src={urlSpriteObjet(spriteObjet(r.objet))} alt="" width="28" height="28" />
                  )}
                  <b>{r.quantite} ×</b> {frObjet(r.objet)}
                </button>
              </li>
            ) : (
              <li key={i} className="recette-generique">
                <b>{r.quantite} ×</b> {r.fr || r.en}
              </li>
            ),
          )}
        </ul>
        {autres.length > 0 && (
          <p className="habitat-jeu-autres">
            Attire aussi{' '}
            {autres.slice(0, AUTRES_ATTIRES).map((n, i) => (
              <span key={n}>
                {i > 0 && ', '}
                <Link to={`/pokedex/${encodeURIComponent(n)}`}>{frPokemon(n)}</Link>
              </span>
            ))}
            {autres.length > AUTRES_ATTIRES && ` et ${autres.length - AUTRES_ATTIRES} autres`}
          </p>
        )}
      </div>
    </article>
  )
}

/**
 * Fiche d'un Pokémon : ses préférences, un aperçu des objets qui lui plaisent, et les
 * Pokémon dont les goûts recoupent le plus les siens — de quoi choisir un colocataire
 * avant même d'ouvrir la vue habitat.
 */
export default function FichePokemonPage() {
  const { nom: nomBrut } = useParams()
  const navigate = useNavigate()
  const attributions = useAttributions()
  const nomsVilles = useNomsVilles()
  const listeHabitats = useHabitats()
  const nom = decodeURIComponent(nomBrut || '')
  const connu = pokemonParNom.has(nom)

  /** L'enclos où ce Pokémon vit déjà, s'il en a un : on l'ouvre au lieu d'en composer un autre. */
  const sonHabitat = connu ? habitatDuPokemon(listeHabitats, nom) : null

  const slugs = useMemo(() => (connu ? prefsParPokemon.get(nom) || [] : []), [connu, nom])
  const types = connu ? typesDe(nom) : []
  const specialites = connu ? specialitesDe(nom) : []
  const objets = useMemo(() => (connu ? objetsPourGroupe([nom], slugs) : []), [connu, nom, slugs])
  const habitatsJeu = connu ? habitatsJeuDe(nom) : []

  const { cle: maVille, source: sourceVille } = connu
    ? villeDe(attributions, nom)
    : { cle: null, source: null }

  // Le dialogue de réattribution. `choix` part de la ville actuelle : on ouvre pour
  // déplacer, pas pour repartir d'une case vide.
  const [dialogueVille, setDialogueVille] = useState(false)
  const [choix, setChoix] = useState(null)
  const villeChoisie = choix || maVille

  /**
   * Les voisins de goût, séparés en deux : ceux de la MÊME VILLE d'abord.
   *
   * Un colocataire se prend là où on est — un Pokémon de Grisemer ne rejoint pas un enclos
   * de Terrassec sans qu'on l'y déplace. Les autres suivent quand même, en second : ce sont
   * eux qu'on va chercher quand la ville ne donne personne d'assez proche.
   */
  const { memeVille, ailleurs } = useMemo(() => {
    if (!connu) return { memeVille: [], ailleurs: [] }
    const mien = new Set(slugs)
    // Un voisin de goût est un colocataire en puissance : Kyogre, Lugia et Ho-Oh, qu'aucun
    // enclos ne peut accueillir, n'ont pas à figurer dans une liste dont chaque entrée
    // propose un enclos.
    const tous = [...prefsParPokemon.keys()]
      .filter((autre) => autre !== nom && logeable(autre))
      .map((autre) => ({
        nom: autre,
        communes: (prefsParPokemon.get(autre) || []).filter((s) => mien.has(s)).length,
        ville: cleVilleDe(attributions, autre),
      }))
      .filter((v) => v.communes > 0)
      .sort((a, b) => b.communes - a.communes || comparerParNumero(a.nom, b.nom))

    return {
      memeVille: tous.filter((v) => v.ville === maVille).slice(0, VOISINS),
      ailleurs: tous.filter((v) => v.ville !== maVille).slice(0, VOISINS),
    }
  }, [connu, nom, slugs, attributions, maVille])

  if (!connu) {
    return (
      <div className="wrap vide">
        <p>
          Pokémon inconnu. <Link to="/pokedex">Retour au Pokédex</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="wrap fiche">
      <header className="fiche-tete pokemon">
        <img src={urlSpritePokemon(spritePokemon(nom))} alt="" width="96" height="96" />
        <div>
          <h1>{frPokemon(nom)}</h1>
          <p className="fiche-sous">
            {nom} · {numeroAffiche(nom)}
            {habitatDe(nom) && (
              <>
                {' · '}
                <span className={'marque-habitat hab-' + pokemonParNom.get(nom).habitat}>
                  {(() => {
                    const I = ICONE_HABITAT[pokemonParNom.get(nom).habitat]
                    return I ? <I /> : null
                  })()}
                  habitat {habitatDe(nom).toLowerCase()}
                </span>
              </>
            )}
            {' · '}
            <Link
              to={`/villes?ville=${maVille}`}
              className={'marque-ville ville-' + maVille}
              title="Voir tous les Pokémon de cette ville"
            >
              {(() => {
                const I = ICONE_VILLE[maVille]
                return I ? <I /> : null
              })()}
              {nomVille(nomsVilles, maVille)}
            </Link>{' '}
            · {slugs.length} préférences · {objets.length} objets
          </p>
          {/* Type et spécialité peuvent porter le même mot — Dracaufeu est de type Vol et
              spécialiste du Vol — d'où l'intitulé devant chaque groupe. */}
          {(types.length > 0 || specialites.length > 0) && (
            <p className="fiche-tags-ligne">
              {types.length > 0 && (
                <>
                  <span className="fiche-tags-intitule">Type</span>
                  {types.map((t) => (
                    <span
                      key={t}
                      className="pastille"
                      style={{ '--teinte': `var(--t-${t})`, '--teinte-fond': `var(--t-${t}-fond)` }}
                    >
                      {FR_TYPE[t] || t}
                    </span>
                  ))}
                </>
              )}
              {specialites.length > 0 && (
                <>
                  <span className="fiche-tags-intitule">
                    Spécialité{specialites.length > 1 ? 's' : ''}
                  </span>
                  {specialites.map((s) => (
                    <span
                      key={s}
                      className="etiquette-specialite"
                      title="Le travail que ce Pokémon accomplit sur l’île"
                    >
                      <IconeSpecialite nom={s} />
                      {s}
                    </span>
                  ))}
                </>
              )}
            </p>
          )}
        </div>
        <div className="fiche-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setChoix(maVille)
              setDialogueVille(true)
            }}
          >
            Changer de ville
          </button>
          {/* Kyogre, Lugia et Ho-Oh n'entrent dans aucun enclos : leur proposer d'en composer
              un mènerait à une page que le sélecteur, lui, refuse de peupler. */}
          {logeable(nom) ? (
            <button
              type="button"
              className="ghost-btn"
              title={sonHabitat ? sonHabitat.nom : undefined}
              onClick={() =>
                navigate(
                  sonHabitat
                    ? `/habitat?habitat=${encodeURIComponent(sonHabitat.id)}`
                    : `/habitat?pokemon=${encodeURIComponent(nom)}`,
                )
              }
            >
              {sonHabitat ? 'Voir son habitat →' : 'Composer un habitat →'}
            </button>
          ) : (
            <span className="fiche-sans-habitat">Aucun habitat ne peut l’accueillir</span>
          )}
        </div>
      </header>

      {/* Réattribuer depuis la fiche : c'est ici qu'on se rend compte qu'un Pokémon n'est
          pas dans la bonne ville — en lisant ses voisins de goût — et la page Villes
          demandait d'y retourner pour le déplacer. */}
      <Modal
        title="Changer de ville"
        open={dialogueVille}
        onCancel={() => setDialogueVille(false)}
        footer={null}
      >
        <p className="fiche-note">
          {frPokemon(nom)} est actuellement à <b>{nomVille(nomsVilles, maVille)}</b> —{' '}
          {FR_SOURCE_VILLE[sourceVille]}.
          {sourceVille === 'habitat' &&
            ' Aucune source ne publie la ville d’origine des Pokémon : celle-ci est une déduction, à corriger si vous l’avez croisé ailleurs.'}
        </p>
        <Select
          className="champ-ville-fiche"
          value={villeChoisie}
          aria-label="Nouvelle ville"
          onChange={setChoix}
          options={VILLES.map((v) => {
            const habitats = habitatsDeVille(v.cle)
            return {
              value: v.cle,
              label: nomVille(nomsVilles, v.cle),
              // Les habitats de la ville aident à choisir : c'est le climat de l'enclos.
              title: habitats.length ? `Habitats : ${habitats.join(', ').toLowerCase()}` : v.resume,
            }
          })}
        />
        <div className="actions-dialogue">
          <button
            type="button"
            className="ghost-btn primaire"
            disabled={villeChoisie === maVille}
            onClick={() => {
              attribuerVille([nom], villeChoisie)
              setDialogueVille(false)
            }}
          >
            Attribuer à cette ville
          </button>
          {sourceVille === 'perso' && (
            <button
              type="button"
              className="mini-btn"
              onClick={() => {
                reinitialiserVille([nom])
                setDialogueVille(false)
              }}
            >
              Annuler ma réattribution
            </button>
          )}
        </div>
      </Modal>

      {/* La première question qu'on pose à une fiche : comment l'avoir. L'habitat idéal
          de l'en-tête est un climat ; ceci est la recette de l'Habitadex. */}
      <section className="fiche-bloc">
        <h2 className="etiquette">Pour le faire apparaître</h2>
        {habitatsJeu.length ? (
          <>
            <p className="fiche-note">
              {habitatsJeu.length > 1
                ? `Chacune de ces ${habitatsJeu.length} recettes de l’Habitadex peut l’attirer`
                : 'La recette de l’Habitadex qui l’attire'}{' '}
              : posez-la, et {frPokemon(nom)} finit par passer — plus ou moins vite selon sa
              rareté, et seulement aux moments et par le temps indiqués quand il y en a.
            </p>
            <div className="habitats-jeu">
              {habitatsJeu.map(({ habitat, venue }) => (
                <CarteHabitatJeu key={habitat.slug} habitat={habitat} venue={venue} nom={nom} />
              ))}
            </div>
          </>
        ) : (
          <p className="fiche-note">
            Aucune recette de l’Habitadex ne l’attire : {frPokemon(nom)} s’obtient autrement,
            par le récit ou un événement.
          </p>
        )}
      </section>

      <section className="fiche-bloc">
        <h2 className="etiquette">Ses {slugs.length} préférences</h2>
        <div className="fiche-tags">
          {slugs.map((slug) => (
            <span key={slug} className="chip-tag statique">
              {prefParSlug.get(slug).fr} <b>{prefParSlug.get(slug).objets.length}</b>
            </span>
          ))}
        </div>
      </section>

      <section className="fiche-bloc">
        <h2 className="etiquette">
          Les {Math.min(APERCU, objets.length)} objets les plus utiles sur {objets.length}
        </h2>
        <p className="fiche-note">
          Classés par nombre de préférences cochées : un objet qui en coche trois compte
          triple pour ce Pokémon.
        </p>
        <div className="chips">
          {objets.slice(0, APERCU).map((o) => (
            <VignetteObjet
              key={o.nom}
              nom={o.nom}
              nbPrefs={o.prefs.length}
              nomsPrefs={o.prefs.map((s) => prefParSlug.get(s).fr).join(' + ')}
              onClick={() => navigate(`/objet/${encodeURIComponent(o.nom)}`)}
            />
          ))}
        </div>
        {objets.length > APERCU && (
          <p className="fiche-note">
            <Link to={`/habitat?pokemon=${encodeURIComponent(nom)}`}>
              Voir les {objets.length} objets, filtrables par préférence →
            </Link>
          </p>
        )}
      </section>

      <section className="fiche-bloc">
        <h2 className="etiquette">
          Goûts les plus proches à {nomVille(nomsVilles, maVille)}
        </h2>
        <p className="fiche-note">
          Nombre de préférences en commun avec {frPokemon(nom)}, parmi les Pokémon de sa
          ville — un bon colocataire en partage beaucoup, et le même habitat.
        </p>
        {memeVille.length ? (
          <div className="chips">
            {memeVille.map((v) => (
              <div key={v.nom} className="voisin">
                <VignettePokemon
                  nom={v.nom}
                  onClick={() =>
                    navigate(
                      `/habitat?pokemon=${encodeURIComponent(nom)},${encodeURIComponent(v.nom)}`,
                    )
                  }
                />
                <span className="voisin-score">
                  {v.communes} préf. en commun
                  {habitatDe(v.nom) === habitatDe(nom) ? ' · même habitat' : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="fiche-note">
            Personne d’autre à {nomVille(nomsVilles, maVille)} ne partage ses goûts.
          </p>
        )}
      </section>

      {/* Second choix, mais pas hors sujet : c'est là qu'on regarde quand la ville ne donne
          personne, quitte à déplacer le Pokémon depuis la vue Villes. */}
      {ailleurs.length > 0 && (
        <section className="fiche-bloc">
          <h2 className="etiquette">Ailleurs sur l’île</h2>
          <p className="fiche-note">
            Les goûts les plus proches hors de {nomVille(nomsVilles, maVille)}. Il faudrait{' '}
            <Link to={`/villes?ville=${maVille}`}>les réattribuer à cette ville</Link> pour les
            faire cohabiter.
          </p>
          <div className="chips">
            {ailleurs.map((v) => (
              <div key={v.nom} className="voisin">
                <VignettePokemon
                  nom={v.nom}
                  ville={v.ville}
                  nomVille={nomVille(nomsVilles, v.ville)}
                  onClick={() =>
                    navigate(
                      `/habitat?pokemon=${encodeURIComponent(nom)},${encodeURIComponent(v.nom)}`,
                    )
                  }
                />
                <span className="voisin-score">
                  {v.communes} préf. en commun
                  {habitatDe(v.nom) === habitatDe(nom) ? ' · même habitat' : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
