import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ICONE_HABITAT, ICONE_VILLE } from '../components/Icones'
import { VignetteObjet, VignettePokemon } from '../components/Vignette'
import { urlSpritePokemon } from '../data/images'
import {
  FR_TYPE,
  comparerParNumero,
  frPokemon,
  habitatDe,
  numeroAffiche,
  objetsPourGroupe,
  pokemonParNom,
  prefParSlug,
  prefsParPokemon,
  specialitesDe,
  spritePokemon,
  typesDe,
} from '../data'
import { cleVilleDe, nomVille, useAttributions, useNomsVilles } from '../utils/villesStorage'
import './Fiche.css'

/** Objets mis en avant sur la fiche ; la vue habitat donne la liste complète. */
const APERCU = 24
/** Voisins de goût proposés en bas de fiche, par groupe. */
const VOISINS = 6

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
  const nom = decodeURIComponent(nomBrut || '')
  const connu = pokemonParNom.has(nom)

  const slugs = useMemo(() => (connu ? prefsParPokemon.get(nom) || [] : []), [connu, nom])
  const types = connu ? typesDe(nom) : []
  const specialites = connu ? specialitesDe(nom) : []
  const objets = useMemo(() => (connu ? objetsPourGroupe([nom], slugs) : []), [connu, nom, slugs])

  const maVille = connu ? cleVilleDe(attributions, nom) : null

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
    const tous = [...prefsParPokemon.keys()]
      .filter((autre) => autre !== nom)
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
      <Link to="/pokedex" className="retour">
        ← Pokédex
      </Link>

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
                      {s}
                    </span>
                  ))}
                </>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => navigate(`/habitat?pokemon=${encodeURIComponent(nom)}`)}
        >
          Composer un habitat →
        </button>
      </header>

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
