/**
 * Les inspirations, dans l'IndexedDB du navigateur (cf. baseLocale.js).
 *
 * Une entrée : `{ id, blob, video, nom, ajout }`.
 * - `blob` : l'image collée, ou null pour une vidéo sans image ;
 * - `video` : le lien YouTube / TikTok, tel que `lireVideo` l'a lu, ou absent ;
 * - `ajout` : l'horodatage de l'ajout, qui sert d'ordre d'affichage (récentes en premier).
 * Une entrée a au moins l'un des deux : une image, une vidéo, ou les deux.
 */

import { transaction } from './baseLocale'

export { imagesDe } from './baseLocale'

const MAGASIN = 'inspirations'
const tx = (mode, agir) => transaction(MAGASIN, mode, agir)

/** Toutes les inspirations, les plus récentes en premier. */
export async function listerInspirations() {
  const toutes = (await tx('readonly', (m) => m.getAll())) || []
  return toutes.sort((a, b) => b.ajout - a.ajout)
}

async function creer(champs) {
  const entree = { id: crypto.randomUUID(), blob: null, nom: '', ajout: Date.now(), ...champs }
  await tx('readwrite', (m) => m.add(entree))
  return entree
}

/** Range une image, sans nom. Renvoie l'entrée créée. */
export const ajouterInspiration = (blob) => creer({ blob })

/** Range un lien vidéo (cf. utils/videos.js), sans image. Renvoie l'entrée créée. */
export const ajouterVideo = (video) => creer({ video })

async function modifier(entree, champs) {
  const suivante = { ...entree, ...champs }
  await tx('readwrite', (m) => m.put(suivante))
  return suivante
}

/** Renomme une inspiration ; un nom vide l'efface. */
export const renommerInspiration = (entree, nom) => modifier(entree, { nom: (nom || '').trim().slice(0, 80) })

/** Pose (ou retire, avec null) le lien vidéo d'une inspiration. */
export const lierVideo = (entree, video) => modifier(entree, { video: video || undefined })

/** Pose (ou retire, avec null) l'image d'une inspiration. */
export const changerImage = (entree, blob) => modifier(entree, { blob: blob || null })

export const supprimerInspiration = (id) => tx('readwrite', (m) => m.delete(id))
