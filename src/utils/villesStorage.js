import { useSyncExternalStore } from 'react'
import { pokemonParNom } from '../data'
import {
  CLES_VILLE,
  cleVilleValide,
  nomVilleParDefaut,
  villeParDefaut,
  villeParDefautParNom,
} from '../data/villes'

/**
 * Les réattributions de ville, dans le localStorage du navigateur.
 *
 * La ville par défaut d'un Pokémon est une déduction (cf. src/data/villes.js) : elle doit
 * pouvoir être corrigée. Ce module ne stocke donc que les ÉCARTS — « celui-là, je l'ai vu
 * ailleurs » — et rien d'autre. Un Pokémon absent du stockage suit la déduction, ce qui veut
 * dire qu'une future liste officielle corrigera d'un coup tout ce qui n'a pas été réattribué
 * à la main, sans écraser les corrections du joueur.
 *
 * Deux clés, pour deux choses différentes :
 *   `pokopia:villes`      { nom anglais -> clé de ville }, les écarts ;
 *   `pokopia:villes:noms` { clé de ville -> nom }, le renommage de Ville-Nouvelle.
 *
 * Même schéma que src/utils/habitatsStorage.js : un store partagé, parce que la page Villes,
 * le sélecteur d'habitat et les fiches lisent tous le rattachement en même temps.
 */

const CLE = 'pokopia:villes'
const CLE_NOMS = 'pokopia:villes:noms'

let cache = null
let cacheNoms = null
const abonnes = new Set()

/** N'accepte que les Pokémon connus et les villes connues, et jette les écarts nuls. */
function assainir(brut) {
  const propre = {}
  if (!brut || typeof brut !== 'object') return propre
  for (const [nom, cle] of Object.entries(brut)) {
    if (!pokemonParNom.has(nom) || !cleVilleValide(cle)) continue
    // Réattribuer un Pokémon là où la déduction le mettait déjà ne mérite pas d'être écrit :
    // on garde l'écart, pas la redite — sinon une future liste officielle serait masquée par
    // des attributions « manuelles » que le joueur n'a jamais choisies.
    if (villeParDefaut(nom) === cle) continue
    propre[nom] = cle
  }
  return propre
}

function assainirNoms(brut) {
  const propre = {}
  if (!brut || typeof brut !== 'object') return propre
  for (const [cle, nom] of Object.entries(brut)) {
    if (!cleVilleValide(cle) || typeof nom !== 'string') continue
    const propreNom = nom.trim().slice(0, 40)
    if (propreNom && propreNom !== nomVilleParDefaut(cle)) propre[cle] = propreNom
  }
  return propre
}

function lireDisque(cleStockage, nettoyer) {
  try {
    return nettoyer(JSON.parse(localStorage.getItem(cleStockage) || '{}'))
  } catch {
    // Stockage indisponible (navigation privée) ou contenu corrompu : on repart des
    // déductions plutôt que de faire tomber la page.
    return {}
  }
}

function ecrire(cleStockage, valeur) {
  try {
    localStorage.setItem(cleStockage, JSON.stringify(valeur))
  } catch {
    /* la session garde quand même la réattribution en mémoire */
  }
  for (const abonne of abonnes) abonne()
}

/* ---------- lecture ---------- */

export function attributions() {
  if (cache === null) cache = lireDisque(CLE, assainir)
  return cache
}

export function nomsVilles() {
  if (cacheNoms === null) cacheNoms = lireDisque(CLE_NOMS, assainirNoms)
  return cacheNoms
}

const abonner = (callback) => {
  abonnes.add(callback)
  return () => abonnes.delete(callback)
}

const VIDE = {}

/** Les réattributions, re-rendues à chaque modification. */
export const useAttributions = () => useSyncExternalStore(abonner, attributions, () => VIDE)

/** Les noms personnalisés de villes, re-rendus à chaque modification. */
export const useNomsVilles = () => useSyncExternalStore(abonner, nomsVilles, () => VIDE)

/**
 * La ville d'un Pokémon, réattribution comprise, et d'où elle vient.
 *
 * `attrib` est passé explicitement — comme `habitatDuPokemon(liste, nom)` — pour que les
 * composants mémoïsés se recalculent quand le stockage change.
 *
 * @returns {{cle: string, source: 'perso'|'liste'|'dex'|'habitat'}}
 */
