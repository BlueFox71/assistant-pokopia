/**
 * Résolution des URL de sprites, mutualisée.
 *
 * Les 1 081 vignettes (715 objets, 366 Pokémon) viennent de l'index des préférences :
 * elles sont globées une seule fois ici et indexées dans deux Map, plutôt que
 * re-résolues à chaque rendu de vignette — l'index affiche jusqu'à 3 000 chips d'un
 * coup quand tout est déplié.
 *
 * Le nom de fichier est la clé de sprite portée par `objets.json` / `pokemon.json`
 * (`plainchest`, `025`, `422-shelloseastsea`…), pas le nom de l'objet.
 */

const modulesObjets = import.meta.glob('./sprites/objets/*.webp', {
  query: '?url',
  import: 'default',
  eager: true,
})

const modulesPokemon = import.meta.glob('./sprites/pokemon/*.webp', {
  query: '?url',
  import: 'default',
  eager: true,
})

/** `./sprites/objets/plainchest.webp` -> `plainchest` */
const cleDepuisChemin = (chemin) =>
  (chemin.split('/').pop() || '').replace(/\.webp$/i, '')

function indexer(modules) {
  const index = new Map()
  for (const chemin of Object.keys(modules)) index.set(cleDepuisChemin(chemin), modules[chemin])
  return index
}

const objetsParCle = indexer(modulesObjets)
const pokemonParCle = indexer(modulesPokemon)

/** URL de la vignette d'un objet, ou null si la clé est inconnue. */
export const urlSpriteObjet = (cle) => (cle && objetsParCle.get(cle)) || null

/** URL de la vignette d'un Pokémon, ou null si la clé est inconnue. */
export const urlSpritePokemon = (cle) => (cle && pokemonParCle.get(cle)) || null
