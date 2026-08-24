import { useSyncExternalStore } from 'react'
import { MAX_COLOCATAIRES, pokemonParNom } from '../data'

/**
 * Les habitats enregistrés, dans le localStorage du navigateur.
 *
 * Un habitat = un nom et de un à quatre Pokémon. Rien d'autre n'est stocké : les objets,
 * les préférences et les avertissements se recalculent à l'affichage, donc un habitat
 * enregistré aujourd'hui reste juste si les listes de Serebii bougent demain.
 *
 * Le store est partagé (`useSyncExternalStore`) parce que deux vues le lisent en même
 * temps : la liste des habitats et le sélecteur, qui grise les Pokémon déjà placés.
 */

const CLE = 'pokopia:habitats'

let cache = null
const abonnes = new Set()

/** Une entrée valide : un id, un nom, et des Pokémon connus, sans doublon, au plus quatre. */
function assainir(brut) {
  if (!brut || typeof brut !== 'object') return null
  const pokemon = Array.isArray(brut.pokemon)
    ? [...new Set(brut.pokemon.filter((n) => pokemonParNom.has(n)))].slice(0, MAX_COLOCATAIRES)
    : []
  if (!pokemon.length) return null
  return {
    id: typeof brut.id === 'string' && brut.id ? brut.id : nouvelId(),
    nom: typeof brut.nom === 'string' && brut.nom.trim() ? brut.nom.trim() : 'Habitat',
    pokemon,
    creeLe: typeof brut.creeLe === 'number' ? brut.creeLe : Date.now(),
  }
}

function lireDisque() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) || '[]')
    return Array.isArray(brut) ? brut.map(assainir).filter(Boolean) : []
  } catch {
    // Stockage indisponible (navigation privée) ou contenu corrompu : on repart à vide
    // plutôt que de faire tomber la page.
    return []
  }
}

function ecrireDisque(habitats) {
  cache = habitats
  try {
    localStorage.setItem(CLE, JSON.stringify(habitats))
  } catch {
    /* la session garde quand même les habitats en mémoire */
  }
  for (const abonne of abonnes) abonne()
}

const nouvelId = () =>
  globalThis.crypto?.randomUUID?.() ?? `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/* ---------- lecture ---------- */

export function habitats() {
  if (cache === null) cache = lireDisque()
  return cache
}

const abonner = (callback) => {
  abonnes.add(callback)
  return () => abonnes.delete(callback)
}

/** Les habitats enregistrés, re-rendus à chaque modification. */
export const useHabitats = () => useSyncExternalStore(abonner, habitats, () => [])

/** L'habitat où vit ce Pokémon, ou null. Un Pokémon n'appartient qu'à un seul habitat. */
export const habitatDuPokemon = (liste, nom) => liste.find((h) => h.pokemon.includes(nom)) || null

/* ---------- écriture ---------- */

export function creerHabitat(nom, pokemon) {
  const habitat = assainir({ id: nouvelId(), nom, pokemon, creeLe: Date.now() })
  if (!habitat) return null
  ecrireDisque([...habitats(), habitat])
  return habitat
}

export function modifierHabitat(id, changements) {
  let modifie = null
  const suivant = habitats().map((h) => {
    if (h.id !== id) return h
    modifie = assainir({ ...h, ...changements })
    return modifie || h
  })
  ecrireDisque(suivant)
  return modifie
}

export function supprimerHabitat(id) {
  ecrireDisque(habitats().filter((h) => h.id !== id))
}

/* ---------- sauvegarde ---------- */

/**
 * Les habitats vivent dans le localStorage d'une origine précise : vider les données du
 * site, changer de navigateur ou passer de la version web à l'exe les laisse derrière.
 * L'export est le seul moyen de les emporter — et le seul filet si quelque chose les efface.
 */
export const exporterHabitats = () =>
  JSON.stringify({ format: 'pokopia:habitats', version: 1, habitats: habitats() }, null, 2)

/**
 * Ajoute les habitats d'un export sans toucher aux existants : un identifiant déjà présent
 * est ignoré plutôt qu'écrasé, pour qu'un import de trop ne détruise rien.
 *
 * @returns {{ajoutes: number, ignores: number} | {erreur: string}}
 */
export function importerHabitats(texte) {
  let brut
  try {
    brut = JSON.parse(texte)
  } catch {
    return { erreur: 'Ce n’est pas du JSON valide.' }
  }

  const liste = Array.isArray(brut) ? brut : brut?.habitats
  if (!Array.isArray(liste)) return { erreur: 'Aucune liste d’habitats trouvée dans ce texte.' }

  const valides = liste.map(assainir).filter(Boolean)
  if (!valides.length) return { erreur: 'Aucun habitat exploitable : Pokémon inconnus ou entrées vides.' }

  const existants = habitats()
  const connus = new Set(existants.map((h) => h.id))
  const nouveaux = valides.filter((h) => !connus.has(h.id))
  if (nouveaux.length) ecrireDisque([...existants, ...nouveaux])

  return { ajoutes: nouveaux.length, ignores: valides.length - nouveaux.length }
}