export function villeDe(attrib, nom) {
  const choisie = attrib?.[nom]
  if (choisie && cleVilleValide(choisie)) return { cle: choisie, source: 'perso' }
  return villeParDefautParNom.get(nom) || { cle: 'terrassec', source: 'habitat' }
}

/** La seule clé de ville d'un Pokémon — le cas courant, quand la provenance n'importe pas. */
export const cleVilleDe = (attrib, nom) => villeDe(attrib, nom).cle

/** Le nom d'une ville, renommage du joueur compris. */
export const nomVille = (noms, cle) => noms?.[cle] || nomVilleParDefaut(cle)

/** Les Pokémon de chaque ville : { clé de ville -> noms anglais }, toutes les villes servies. */
export function pokemonParVille(attrib) {
  const par = Object.fromEntries(CLES_VILLE.map((cle) => [cle, []]))
  for (const nom of pokemonParNom.keys()) par[cleVilleDe(attrib, nom)]?.push(nom)
  return par
}

/* ---------- écriture ---------- */

/** Envoie un ou plusieurs Pokémon dans une ville. Renvoie le nombre d'entrées déplacées. */
export function attribuerVille(noms, cle) {
  if (!cleVilleValide(cle)) return 0
  const suivant = { ...attributions() }
  let bouges = 0
  for (const nom of noms) {
    if (!pokemonParNom.has(nom) || cleVilleDe(suivant, nom) === cle) continue
    // Retomber sur la déduction plutôt que d'écrire un écart nul : le jour où villes.json
    // sera rempli, ces Pokémon suivront la liste officielle.
    if (villeParDefaut(nom) === cle) delete suivant[nom]
    else suivant[nom] = cle
    bouges += 1
  }
  if (!bouges) return 0
  cache = suivant
  ecrire(CLE, suivant)
  return bouges
}

/** Rend à ces Pokémon leur ville par défaut. Renvoie le nombre d'écarts effacés. */
export function reinitialiserVille(noms) {
  const suivant = { ...attributions() }
  let effaces = 0
  for (const nom of noms) {
    if (nom in suivant) {
      delete suivant[nom]
      effaces += 1
    }
  }
  if (!effaces) return 0
  cache = suivant
  ecrire(CLE, suivant)
  return effaces
}

/** Renomme une ville. Un nom vide, ou égal au nom d'origine, efface le renommage. */
export function renommerVille(cle, nom) {
  if (!cleVilleValide(cle)) return
  const suivant = { ...nomsVilles() }
  const propre = (nom || '').trim().slice(0, 40)
  if (!propre || propre === nomVilleParDefaut(cle)) delete suivant[cle]
  else suivant[cle] = propre
  cacheNoms = suivant
  ecrire(CLE_NOMS, suivant)
}

/* ---------- sauvegarde ---------- */

/**
 * Les réattributions vivent dans le localStorage d'une origine précise : vider les données
 * du site, changer de navigateur ou passer de la version web à l'exe les laisse derrière.
 * L'export est le seul moyen de les emporter, comme pour les habitats.
 */
export const exporterVilles = () =>
  JSON.stringify(
    { format: 'pokopia:villes', version: 1, noms: nomsVilles(), attributions: attributions() },
    null,
    2,
  )

/**
 * Fusionne un export dans ce qui est déjà là. Contrairement aux habitats — dont l'import
 * n'écrase jamais rien — une réattribution est une correction : la plus récente gagne, sinon
 * réimporter sa sauvegarde après avoir tâtonné ne servirait à rien.
 *
 * @returns {{attributions: number, noms: number} | {erreur: string}}
 */
export function importerVilles(texte) {
  let brut
  try {
    brut = JSON.parse(texte)
  } catch {
    return { erreur: 'Ce n’est pas du JSON valide.' }
  }

  const lues = assainir(brut?.attributions ?? brut)
  const nomsLus = assainirNoms(brut?.noms)
  if (!Object.keys(lues).length && !Object.keys(nomsLus).length)
    return { erreur: 'Aucune réattribution exploitable : Pokémon ou villes inconnus.' }

  cache = { ...attributions(), ...lues }
  cacheNoms = { ...nomsVilles(), ...nomsLus }
  ecrire(CLE, cache)
  ecrire(CLE_NOMS, cacheNoms)
  return { attributions: Object.keys(lues).length, noms: Object.keys(nomsLus).length }
}
