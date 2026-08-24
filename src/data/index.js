/**
 * Modèle de données de l'index des préférences de Pokémon Pokopia.
 *
 * Trois fichiers plats, extraits une fois pour toutes par `scripts/extraire-artifact.mjs` :
 *   • preferences.json — les 43 préférences, chacune avec ses objets et ses Pokémon ;
 *   • objets.json      — 714 objets : nom anglais, traduction, catégorie en jeu, sprite ;
 *   • pokemon.json     — 366 Pokémon : nom anglais, nom français, numéro Pokopia, habitat.
 *
 * Les relations sont inversées ici, à l'import, plutôt que recalculées à chaque rendu :
 * l'index affiche jusqu'à 3 000 vignettes déplié, et la vue habitat croise quatre
 * Pokémon avec leurs 43 préférences à chaque frappe.
 */

import preferencesBrutes from './preferences.json'
import objetsBruts from './objets.json'
import pokemonBruts from './pokemon.json'

/** Nombre maximum de colocataires d'un même habitat. */
export const MAX_COLOCATAIRES = 4

/** Les catégories d'objets du jeu. Un habitat « exceptionnel » demande au moins un de chaque. */
export const FR_CATEGORIE = { Relaxation: 'Repos', Decoration: 'Décoration', Toy: 'Jouet', Road: 'Route' }

/** Les six habitats idéaux. Deux Pokémon d'habitats différents ne peuvent pas cohabiter. */
export const FR_HABITAT = { Bright: 'Lumineux', Dark: 'Sombre', Humid: 'Humide', Dry: 'Sec', Warm: 'Chaud', Cool: 'Froid' }

/** Libellés des 18 types, dont les clés viennent de Pokébip (sans accents, en minuscules). */
export const FR_TYPE = {
  acier: 'Acier',
  combat: 'Combat',
  dragon: 'Dragon',
  eau: 'Eau',
  electrik: 'Électrik',
  fee: 'Fée',
  feu: 'Feu',
  glace: 'Glace',
  insecte: 'Insecte',
  normal: 'Normal',
  plante: 'Plante',
  poison: 'Poison',
  psy: 'Psy',
  roche: 'Roche',
  sol: 'Sol',
  spectre: 'Spectre',
  tenebres: 'Ténèbres',
  vol: 'Vol',
}

export const preferences = preferencesBrutes
export const objets = objetsBruts
export const pokemon = pokemonBruts

export const prefParSlug = new Map(preferences.map((p) => [p.slug, p]))
export const objetParNom = new Map(objets.map((o) => [o.en, o]))
export const pokemonParNom = new Map(pokemon.map((p) => [p.en, p]))

/** nom anglais d'objet -> slugs des préférences qu'il satisfait, dans l'ordre des cartes. */
export const prefsParObjet = new Map()
/** nom anglais de Pokémon -> slugs des préférences qu'il apprécie. */
export const prefsParPokemon = new Map()

for (const pref of preferences) {
  for (const nom of pref.objets) {
    if (!prefsParObjet.has(nom)) prefsParObjet.set(nom, [])
    prefsParObjet.get(nom).push(pref.slug)
  }
  for (const nom of pref.pokemon) {
    if (!prefsParPokemon.has(nom)) prefsParPokemon.set(nom, [])
    prefsParPokemon.get(nom).push(pref.slug)
  }
}

/* ---------- libellés ---------- */

const OBJET_INCONNU = { fr: null, categorie: null, sprite: null }
const POKEMON_INCONNU = { fr: null, numero: null, habitat: null, sprite: null, types: [], specialites: [] }
const VIDE = []

const infosObjet = (nom) => objetParNom.get(nom) || OBJET_INCONNU
const infosPokemon = (nom) => pokemonParNom.get(nom) || POKEMON_INCONNU

