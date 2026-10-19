/**
 * Les habitats du jeu : la recette qui fait apparaître un Pokémon.
 *
 * À ne pas confondre avec les deux autres « habitats » de l'app : l'habitat idéal de
 * pokemon.json (Lumineux, Sombre…) est un climat, et l'habitat qu'on compose dans la vue
 * du même nom est un enclos de colocataires. Ici, c'est l'Habitadex du jeu — « quatre
 * Herbes vertes », et un Bulbizarre finit par passer (cf. scripts/importer-serebii-habitats.mjs).
 *
 * Importé par la seule fiche Pokémon, chargée à la demande : les 254 recettes et leurs
 * vignettes ne pèsent pas sur le reste de l'app.
 */

import fichier from './habitats.json'
import { FR_DEX } from './index'

const modulesVignettes = import.meta.glob('./sprites/habitats/*.webp', {
  query: '?url',
  import: 'default',
  eager: true,
})
const vignettes = new Map(
  Object.entries(modulesVignettes).map(([chemin, url]) => [
    chemin.split('/').pop().replace(/\.webp$/i, ''),
    url,
  ]),
)

export const FR_RARETE = { commun: 'Commun', rare: 'Rare', 'tres-rare': 'Très rare' }
/** Une étoile par cran, comme l'Habitadex du jeu. */
export const ETOILES_RARETE = { commun: 1, rare: 2, 'tres-rare': 3 }
export const FR_MOMENT = { matin: 'matin', jour: 'jour', soir: 'soir', nuit: 'nuit' }
export const FR_METEO = { soleil: 'soleil', nuages: 'nuages', pluie: 'pluie' }

export const habitatsJeu = fichier.habitats

/** URL de la vignette d'un habitat, ou null. */
export const vignetteHabitat = (habitat) => vignettes.get(habitat.image) || null

/** « Habitadex #004 », « Habitadex Bassin #004 » : chaque section repart de #001, comme les Pokédex. */
export const numeroHabitat = (habitat) =>
  habitat.dex === 'principal'
    ? `Habitadex #${habitat.numero}`
    : `Habitadex ${FR_DEX[habitat.dex].replace(' (DLC)', '')} #${habitat.numero}`

/**
 * nom anglais de Pokémon -> les habitats qui l'attirent, chacun avec ce que la recette lui
 * réserve (rareté, moments, météo). Les plus sûrs d'abord : un habitat où il est commun
 * passe avant celui où il est très rare.
 */
const parPokemon = new Map()
for (const habitat of habitatsJeu)
  for (const venue of habitat.pokemon) {
    if (!parPokemon.has(venue.nom)) parPokemon.set(venue.nom, [])
    parPokemon.get(venue.nom).push({ habitat, venue })
  }
for (const liste of parPokemon.values())
  liste.sort(
    (a, b) =>
      (ETOILES_RARETE[a.venue.rarete] || 9) - (ETOILES_RARETE[b.venue.rarete] || 9) ||
      a.habitat.requis.length - b.habitat.requis.length,
  )

const VIDE = []
export const habitatsJeuDe = (nom) => parPokemon.get(nom) || VIDE
