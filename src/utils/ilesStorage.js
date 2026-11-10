/**
 * Les îles des abonnés, dans l'IndexedDB du navigateur (cf. baseLocale.js) : à cause de
 * l'image facultative, le localStorage n'y suffirait pas.
 *
 * Une entrée : `{ id, code, nom, blob, ajout }` — `code` au format `XXXX XXXX`
 * (cf. codeIle.js), `nom` facultatif (l'abonné, ce qu'on trouve sur l'île…), `blob` une
 * capture ou null, `ajout` l'horodatage, qui sert d'ordre (récentes en premier).
 */

import { transaction } from './baseLocale'
import { formaterCode } from './codeIle'

const MAGASIN = 'iles'
const tx = (mode, agir) => transaction(MAGASIN, mode, agir)

export async function listerIles() {
  const toutes = (await tx('readonly', (m) => m.getAll())) || []
  return toutes.sort((a, b) => b.ajout - a.ajout)
}

const nettoyerNom = (nom) => (nom || '').trim().slice(0, 80)

export async function ajouterIle({ code, nom, blob }) {
  const entree = {
    id: crypto.randomUUID(),
    code: formaterCode(code),
    nom: nettoyerNom(nom),
    blob: blob || null,
    ajout: Date.now(),
  }
  await tx('readwrite', (m) => m.add(entree))
  return entree
}

/** Modifie une île : `champs` parmi `code`, `nom`, `blob` (null retire l'image). */
export async function modifierIle(entree, champs) {
  const suivante = { ...entree, ...champs }
  if ('code' in champs) suivante.code = formaterCode(champs.code)
  if ('nom' in champs) suivante.nom = nettoyerNom(champs.nom)
  await tx('readwrite', (m) => m.put(suivante))
  return suivante
}

export const supprimerIle = (id) => tx('readwrite', (m) => m.delete(id))
