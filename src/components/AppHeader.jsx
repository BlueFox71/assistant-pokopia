import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Dropdown, Tooltip } from 'antd'
import { IconeBriques, IconeCaisse, IconeListe, IconeMaison, IconePokeball, IconeTerrasse } from './Icones'
import { useTheme } from '../context/ThemeContext'
import { SIMULATIONS, urlSimulation } from '../pages/simulations'
import './AppHeader.css'

const ONGLETS = [
  { to: '/habitat', libelle: 'Habitat', Icone: IconeMaison },
  { to: '/villes', libelle: 'Villes', Icone: IconeTerrasse },
  { to: '/preferences', libelle: 'Préférences', Icone: IconeListe },
  { to: '/objets', libelle: 'Objets', Icone: IconeCaisse },
  { to: '/pokedex', libelle: 'Pokédex', Icone: IconePokeball },
  // Construction déroule ses simulations au survol : on va droit à celle qu'on veut.
  { to: '/construction', libelle: 'Construction', Icone: IconeBriques, sousMenu: SIMULATIONS },
]

/** Bandeau commun : identité, navigation, bascule de thème. */
export default function AppHeader() {
  const { choix, setChoix, sombre } = useTheme()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  // La simulation ouverte, pour la marquer dans le sous-menu (aucune sur l'accueil de la vue).
  const simActive = pathname === '/construction' ? new URLSearchParams(search).get('sim') : null

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
          {ONGLETS.map(({ to, libelle, Icone, sousMenu }) => {
            const lien = (
              <NavLink key={to} to={to} className="onglet">
                <Icone />
                {libelle}
              </NavLink>
            )
            if (!sousMenu) return lien
            return (
              <Dropdown
                key={to}
                menu={{
                  items: sousMenu.map((s) => ({ key: s.cle, label: s.libelle })),
                  selectedKeys: simActive ? [simActive] : [],
                  onClick: ({ key }) => navigate(urlSimulation(key)),
                }}
                placement="bottomLeft"
              >
                {lien}
              </Dropdown>
            )
          })}
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
