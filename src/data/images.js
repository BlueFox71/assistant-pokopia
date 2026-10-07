/**
 * Résolution des URL de sprites, mutualisée.
 *
 * Les 1 100 vignettes (734 objets, 366 Pokémon) viennent de l'index des préférences et,
 * pour les 19 meubles d'objets-complement.json, du catalogue de Serebii ; les
 * 48 aliments de Serebii (cf. scripts/importer-aliments.mjs) : elles sont globées une seule fois ici et indexées dans deux Map, plutôt que
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

const modulesAliments = import.meta.glob('./sprites/aliments/*.webp', {
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
const alimentsParCle = indexer(modulesAliments)

/** URL de la vignette d'un objet, ou null si la clé est inconnue. */
export const urlSpriteObjet = (cle) => (cle && objetsParCle.get(cle)) || null

/** URL de la vignette d'un Pokémon, ou null si la clé est inconnue. */
export const urlSpritePokemon = (cle) => (cle && pokemonParCle.get(cle)) || null

/** URL de la vignette d'un aliment, ou null si la clé est inconnue. */
export const urlSpriteAliment = (cle) => (cle && alimentsParCle.get(cle)) || null

/*
 * Les icônes du jeu, découpées dans des captures (assets/) : une par spécialité, nommée
 * d'après son nom français sans accents (`coupe-de-bois`), et une par ville, nommée
 * d'après sa clé dans data/villes.js (`flotiles`).
 */

const modulesSpecialites = import.meta.glob('./sprites/specialites/*.webp', {
  query: '?url',
  import: 'default',
  eager: true,
})

const modulesVilles = import.meta.glob('./sprites/villes/*.webp', {
  query: '?url',
  import: 'default',
  eager: true,
})

const specialitesParCle = indexer(modulesSpecialites)
const villesParCle = indexer(modulesVilles)

/** « Coupe de bois » -> `coupe-de-bois`, « Île Rêve » -> `ile-reve`. */
const cleSpecialite = (nom) =>
  nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')

/** URL de l'icône d'une spécialité, d'après son nom français, ou null. */
export const urlIconeSpecialite = (nom) => (nom && specialitesParCle.get(cleSpecialite(nom))) || null

/** URL de l'icône d'une ville, d'après sa clé, ou null. */
export const urlIconeVille = (cle) => (cle && villesParCle.get(cle)) || null
