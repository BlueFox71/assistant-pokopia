/**
 * Les images d'inspiration, dans l'IndexedDB du navigateur.
 *
 * Pas le localStorage, contrairement aux habitats et aux villes : il plafonne autour de
 * 5 Mo et ne garde que du texte — quelques captures en base64 suffiraient à le remplir.
 * IndexedDB stocke les `Blob` tels quels, sans conversion, et sa limite se compte en
 * centaines de Mo.
 *
 * Une entrée : `{ id, blob, nom, ajout }`, `ajout` étant l'horodatage du collage, qui sert
 * d'ordre d'affichage (les plus récentes en premier).
 */

const BASE = 'pokopia'
const MAGASIN = 'inspirations'

let ouverture = null

function base() {
  if (!ouverture) {
    ouverture = new Promise((resolve, reject) => {
      const req = indexedDB.open(BASE, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(MAGASIN, { keyPath: 'id' })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    // Un échec ne doit pas rester en cache : la prochaine tentative rouvre.
    ouverture.catch(() => {
      ouverture = null
    })
  }
  return ouverture
}

/** Une transaction sur le magasin, résolue avec le résultat de `agir` une fois écrite. */
async function transaction(mode, agir) {
  const db = await base()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MAGASIN, mode)
    const req = agir(tx.objectStore(MAGASIN))
    tx.oncomplete = () => resolve(req?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/** Toutes les images, les plus récentes en premier. */
export async function listerInspirations() {
  const toutes = (await transaction('readonly', (m) => m.getAll())) || []
  return toutes.sort((a, b) => b.ajout - a.ajout)
}

/** Range une image, sans nom. Renvoie l'entrée créée. */
export async function ajouterInspiration(blob) {
  const entree = { id: crypto.randomUUID(), blob, nom: '', ajout: Date.now() }
  await transaction('readwrite', (m) => m.add(entree))
  return entree
}

/** Renomme une image ; un nom vide l'efface. */
export async function renommerInspiration(entree, nom) {
  const suivante = { ...entree, nom: (nom || '').trim().slice(0, 80) }
  await transaction('readwrite', (m) => m.put(suivante))
  return suivante
}

export const supprimerInspiration = (id) => transaction('readwrite', (m) => m.delete(id))

/**
 * Les images d'un presse-papiers ou d'un glisser-déposer. `items` couvre le collage
 * (Google « Copier l'image » y met un image/png) ; `files` couvre les fichiers déposés.
 */
export function imagesDe(transfert) {
  if (!transfert) return []
  const depuisItems = [...(transfert.items || [])]
    .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
    .map((i) => i.getAsFile())
    .filter(Boolean)
  if (depuisItems.length) return depuisItems
  return [...(transfert.files || [])].filter((f) => f.type.startsWith('image/'))
}