/** Nom français d'un objet, avec repli sur l'anglais. */
export const frObjet = (nom) => infosObjet(nom).fr || nom
/** Nom français d'un Pokémon, avec repli sur l'anglais. */
export const frPokemon = (nom) => infosPokemon(nom).fr || nom
/** Catégorie en jeu (« Repos », « Décoration »…) ; vide pour les 266 matériaux et revêtements. */
export const categorieDe = (nom) => FR_CATEGORIE[infosObjet(nom).categorie] || ''
/** Habitat idéal d'un Pokémon (« Humide », « Chaud »…). */
export const habitatDe = (nom) => FR_HABITAT[infosPokemon(nom).habitat] || ''
/**
 * Pokopia tient trois Pokédex, et chacun repart de #001 : le principal (307 entrées), celui
 * du Bubbly Basin (52, DLC) et l'événementiel (7). Un numéro seul est donc ambigu — Onix est
 * #030 du principal, Mamanbo #030 du bassin — d'où le préfixe à l'affichage et le tri par
 * Pokédex d'abord.
 */
export const ORDRE_DEX = { principal: 0, bassin: 1, evenement: 2 }
export const FR_DEX = { principal: 'Pokédex principal', bassin: 'Bassin (DLC)', evenement: 'Événement' }
/** Préfixe court, vide pour le Pokédex principal : le cas courant n'a pas à être qualifié. */
const PREFIXE_DEX = { principal: '', bassin: 'Bassin ', evenement: 'Événement ' }

/** Numéro brut, sur trois chiffres, sans son Pokédex — pour le tri et les comparaisons. */
export const numeroDe = (nom) => infosPokemon(nom).numero || ''
export const dexDe = (nom) => infosPokemon(nom).dex || 'principal'

/** Numéro tel qu'on l'affiche : « #030 », « Bassin #030 ». */
export const numeroAffiche = (nom) => {
  const numero = numeroDe(nom)
  return numero ? `${PREFIXE_DEX[dexDe(nom)] ?? ''}#${numero}` : ''
}

/**
 * Types et spécialité viennent de Pokébip, dont le Pokédex s'arrête à 303 espèces : 78 de
 * nos entrées — les Pokémon aquatiques, pour l'essentiel — n'en ont pas encore. Les deux
 * accesseurs renvoient donc un tableau vide plutôt que d'échouer, et l'affichage se
 * contente de sauter la ligne.
 */
export const typesDe = (nom) => infosPokemon(nom).types || VIDE
/** La spécialité est le travail que le Pokémon accomplit sur l'île. Certains en ont deux. */
export const specialitesDe = (nom) => infosPokemon(nom).specialites || VIDE

/** Les types présents dans les données, dans l'ordre des libellés français. */
export const typesUtilises = [...new Set(pokemon.flatMap((p) => p.types || []))].sort((a, b) =>
  (FR_TYPE[a] || a).localeCompare(FR_TYPE[b] || b, 'fr'),
)

/** Les spécialités présentes dans les données, par ordre alphabétique. */
export const specialitesUtilisees = [...new Set(pokemon.flatMap((p) => p.specialites || []))].sort(
  (a, b) => a.localeCompare(b, 'fr'),
)
export const spriteObjet = (nom) => infosObjet(nom).sprite
export const spritePokemon = (nom) => infosPokemon(nom).sprite

/**
 * Tri par numéro : le Pokédex d'abord — sans quoi Mamanbo, #030 du bassin, s'intercalerait
 * entre Onix #030 et Rhinocorne #031 du principal — puis le numéro. Les formes d'une même
 * espèce partagent un numéro (Sancoki et Sancoki Mer Est) : le nom français les départage
 * pour que l'ordre reste stable.
 */
export const comparerParNumero = (a, b) =>
  (ORDRE_DEX[dexDe(a)] ?? 9) - (ORDRE_DEX[dexDe(b)] ?? 9) ||
  (Number(numeroDe(a)) || 999) - (Number(numeroDe(b)) || 999) ||
  frPokemon(a).localeCompare(frPokemon(b), 'fr')

/* ---------- vue habitat ---------- */

/** Préférences réunies par un groupe de colocataires, dédoublonnées, dans l'ordre de l'index. */
export function preferencesDuGroupe(noms) {
  const reunies = new Set()
  for (const nom of noms) for (const slug of prefsParPokemon.get(nom) || []) reunies.add(slug)
  return preferences.filter((p) => reunies.has(p.slug)).map((p) => p.slug)
}

