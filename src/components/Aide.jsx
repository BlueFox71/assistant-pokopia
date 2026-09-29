import { Tooltip } from 'antd'

/**
 * Un « ⓘ » qui explique la ligne qu'il suit.
 *
 * Un `title` natif ne s'affiche qu'au survol d'une souris : ni au doigt, ni au clavier. Ici
 * c'est un vrai bouton — il prend le focus — et l'infobulle s'ouvre au survol, au focus
 * comme au toucher. Le texte est aussi son nom accessible : un lecteur d'écran le lit sans
 * avoir à ouvrir quoi que ce soit.
 */
export default function Aide({ texte }) {
  return (
    <Tooltip title={texte} trigger={['hover', 'focus', 'click']} placement="top">
      <button type="button" className="aide" aria-label={texte}>
        ⓘ
      </button>
    </Tooltip>
  )
}
