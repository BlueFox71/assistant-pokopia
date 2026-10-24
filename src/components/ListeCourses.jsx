import { lazy, Suspense, useState } from 'react'
import { IconePanier } from './Icones'
import { useCourses } from '../utils/coursesStorage'
import './ListeCourses.css'

// Le panneau tire methodes.json (plus de 300 Ko) pour les images des blocs : on ne le
// charge qu'au premier clic, pas avec chaque page.
const PanneauCourses = lazy(() => import('./PanneauCourses'))

/**
 * La liste de courses : ce qui manque au chantier en cours, à rapporter de la ville où
 * l'on stocke. Un bouton flottant en bas à droite, sur toutes les pages, ouvre un panneau
 * latéral : la construction reste à l'écran derrière.
 */
export default function ListeCourses() {
  const lignes = useCourses()
  const [ouvert, setOuvert] = useState(false)
  const [charge, setCharge] = useState(false)

  const restantes = lignes.filter((l) => !l.coche).length

  return (
    <>
      <button
        type="button"
        className="courses-fab"
        onClick={() => {
          setCharge(true)
          setOuvert(true)
        }}
        aria-label={`Liste de courses${restantes ? ` : ${restantes} à prendre` : ''}`}
        title="Liste de courses"
      >
        <IconePanier />
        {restantes > 0 && <span className="courses-fab-compte">{restantes}</span>}
      </button>
      {charge && (
        <Suspense fallback={null}>
          <PanneauCourses ouvert={ouvert} onFermer={() => setOuvert(false)} lignes={lignes} />
        </Suspense>
      )}
    </>
  )
}
