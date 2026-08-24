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
 * `colorPrimary` prend la lavande FONCÉE (`--accent-ink`) en thème clair : antd s'en sert
 * pour des bordures de focus et des textes, où la lavande de marque tomberait sous le
 * seuil de lisibilité. En thème sombre, la lavande elle-même convient.
 */
const jetons = {
  colorPrimary: '#5B45A6',
  borderRadius: 3,
  fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
}

const jetonsSombre = { ...jetons, colorPrimary: '#BDADEA', colorBgBase: '#16131F' }

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <Racine />
    </ThemeProvider>
  </React.StrictMode>,
)
