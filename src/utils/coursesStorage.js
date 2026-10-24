import { useSyncExternalStore } from 'react'

/**
 * La liste de courses : ce qu'il faut aller chercher dans sa ville-entrepôt, dans le
 * localStorage.
 *
 * Une ligne désigne un objet du catalogue (`objet`, son nom anglais), une méthode sans
 * objet au catalogue — les blocs, murs, sols — (`methode`, son nom anglais dans
 * methodes.json), ou un texte libre (`texte`) pour ce que les données ne connaissent pas.
 * La quantité est facultative : `null` veut dire « en prendre, sans compter ».
 *
 * Ce module n'importe rien de src/data, pour rester testable sous Node
 * (cf. coursesStorage.test.mjs). Même schéma que methodesStorage.js : un store partagé,
 * parce que le panier et les boutons « ajouter » des pages lisent la liste en même temps.
 */

const CLE = 'pokopia:courses'

const TYPES = new Set(['objet', 'methode', 'texte'])

let cache = null
const abonnes = new Set()

/** La clé d'une ligne : un même objet n'entre qu'une fois dans la liste. */
export const cleLigne = (type, nom) => `${type}:${nom}`

/** Un entier de 1 à 9 999, ou `null` : vide, zéro et le reste reviennent à « sans quantité ». */
export function assainirQuantite(q) {
  const n = Math.floor(Number(q))
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 9999) : null
}

function assainir(brut) {
  if (!Array.isArray(brut)) return []
  const vues = new Set()
  const lignes = []
  for (const l of brut) {
    if (!l || !TYPES.has(l.type) || typeof l.nom !== 'string' || !l.nom.trim()) continue
    const nom = l.nom.trim()
    const cle = cleLigne(l.type, nom)
    if (vues.has(cle)) continue
    vues.add(cle)
    lignes.push({ type: l.type, nom, quantite: assainirQuantite(l.quantite), coche: l.coche === true })
  }
  return lignes
}

function lireDisque() {
  try {
    return assainir(JSON.parse(localStorage.getItem(CLE) || '[]'))
  } catch {
    // Stockage indisponible ou contenu corrompu : on repart à vide plutôt que de faire
    // tomber la page.
    return []
  }
}

function ecrireDisque(suivant) {
  cache = suivant
  try {
    localStorage.setItem(CLE, JSON.stringify(suivant))
  } catch {
    /* la session garde quand même la liste en mémoire */
  }
  for (const abonne of abonnes) abonne()
}

/** Pour les tests : oublie le cache, la prochaine lecture repart du stockage. */
export const _reinitialiser = () => {
  cache = null
}

/* ---------- lecture ---------- */

/** Les lignes, dans l'ordre d'ajout. Le même tableau tant que rien ne change. */
export function courses() {
  if (cache === null) cache = lireDisque()
  return cache
}

const abonner = (callback) => {
  abonnes.add(callback)
  return () => abonnes.delete(callback)
}

const VIDE = []

/** La liste, re-rendue à chaque changement. */
export const useCourses = () => useSyncExternalStore(abonner, courses, () => VIDE)

/* ---------- écriture ---------- */

const remplacer = (cle, modif) =>
  ecrireDisque(courses().map((l) => (cleLigne(l.type, l.nom) === cle ? { ...l, ...modif } : l)))

/**
 * Ajoute une ligne en fin de liste. Déjà présente, elle n'est pas doublée : on la décoche
 * seulement, puisque la redemander veut dire qu'il en faut encore.
 *
 * @returns {boolean} vrai si la ligne est nouvelle
 */
export function ajouter(type, nom, quantite = null) {
  const propre = typeof nom === 'string' ? nom.trim() : ''
  if (!TYPES.has(type) || !propre) return false
  const cle = cleLigne(type, propre)
  const existante = courses().find((l) => cleLigne(l.type, l.nom) === cle)
  if (existante) {
    if (existante.coche) remplacer(cle, { coche: false })
    return false
  }
  ecrireDisque([...courses(), { type, nom: propre, quantite: assainirQuantite(quantite), coche: false }])
  return true
}

export const retirer = (cle) => ecrireDisque(courses().filter((l) => cleLigne(l.type, l.nom) !== cle))

export const changerQuantite = (cle, quantite) => remplacer(cle, { quantite: assainirQuantite(quantite) })

/** Coche (`oui` vrai), décoche (`oui` faux) ou inverse (sans `oui`). */
export function cocher(cle, oui) {
  const ligne = courses().find((l) => cleLigne(l.type, l.nom) === cle)
  if (!ligne) return
  const voulu = oui === undefined ? !ligne.coche : Boolean(oui)
  if (voulu !== ligne.coche) remplacer(cle, { coche: voulu })
}

/** Retire d'un coup tout ce qui a été pris. */
export function retirerCochees() {
  const restantes = courses().filter((l) => !l.coche)
  if (restantes.length !== courses().length) ecrireDisque(restantes)
}
