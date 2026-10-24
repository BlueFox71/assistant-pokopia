import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Dropdown, Tooltip } from 'antd'
import { IconeAmpoule, IconeBriques, IconeCaisse, IconeMaison, IconePokeball } from './Icones'
import { useTheme } from '../context/ThemeContext'
import { SIMULATIONS, urlSimulation } from '../pages/simulations'
import './AppHeader.css'

const ONGLETS = [
  // Habitat et Villes partagent un onglet : l'habitat d'abord, les villes au survol.
  {
    to: '/habitat',
    libelle: 'Habitat',
    Icone: IconeMaison,
    sousMenu: [
      { cle: '/habitat', libelle: 'Habitat', to: '/habitat' },
      { cle: '/villes', libelle: 'Villes', to: '/villes' },
    ],
  },
  // Objets, Méthodes et Préférences partagent un onglet : le catalogue d'abord, le reste au survol.
  {
    to: '/objets',
    libelle: 'Objets',
    Icone: IconeCaisse,
    sousMenu: [
      { cle: '/objets', libelle: 'Objets', to: '/objets' },
      { cle: '/methodes', libelle: 'Méthodes de fabrication', to: '/methodes' },
      { cle: '/preferences', libelle: 'Préférences', to: '/preferences' },
    ],
  },
  { to: '/pokedex', libelle: 'Pokédex', Icone: IconePokeball },
  // Construction déroule ses simulations au survol : on va droit à celle qu'on veut.
  {
    to: '/construction',
    libelle: 'Construction',
    Icone: IconeBriques,
    sousMenu: SIMULATIONS.map((s) => ({ cle: s.cle, libelle: s.libelle, to: urlSimulation(s.cle) })),
  },
  { to: '/inspirations', libelle: 'Inspirations', Icone: IconeAmpoule },
]

/** Bandeau commun : identité, navigation, bascule de thème. */
export default function AppHeader() {
  const { choix, setChoix, sombre } = useTheme()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  // L'entrée ouverte, pour la marquer dans son sous-menu : la simulation de Construction
  // (aucune sur l'accueil de la vue), sinon la page elle-même.
  const entreeActive = pathname === '/construction' ? new URLSearchParams(search).get('sim') : pathname

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
            // Un onglet à sous-menu reste allumé sur chacune de ses pages. La classe est une
            // chaîne : le Dropdown d'antd la fusionne avec la sienne, une fonction s'y perdrait.
            const actif = sousMenu?.some((s) => s.to.split('?')[0] === pathname)
            const lien = (
              <NavLink key={to} to={to} className={`onglet${actif ? ' active' : ''}`}>
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
                  selectedKeys: entreeActive ? [entreeActive] : [],
                  onClick: ({ key }) => navigate(sousMenu.find((s) => s.cle === key).to),
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
