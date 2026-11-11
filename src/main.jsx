import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme as antdTheme } from 'antd'
import frFR from 'antd/locale/fr_FR'
import App from './App'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import './index.css'

/**
 * Les jetons antd repris de la charte, mêmes angles à 3 px.
 *
 * `colorPrimary` prend l'orchidée de l'état actif (cf. index.css), en version FONCÉE
 * (`--actif-ink`) en thème clair : antd s'en sert pour des bordures de focus et des
 * textes, où l'orchidée pleine tomberait sous le seuil de lisibilité. En thème sombre,
 * la version claire convient.
 */
const jetons = {
  colorPrimary: '#9E4282',
  borderRadius: 3,
  fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
}

const jetonsSombre = { ...jetons, colorPrimary: '#E8A9D1', colorBgBase: '#0F1820' }

function Racine() {
  const { sombre } = useTheme()
  const theme = {
    algorithm: sombre ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: sombre ? jetonsSombre : jetons,
  }

  // Les méthodes statiques (`message.*`, `Modal.confirm`) montent leur propre racine
  // React, hors du ConfigProvider : sans ça elles sortiraient en thème clair.
  ConfigProvider.config({
    holderRender: (children) => (
      <ConfigProvider locale={frFR} theme={theme}>
        {children}
      </ConfigProvider>
    ),
  })

  return (
    <ConfigProvider locale={frFR} theme={theme}>
      <App />
    </ConfigProvider>
  )
}

const afficher = () =>
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        <Racine />
      </ThemeProvider>
    </React.StrictMode>,
  )

// En dev, `?demo` (ou VITE_DEMO=1) remplit l'app de données d'exemple AVANT le premier
// rendu, que les magasins les lisent d'emblée (cf. src/dev/donneesDemo.js). La branche
// entière disparaît du build de production.
if (import.meta.env.DEV) {
  import('./dev/donneesDemo')
    .then((m) => m.semerSiDemande())
    .catch((e) => console.warn('[démo]', e))
    .finally(afficher)
} else {
  afficher()
}
