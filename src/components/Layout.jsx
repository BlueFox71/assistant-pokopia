import { Outlet } from 'react-router-dom'
import AppHeader from './AppHeader'
import FilAriane from './FilAriane'
import './Layout.css'

/**
 * Coquille commune : l'en-tête, le fil d'Ariane, et la page.
 *
 * Le pied de page portait les avertissements de provenance — traduction maison des noms
 * d'objets, catégories déduites, trois Pokédex, sources. Ils sont désormais dans le README
 * seulement : ils alourdissaient chaque écran alors qu'on les lit une fois.
 */
export default function Layout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main>
        <FilAriane />
        <Outlet />
      </main>
    </div>
  )
}
