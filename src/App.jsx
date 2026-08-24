import { lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import PageLoader from './components/PageLoader'

// Sur le web, `BrowserRouter` donne des URL propres, à condition qu'un serveur réécrive
// les chemins inconnus vers index.html — ce que fait GitHub Pages via le fallback 404.
// La coquille Tauri, elle, sert des fichiers : demander /pokedex n'y renvoie rien, donc
// un rafraîchissement casserait. Le mode bureau passe par le fragment.
const desktop = import.meta.env.VITE_DESKTOP === true || import.meta.env.VITE_DESKTOP === 'true'
const Router = desktop ? HashRouter : BrowserRouter

const AccueilPage = lazy(() => import('./pages/AccueilPage'))
const IndexPage = lazy(() => import('./pages/IndexPage'))
const HabitatPage = lazy(() => import('./pages/HabitatPage'))
const PokedexPage = lazy(() => import('./pages/PokedexPage'))
const FichePokemonPage = lazy(() => import('./pages/FichePokemonPage'))
const ObjetPage = lazy(() => import('./pages/ObjetPage'))

function App() {
  return (
    <Router basename={desktop ? undefined : import.meta.env.BASE_URL}>
      <Suspense fallback={<PageLoader message="Chargement…" />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<AccueilPage />} />
            <Route path="preferences" element={<IndexPage />} />
            <Route path="habitat" element={<HabitatPage />} />
            <Route path="pokedex" element={<PokedexPage />} />
            <Route path="pokedex/:nom" element={<FichePokemonPage />} />
            <Route path="objet/:nom" element={<ObjetPage />} />
            <Route path="*" element={<AccueilPage />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
