import { useSyncExternalStore } from 'react'
import { COTE_MAX, COTE_MIN, lireLieu, lireNiveaux, niveauxVersObjet } from './planPerso'

/**
 * Les plans enregistrés du plan personnalisé, dans le localStorage du navigateur.
 *
 * À côté du brouillon — le plan en cours, gardé tout seul à chaque tracé (cf. planPerso.js)
 * —, ceux-ci sont nommés et gardés exprès : on en range plusieurs, on les rouvre plus tard.
 * Même mécanique que les habitats (cf. habitatsStorage.js) : un store partagé, tout ce qui
 * entre passe par `assainir`, et un export JSON pour les emporter ailleurs.
 */

const CLE = 'pokopia:plans'

let cache = null
const abonnes = new Set()

const nouvelId = () =>
  globalThis.crypto?.randomUUID?.() ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/** Une entrée valide : un nom, un côté dans les bornes, et des cases qui y tiennent. */
function assainir(brut) {
  if (!brut || typeof brut !== 'object' || !Array.isArray(brut.cases)) return null
  const cote = Math.round(Number(brut.cote))
  if (!Number.isFinite(cote) || cote < COTE_MIN || cote > COTE_MAX) return null
  const maintenant = Date.now()
  return {
    id: typeof brut.id === 'string' && brut.id ? brut.id : nouvelId(),
    nom: typeof brut.nom === 'string' && brut.nom.trim() ? brut.nom.trim().slice(0, 60) : 'Plan sans nom',
    cote,
    // Le sol à la racine — blocs, habitats, couleurs, Pokémon —, les étages dans `etages`
    // (cf. lireNiveaux, planPerso.js).
    ...niveauxVersObjet(lireNiveaux(brut, cote)),
    // La ville où le plan sera bâti, ou null (cf. lireLieu).
    lieu: lireLieu(brut.lieu),
    creeLe: typeof brut.creeLe === 'number' ? brut.creeLe : maintenant,
    modifieLe: typeof brut.modifieLe === 'number' ? brut.modifieLe : maintenant,
  }
}

function lireDisque() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) || '[]')
    return Array.isArray(brut) ? brut.map(assainir).filter(Boolean) : []
  } catch {
    return []
  }
}

function ecrireDisque(plans) {
  cache = plans
  try {
    localStorage.setItem(CLE, JSON.stringify(plans))
  } catch {
    /* la session garde quand même les plans en mémoire */
  }
  for (const abonne of abonnes) abonne()
}

/* ---------- lecture ---------- */

export function plans() {
  if (cache === null) cache = lireDisque()
  return cache
}

const abonner = (callback) => {
  abonnes.add(callback)
  return () => abonnes.delete(callback)
}

/** Les plans enregistrés, du plus récemment modifié au plus ancien. */
export const usePlans = () => useSyncExternalStore(abonner, plans, () => [])

/* ---------- écriture ---------- */

/** @param {{ cases: Set<string>, habitats: Set<string>, couleurs: Map, occupants: Map }[]} niveaux */
export function creerPlan(nom, cote, niveaux, lieu = null) {
  const plan = assainir({ id: nouvelId(), nom, cote, ...niveauxVersObjet(niveaux), lieu })
  if (!plan) return null
  ecrireDisque([plan, ...plans()])
  return plan
}

/** Remplace le contenu d'un plan, et le remonte en tête de liste. */
export function modifierPlan(id, changements) {
  const ancien = plans().find((p) => p.id === id)
  if (!ancien) return null
  const { niveaux, ...reste } = changements
  // Des niveaux neufs remplacent tous les anciens : un étage supprimé ne doit pas survivre.
  const contenu = niveaux ? { etages: undefined, ...niveauxVersObjet(niveaux) } : {}
  const plan = assainir({ ...ancien, ...reste, ...contenu, modifieLe: Date.now() })
  if (!plan) return null
  ecrireDisque([plan, ...plans().filter((p) => p.id !== id)])
  return plan
}

export function supprimerPlan(id) {
  ecrireDisque(plans().filter((p) => p.id !== id))
}

/* ---------- sauvegarde ---------- */

/**
 * Comme les habitats, les plans ne vivent que dans ce navigateur : l'export est le seul
 * moyen de les passer du web à l'exe, ou de les garder si l'on vide les données du site.
 */
export const exporterPlans = () =>
  JSON.stringify({ format: 'pokopia:plans', version: 1, plans: plans() })

/**
 * Ajoute les plans d'un export sans toucher aux existants : un identifiant déjà présent
 * est ignoré plutôt qu'écrasé.
 *
 * @returns {{ajoutes: number, ignores: number} | {erreur: string}}
 */
export function importerPlans(texte) {
  let brut
  try {
    brut = JSON.parse(texte)
  } catch {
    return { erreur: 'Ce n’est pas du JSON valide.' }
  }
  const liste = Array.isArray(brut) ? brut : brut?.plans
  if (!Array.isArray(liste)) return { erreur: 'Aucune liste de plans trouvée dans ce texte.' }
  const valides = liste.map(assainir).filter(Boolean)
  if (!valides.length) return { erreur: 'Aucun plan exploitable dans ce texte.' }
  const existants = plans()
  const connus = new Set(existants.map((p) => p.id))
  const nouveaux = valides.filter((p) => !connus.has(p.id))
  if (nouveaux.length) ecrireDisque([...nouveaux, ...existants])
  return { ajoutes: nouveaux.length, ignores: valides.length - nouveaux.length }
}
