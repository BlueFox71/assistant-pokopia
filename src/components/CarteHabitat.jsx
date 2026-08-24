import { Popconfirm } from 'antd'
import { ICONE_HABITAT } from './Icones'
import { urlSpritePokemon } from '../data/images'
import {
  comparerParNumero,
  compatibilite,
  frPokemon,
  habitatDe,
  pokemonParNom,
  preferencesDuGroupe,
  spritePokemon,
} from '../data'
import './CarteHabitat.css'

/**
 * La tuile d'un habitat enregistré, partagée par l'accueil et la liste des habitats.
 *
 * Tout ce qu'elle affiche est recalculé à l'affichage — préférences réunies, compatibilité,
 * habitat commun — parce que le stockage ne retient qu'un nom et des Pokémon : un habitat
 * enregistré avant une mise à jour des données reste juste.
 *
 * `onSupprimer` est facultatif : l'accueil montre les habitats, la liste les gère.
 */
export default function CarteHabitat({ habitat, onOuvrir, onSupprimer }) {
  const tries = [...habitat.pokemon].sort(comparerParNumero)
  const zones = [...new Set(tries.map(habitatDe).filter(Boolean))]
  const prefs = preferencesDuGroupe(tries)
  const taux = compatibilite(tries)
  // Le liseré de la carte prend la couleur de l'habitat commun ; mêlés, il reste neutre.
  const brut = zones.length === 1 ? pokemonParNom.get(tries[0])?.habitat : null
  const IconeHab = brut ? ICONE_HABITAT[brut] : null

  return (
    <section
      className={'carte-habitat' + (brut ? ' teintee' : '')}
      style={brut ? { '--teinte': `var(--h-${brut.toLowerCase()})` } : undefined}
    >
      <button type="button" className="carte-habitat-corps" onClick={() => onOuvrir(habitat)}>
        <span className="carte-habitat-nom">{habitat.nom}</span>
        <span className="carte-habitat-sprites">
          {tries.map((nom) => (
            <img
              key={nom}
              src={urlSpritePokemon(spritePokemon(nom))}
              alt={frPokemon(nom)}
              title={frPokemon(nom)}
              width="48"
              height="48"
            />
          ))}
        </span>
        <span className="carte-habitat-meta">
          {tries.length} Pokémon · {prefs.length} préférences ·{' '}
          {zones.length === 1 ? (
            <span className="marque-habitat" style={{ color: 'var(--teinte)' }}>
              {IconeHab && <IconeHab />}
              {zones[0].toLowerCase()}
            </span>
          ) : (
            `${zones.length} habitats mêlés`
          )}
          {taux !== null && (
            <>
              {' · '}
              <b className={taux >= 40 ? 'fort' : taux >= 15 ? 'moyen' : 'faible'}>{taux} % compat.</b>
            </>
          )}
        </span>
      </button>

      {onSupprimer && (
        <Popconfirm
          title={`Supprimer « ${habitat.nom} » ?`}
          description="Les Pokémon redeviennent disponibles pour un autre habitat."
          okText="Supprimer"
          cancelText="Annuler"
          okButtonProps={{ danger: true }}
          onConfirm={() => onSupprimer(habitat.id)}
        >
          <button type="button" className="retirer" aria-label={`Supprimer ${habitat.nom}`}>
            ×
          </button>
        </Popconfirm>
      )}
    </section>
  )
}
