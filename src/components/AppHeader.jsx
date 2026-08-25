import { NavLink } from 'react-router-dom'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import { IconeListe, IconeMaison, IconePokeball, IconeTerrasse } from './Icones'
import { useTheme } from '../context/ThemeContext'
import './AppHeader.css'

const ONGLETS = [
  { to: '/preferences', libelle: 'Préférences', Icone: IconeListe },
  { to: '/habitat', libelle: 'Habitat', Icone: IconeMaison },
  { to: '/villes', libelle: 'Villes', Icone: IconeTerrasse },
  { to: '/pokedex', libelle: 'Pokédex', Icone: IconePokeball },
]

/** Bandeau commun : identité, navigation, bascule de thème. */
export default function AppHeader() {
  const { choix, setChoix, sombre } = useTheme()

  // Trois états dans un seul bouton : auto → clair → sombre → auto. L'infobulle dit
  // lequel est actif, sinon « auto » et le thème qu'il résout sont indiscernables.
  const suivant = choix === 'auto' ? 'light' : choix === 'light' ? 'dark' : 'auto'
  const libelleTheme =
    choix === 'auto' ? `Thème : automatique (${sombre ? 'sombre' : 'clair'})` : choix === 'light' ? 'Thème : clair' : 'Thème : sombre'

  return (
    <header className="app-header">
      <div className="wrap app-header-inner">
        <NavLink to="/" className="marque">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" />
          <span>
            <span className="marque-sur">Pokémon Pokopia</span>
            <strong>Assistant</strong>
          </span>
        </NavLink>

        <nav className="onglets">
          {ONGLETS.map(({ to, libelle, Icone }) => (
            <NavLink key={to} to={to} className="onglet">
              <Icone />
              {libelle}
            </NavLink>
          ))}
        </nav>

        <Tooltip title={libelleTheme}>
          <button
            type="button"
            className="bascule-theme"
            aria-label={libelleTheme}
            onClick={() => setChoix(suivant)}
          >
            {sombre ? <MoonOutlined /> : <SunOutlined />}
            {choix === 'auto' && <span className="pastille-auto">auto</span>}
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
