/**
 * Les six villes de Pokopia, et le rattachement de chaque Pokémon à l'une d'elles.
 *
 * L'île se parcourt région par région : Terrassec ouvre la partie, Grisemer et Collinangle
 * se débloquent ensuite, Flotîles-Millefeux vient après les deux, Ville-Nouvelle est le
 * terrain libre du joueur, et Fonds Bulleux est le bassin du DLC.
 *
 * ── Ce qui est officiel, et ce qui ne l'est pas ──────────────────────────────────────────
 *
 * Aucune source ne publie la ville d'origine des Pokémon : ni Serebii (dont la table ne
 * porte que numéro, nom et spécialité), ni Pokébip, ni les guides de zones. Le rattachement
 * a donc trois provenances, que l'affichage distingue toujours :
 *
 *   `liste`    src/data/villes.json — la seule donnée qui fasse autorité. Vide par défaut.
 *   `dex`      le Pokédex lui-même : les 52 entrées du bassin SONT Fonds Bulleux, et les 7
 *              événementielles n'apparaissent que dans la ville du joueur.
 *   `habitat`  déduction maison, depuis l'habitat idéal — le repli des 307 du principal.
 *
 * La déduction n'est pas un placeholder arbitraire : chaque ville a un climat, et c'est ce
 * climat que le jeu appelle « habitat idéal ». Terrassec est en plein soleil, Grisemer est
 * un port gris et humide, Collinangle est minérale — sèche en surface, froide dans ses
 * galeries —, Flotîles-Millefeux porte ses mille feux. Elle reste une déduction, et
 * n'importe quel Pokémon se réattribue à la main (cf. src/utils/villesStorage.js).
 */

import fichierVilles from './villes.json'
import { FR_HABITAT, pokemon, pokemonParNom } from './index'

/**
 * Les villes, dans l'ordre où l'île se découvre. `teinte` est la clé de la couleur écrite
 * dans src/index.css (`--v-terrassec`…) ; `personnalisable` marque celle que le joueur
 * nomme lui-même.
 */
export const VILLES = [
  {
    cle: 'terrassec',
    nom: 'Terrassec',
    resume: 'La région de départ : terrasses cultivées, plein soleil.',
    habitats: ['Bright'],
  },
  {
    cle: 'grisemer',
    nom: 'Grisemer',
    resume: 'Le port gris et ses épaves, à l’est de Terrassec.',
    habitats: ['Dark', 'Humid'],
  },
  {
    cle: 'collinangle',
    nom: 'Collinangle',
    resume: 'Les collines minières : cuivre, calcaire, galeries froides.',
    habitats: ['Dry', 'Cool'],
  },
  {
    cle: 'flotiles',
    nom: 'Flotîles-Millefeux',
    resume: 'Les îles reliées par des ponts, autour de la tour en ruine.',
    habitats: ['Warm'],
  },
  {
    cle: 'ville-nouvelle',
    nom: 'Ville-Nouvelle',
    resume: 'Le terrain libre, sans contrainte de récit — la ville du joueur.',
    habitats: [],
    personnalisable: true,
  },
  {
    cle: 'fonds-bulleux',
    nom: 'Fonds Bulleux',
    resume: 'Le bassin du DLC, et son Pokédex de 52 entrées.',
    habitats: [],
  },
]

export const CLES_VILLE = VILLES.map((v) => v.cle)
export const villeParCle = new Map(VILLES.map((v) => [v.cle, v]))

/** Une clé de ville reconnue — tout ce qui vient du stockage ou d'un import passe par là. */
export const cleVilleValide = (cle) => typeof cle === 'string' && villeParCle.has(cle)

/** Nom de la ville tel qu'écrit dans les données, sans le renommage du joueur. */
export const nomVilleParDefaut = (cle) => villeParCle.get(cle)?.nom || cle

/** Ce que la déduction prête à chaque ville : l'inverse de `VILLES[].habitats`. */
export const HABITAT_VERS_VILLE = Object.fromEntries(
  VILLES.flatMap((v) => v.habitats.map((h) => [h, v.cle])),
)

/** Un Pokédex entier vaut une ville : le bassin EST Fonds Bulleux. */
export const DEX_VERS_VILLE = { bassin: 'fonds-bulleux', evenement: 'ville-nouvelle' }

/** D'où vient le rattachement affiché — l'app ne présente jamais une déduction comme un fait. */
export const FR_SOURCE_VILLE = {
  perso: 'réattribué à la main',
  liste: 'liste officielle',
  dex: 'donné par le Pokédex',
  habitat: 'déduit de l’habitat idéal',
}

/** Les attributions qui font autorité, si le fichier en porte. */
const officielles = new Map(
  Object.entries(fichierVilles.attributions || {}).filter(([, cle]) => cleVilleValide(cle)),
)

/** Combien d'entrées de villes.json ont été retenues — affiché sur la page Villes. */
export const nbOfficielles = officielles.size

/**
 * La ville d'un Pokémon avant toute réattribution du joueur, et d'où elle vient.
 *
 * @returns {{cle: string, source: 'liste'|'dex'|'habitat'}}
 */
function calculerDefaut(nom) {
  const officielle = officielles.get(nom)
  if (officielle) return { cle: officielle, source: 'liste' }

  const infos = pokemonParNom.get(nom)
  const parDex = DEX_VERS_VILLE[infos?.dex]
  if (parDex) return { cle: parDex, source: 'dex' }

  // Repli : l'habitat idéal. Un Pokémon sans habitat connu échoue à Terrassec, la région
  // de départ — c'est là qu'on le croise en premier, faute de mieux.
  return { cle: HABITAT_VERS_VILLE[infos?.habitat] || 'terrassec', source: 'habitat' }
}

/** Calculé une fois à l'import : la page Villes croise les 366 entrées à chaque frappe. */
export const villeParDefautParNom = new Map(pokemon.map((p) => [p.en, calculerDefaut(p.en)]))

/** La ville par défaut d'un Pokémon, sans les réattributions. */
export const villeParDefaut = (nom) => villeParDefautParNom.get(nom)?.cle || 'terrassec'

/** L'habitat idéal des Pokémon que la déduction envoie dans cette ville, en français. */
export const habitatsDeVille = (cle) =>
  (villeParCle.get(cle)?.habitats || []).map((h) => FR_HABITAT[h] || h)
