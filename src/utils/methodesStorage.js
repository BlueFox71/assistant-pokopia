import { useSyncExternalStore } from 'react'

/**
 * Les méthodes de fabrication que le joueur a cochées « connues », dans le localStorage.
 *
 * On ne stocke que des noms anglais, la clé de src/data/methodes.json. Un nom que ce fichier
 * ne connaît plus est GARDÉ : une mise à jour de Serebii peut renommer une ligne, et la coche
 * du joueur ne doit pas disparaître avec. La page ne compte que les noms qu'elle connaît.
 *
 * Ce module n'importe rien de src/data, pour rester testable sous Node
 * (cf. methodesStorage.test.mjs). Même schéma que habitatsStorage.js : un store partagé,
 * parce que la page Méthodes et la fiche objet lisent les coches en même temps.
 */

const CLE = 'pokopia:methodes'

let cache = null
const abonnes = new Set()

const assainir = (brut) => new Set(Array.isArray(brut) ? brut.filter((n) => typeof n === 'string' && n) : [])

function lireDisque() {
  try {
    return assainir(JSON.parse(localStorage.getItem(CLE) || '[]'))
  } catch {
    // Stockage indisponible ou contenu corrompu : on repart à vide plutôt que de faire
    // tomber la page.
    return new Set()
  }
}

function ecrireDisque(suivant) {
  cache = suivant
  try {
    localStorage.setItem(CLE, JSON.stringify([...suivant]))
  } catch {
    /* la session garde quand même les coches en mémoire */
  }
  for (const abonne of abonnes) abonne()
}

/** Pour les tests : oublie le cache, la prochaine lecture repart du stockage. */
export const _reinitialiser = () => {
  cache = null
}

/* ---------- lecture ---------- */

/** Les noms cochés. Le même Set tant que rien ne change, comme l'exige useSyncExternalStore. */
export function connues() {
  if (cache === null) cache = lireDisque()
  return cache
}

const abonner = (callback) => {
  abonnes.add(callback)
  return () => abonnes.delete(callback)
}

const VIDE = new Set()

/** Les méthodes connues, re-rendues à chaque coche. */
export const useConnues = () => useSyncExternalStore(abonner, connues, () => VIDE)

/* ---------- écriture ---------- */

/** Coche (`oui` vrai), décoche (`oui` faux) ou inverse (sans `oui`). */
export function basculer(en, oui) {
  const actuel = connues()
  const voulu = oui === undefined ? !actuel.has(en) : Boolean(oui)
  if (voulu === actuel.has(en)) return
  const suivant = new Set(actuel)
  if (voulu) suivant.add(en)
  else suivant.delete(en)
  ecrireDisque(suivant)
}

/* ---------- sauvegarde ---------- */

/** Le seul moyen d'emporter ses coches d'un navigateur à l'autre, ou de la version web à l'exe. */
export const exporterMethodes = () =>
  JSON.stringify({ format: 'pokopia:methodes', version: 1, connues: [...connues()] }, null, 2)

/**
 * Ajoute les coches d'un export aux siennes, sans en retirer aucune.
 *
 * @returns {{ajoutees: number, deja: number} | {erreur: string}}
 */
export function importerMethodes(texte) {
  let brut
  try {
    brut = JSON.parse(texte)
  } catch {
    return { erreur: 'Ce n’est pas du JSON valide.' }
  }
  if (brut?.format !== 'pokopia:methodes' || !Array.isArray(brut.connues))
    return { erreur: 'Ce texte n’est pas un export de méthodes.' }

  const actuel = connues()
  const lues = [...assainir(brut.connues)]
  const nouvelles = lues.filter((n) => !actuel.has(n))
  if (nouvelles.length) ecrireDisque(new Set([...actuel, ...nouvelles]))
  return { ajoutees: nouvelles.length, deja: lues.length - nouvelles.length }
}
