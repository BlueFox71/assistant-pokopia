import { useMemo } from 'react'
import { urlSpritePokemon } from '../data/images'
import { frPokemon, pokemon, spritePokemon } from '../data'
import './BandeDefilante.css'

/**
 * Une frise de Pokémon qui traverse la page, en boucle.
 *
 * La grille n'a ni fond ni bordure : seules les vignettes se voient, posées sur des cases
 * de largeur fixe pour que l'espacement reste régulier quelle que soit la silhouette.
 *
 * Le défilement sans couture tient à un détail : la piste contient **deux fois** le même
 * tirage, et l'animation la déplace d'exactement la moitié de sa largeur. Au moment où
 * elle revient à son point de départ, le second exemplaire occupe la place du premier —
 * l'œil ne voit pas le raccord. Sans cette duplication, la boucle sauterait à chaque tour.
 *
 * @param sens    'gauche' (par défaut) ou 'droite'
 * @param nombre  Pokémon tirés au sort ; la piste en affiche le double
 * @param duree   durée d'un tour complet, en secondes
 */
export default function BandeDefilante({ sens = 'gauche', nombre = 22, duree = 70 }) {
  // Tirés une fois pour toutes au montage : un nouveau tirage à chaque rendu ferait
  // clignoter la frise dès la première frappe dans la recherche.
  const tirage = useMemo(() => {
    const disponibles = pokemon.filter((p) => p.sprite)
    const choisis = []
    for (let i = 0; i < nombre; i++) {
      choisis.push(disponibles[Math.floor(Math.random() * disponibles.length)])
    }
    return choisis
  }, [nombre])

  return (
    <div className="bande" aria-hidden="true">
      <div className={'bande-piste ' + sens} style={{ '--duree': `${duree}s` }}>
        {[...tirage, ...tirage].map((p, i) => (
          <span className="bande-case" key={`${p.en}-${i}`}>
            <img src={urlSpritePokemon(p.sprite)} alt="" title={frPokemon(p.en)} loading="eager" />
          </span>
        ))}
      </div>
    </div>
  )
}
