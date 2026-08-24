import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Thème clair / sombre, avec trois états : « auto » suit le système, les deux autres le
 * forcent. Le choix est écrit sur <html data-theme> — c'est lui que lit la charte CSS —
 * et relu dans main.jsx pour donner à antd l'algorithme correspondant, sans quoi ses
 * composants (champs de recherche, Segmented, Empty) restent en thème clair sur fond noir.
 */

const CLE = 'pokopia:theme'
const ThemeContext = createContext(null)

const lireChoix = () => {
  try {
    const v = localStorage.getItem(CLE)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export function ThemeProvider({ children }) {
  const [choix, setChoix] = useState(lireChoix)
  const [systemeSombre, setSystemeSombre] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e) => setSystemeSombre(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const sombre = choix === 'auto' ? systemeSombre : choix === 'dark'

  useEffect(() => {
    const racine = document.documentElement
    if (choix === 'auto') racine.removeAttribute('data-theme')
    else racine.setAttribute('data-theme', choix)
    try {
      if (choix === 'auto') localStorage.removeItem(CLE)
      else localStorage.setItem(CLE, choix)
    } catch {
      /* navigation privée : le thème reste valable pour la session */
    }
  }, [choix])

  const valeur = useMemo(() => ({ choix, setChoix, sombre }), [choix, sombre])
  return <ThemeContext.Provider value={valeur}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
