import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ICONE_VILLE } from './Icones'
import { logeable, pokemonParNom } from '../data'
import { VILLES } from '../data/villes'
import { cleVilleDe, nomVille, useAttributions, useNomsVilles } from '../utils/villesStorage'
import './ProgressionVilles.css'

/**
 * Le peuplement de l'île, une barre par ville : « 42/73 logés ».
 *
 * Rien de nouveau n'est stocké — un Pokémon est logé s'il figure dans un habitat
 * enregistré, et sa ville est celle du rattachement, réattributions comprises. Les deux
 * vivent déjà dans le localStorage, chacun derrière son store partagé : les barres bougent
 * donc toutes seules quand on compose un habitat ou qu'on déplace un Pokémon.
 *
 * Kyogre ne compte d'aucun côté, comme le décompte de la vue habitat : aucun enclos ne peut
 * l'accueillir, et sa ville n'atteindrait jamais son total (cf. NON_LOGEABLES). La somme
 * des six villes fait donc 365, pas 366.
 *
 * Le bloc ne paraît qu'une fois un premier habitat enregistré : six barres à zéro se
 * liraient comme une grille de cases à remplir, et l'accueil tient dans un écran.
 *
 * `resume` porte le total, à éteindre là où la page le dit déjà — la liste des habitats
 * annonce en tête combien de Pokémon n'ont pas encore de place.
 */
export default function ProgressionVilles({ habitats, resume = true }) {
  const attributions = useAttributions()
  const nomsVilles = useNomsVilles()

  const villes = useMemo(() => {
    const loges = new Set(habitats.flatMap((h) => h.pokemon))
    const compte = new Map(VILLES.map((v) => [v.cle, { total: 0, loges: 0 }]))
    for (const nom of pokemonParNom.keys()) {
      if (!logeable(nom)) continue
      const ville = compte.get(cleVilleDe(attributions, nom))
      if (!ville) continue
      ville.total += 1
      if (loges.has(nom)) ville.loges += 1
    }
    return VILLES.map((v) => ({ cle: v.cle, nom: nomVille(nomsVilles, v.cle), ...compte.get(v.cle) }))
  }, [habitats, attributions, nomsVilles])

  if (!habitats.length) return null

  const totalLoges = villes.reduce((n, v) => n + v.loges, 0)
  const total = villes.reduce((n, v) => n + v.total, 0)

  return (
    <section className="progression">
      <header className="progression-tete">
        <h2 className="etiquette">Suivre la progression</h2>
        {resume && (
          <p className="progression-total">
            <b>{totalLoges}</b> Pokémon logés sur {total}
          </p>
        )}
      </header>

      <div className="progression-villes">
        {villes.map((v) => {
          const IconeVil = ICONE_VILLE[v.cle]
          const complet = v.total > 0 && v.loges === v.total
          const part = v.total ? Math.round((v.loges / v.total) * 100) : 0
          return (
            // La barre mène là où il reste à faire : le sélecteur, ses candidats filtrés sur
            // cette ville. Un chiffre qui ne mène nulle part n'aide pas à avancer.
            <Link
              key={v.cle}
              to={`/habitat?nouveau=1&ville=${v.cle}`}
              className={'progression-ville' + (complet ? ' complet' : '')}
              style={{ '--teinte': `var(--v-${v.cle})`, '--teinte-fond': `var(--v-${v.cle}-fond)` }}
              title={
                complet
                  ? `Tous les Pokémon de ${v.nom} ont une place.`
                  : `Composer un habitat à ${v.nom} — ${v.total - v.loges} Pokémon sans place`
              }
            >
              <span className="progression-nom">
                {IconeVil && <IconeVil />}
                {/* Le nom porte l'ellipse, pas la boîte : serrées à six de front, les villes
                    aux longs noms doivent pouvoir se couper sans pousser le compte dehors. */}
                <span className="progression-nom-texte">{v.nom}</span>
              </span>
              <span className="progression-compte">
                {v.loges}/{v.total} logés
              </span>
              <span className="progression-piste" aria-hidden="true">
                <span className="progression-jauge" style={{ width: `${part}%` }} />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
