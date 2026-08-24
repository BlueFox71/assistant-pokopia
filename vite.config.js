import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pour GitHub Pages : https://<user>.github.io/<repo>/
const repoName = 'assistant-pokopia'

// Deux cibles, deux bases incompatibles :
//  • GitHub Pages sert le site sous /<repo>/, d'où une base absolue ;
//  • la coquille Tauri sert `dist` à la racine de son protocole, où /<repo>/… ne
//    désigne rien — les 1 081 sprites ne se chargeraient pas.
// D'où le mode `desktop` (`vite build --mode desktop`), qui bascule sur des chemins
// relatifs et fait passer le routeur en HashRouter (cf. src/App.jsx).
export default defineConfig(({ mode }) => {
  const desktop = mode === 'desktop'
  return {
    plugins: [react()],
    base: desktop ? './' : process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/',
    define: {
      'import.meta.env.VITE_DESKTOP': JSON.stringify(desktop),
    },
    build: {
      // Les sprites pèsent 1,5 Ko en moyenne : sous la limite d'inlining par défaut
      // (4 Ko), Vite les transformerait en 1 081 data-URI base64 dans le bundle JS —
      // +2 Mo de JavaScript à parser au démarrage, et plus aucun cache par image.
      assetsInlineLimit: 0,
    },
    // `host: true` expose aussi 127.0.0.1 et l'IP du réseau local. Utile en soi pour tester
    // depuis un téléphone, et surtout : 127.0.0.1 et localhost sont deux origines distinctes,
    // donc deux localStorage distincts. On peut y faire des essais sans toucher aux habitats
    // enregistrés sur localhost.
    server: { port: 5191, host: true },
    preview: { port: 5191, host: true },
  }
})
