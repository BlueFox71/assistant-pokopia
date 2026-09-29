import { Link, Navigate, useSearchParams } from 'react-router-dom'
import GenerateurFormes from '../components/GenerateurFormes'
import GenerateurEscalier from '../components/GenerateurEscalier'
import GenerateurHabitat from '../components/GenerateurHabitat'
import PlanPersonnalise from '../components/PlanPersonnalise'
import { IconeCrayon, IconeEscalier, IconeEtoile, IconeMaison } from '../components/Icones'
import { SIMULATIONS, urlSimulation } from './simulations'
import './ConstructionPage.css'

/**
 * La vue Construction : des simulations pour préparer un chantier avant de poser un bloc.
 *
 * Sans `?sim`, la page d'accueil de la vue : une carte par simulation. Chaque simulation a
 * ensuite sa page, lue dans l'URL (`?sim=habitat`, `?sim=formes`, `?sim=escalier`,
 * `?sim=plan`) ; le fil d'Ariane ramène à l'accueil. La liste est faite pour s'allonger :
 * une entrée dans simulations.js, un composant ici.
 */
/** Le composant de chaque simulation (cf. simulations.js pour leur liste et leurs textes). */
const COMPOSANTS = {
  habitat: GenerateurHabitat,
  formes: GenerateurFormes,
  escalier: GenerateurEscalier,
  plan: PlanPersonnalise,
}

/** L'icône de chaque carte de l'accueil de la vue : on reconnaît l'outil avant de lire. */
const ICONES = { habitat: IconeMaison, formes: IconeEtoile, escalier: IconeEscalier, plan: IconeCrayon }

/**
 * Les liens d'avant `?sim=` — `?forme=cercle&l=21`, `?d=6` — portaient déjà les réglages
 * d'un générateur : on en déduit lequel, pour ne pas les faire tomber sur l'accueil de la vue.
 */
function simulationDeduite(params) {
  if (params.has('forme')) return 'formes'
  if (params.has('d') || params.has('pm') || params.has('pa')) return 'escalier'
  if (params.has('p') || params.has('hm') || params.has('po')) return 'habitat'
  return null
}

export default function ConstructionPage() {
  const [params] = useSearchParams()
  const active = SIMULATIONS.find((s) => s.cle === params.get('sim'))

  const deduite = !active && simulationDeduite(params)
  if (deduite) {
    const suivants = new URLSearchParams(params)
    suivants.set('sim', deduite)
    return <Navigate to={`/construction?${suivants}`} replace />
  }

  // Sans simulation dans l'URL : l'accueil de la vue, une carte par générateur.
  if (!active) {
    return (
      <div className="wrap construction">
        <div className="construction-tete">
          <p className="etiquette">Construction</p>
          <h1>Préparer un chantier</h1>
          <p className="liste-chapeau">Des simulations pour préparer une construction avant de poser le premier bloc.</p>
        </div>
        <nav className="simulations-accueil" aria-label="Simulations">
          {SIMULATIONS.map((s) => {
            const Icone = ICONES[s.cle]
            return (
              <Link key={s.cle} to={urlSimulation(s.cle)} className="carte-simulation">
                {Icone && <Icone className="carte-simulation-icone" />}
                <strong>{s.libelle}</strong>
                <span>{s.chapeau}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    )
  }

  const Composant = COMPOSANTS[active.cle]
  return (
    <div className={'wrap construction' + (active.large ? ' large' : '')}>
      <div className="construction-tete">
        <p className="etiquette">Construction</p>
        <h1>{active.libelle}</h1>
        <p className="liste-chapeau">{active.chapeau}</p>
      </div>
      <Composant />
    </div>
  )
}