/**
 * Compatibilité d'un groupe, de 0 à 100.
 *
 * On moyenne le recouvrement de chaque PAIRE — préférences communes ÷ préférences réunies —
 * plutôt que de prendre l'intersection de tout le groupe : à quatre, cette intersection est
 * presque toujours vide, et le score resterait bloqué à zéro sans rien distinguer. La
 * moyenne par paire, elle, récompense chaque affinité, même partielle.
 *
 * Deux Pokémon aux goûts identiques donnent 100, deux Pokémon sans aucune préférence commune
 * donnent 0. Un Pokémon seul n'a personne avec qui s'entendre : la fonction renvoie null,
 * et l'affichage saute la mention.
 *
 * Le score ne dit rien de l'habitat idéal — deux Pokémon très compatibles peuvent être l'un
 * Chaud et l'autre Froid, ce qu'un enclos ne peut pas satisfaire. C'est l'avertissement
 * d'habitat, séparé, qui s'en charge.
 */
export function compatibilite(noms) {
  if (noms.length < 2) return null
  const prefs = noms.map((n) => new Set(prefsParPokemon.get(n) || []))
  let total = 0
  let paires = 0
  for (let i = 0; i < prefs.length; i++) {
    for (let j = i + 1; j < prefs.length; j++) {
      const communes = [...prefs[i]].filter((s) => prefs[j].has(s)).length
      const reunies = new Set([...prefs[i], ...prefs[j]]).size
      total += reunies ? communes / reunies : 0
      paires += 1
    }
  }
  return Math.round((total / paires) * 100)
}

/** Ce que deviendrait la compatibilité si `candidat` rejoignait `noms`. */
export const compatibiliteAvec = (noms, candidat) =>
  noms.includes(candidat) ? compatibilite(noms) : compatibilite([...noms, candidat])

/** Les préférences que TOUT le groupe apprécie — le socle sur lequel un objet contente tout le monde. */
export function preferencesCommunes(noms) {
  if (!noms.length) return []
  return (prefsParPokemon.get(noms[0]) || []).filter((slug) =>
    noms.every((n) => (prefsParPokemon.get(n) || []).includes(slug)),
  )
}

/** Parmi `noms`, ceux qui apprécient la préférence `slug`. */
export const amateursDe = (noms, slug) =>
  noms.filter((nom) => (prefsParPokemon.get(nom) || []).includes(slug))

/**
 * Objets à poser pour un groupe, classés par utilité décroissante.
 *
 * Un objet vaut d'abord par le **nombre de colocataires** qu'il satisfait — un objet
 * « 3 Pokémon » vaut mieux que trois objets séparés — puis par le nombre de préférences
 * qu'il coche. `slugsActifs` restreint le calcul aux préférences filtrées ; le filtre
 * est cumulatif, donc en ajouter une élargit la liste.
 *
 * Retourne `[{ nom, prefs, pokemonSatisfaits }]`.
 */
export function objetsPourGroupe(noms, slugsActifs) {
  const prefsParNom = new Map()
  for (const slug of slugsActifs) {
    for (const nom of prefParSlug.get(slug)?.objets || []) {
      if (!prefsParNom.has(nom)) prefsParNom.set(nom, [])
      prefsParNom.get(nom).push(slug)
    }
  }

  const resultat = []
  for (const [nom, prefs] of prefsParNom) {
    resultat.push({
      nom,
      prefs,
      pokemonSatisfaits: noms.filter((m) =>
        prefs.some((slug) => (prefsParPokemon.get(m) || []).includes(slug)),
      ),
    })
  }

  resultat.sort(
    (a, b) =>
      b.pokemonSatisfaits.length - a.pokemonSatisfaits.length ||
      b.prefs.length - a.prefs.length ||
      frObjet(a.nom).localeCompare(frObjet(b.nom), 'fr'),
  )
  return resultat
}
