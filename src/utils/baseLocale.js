/**
 * La base IndexedDB de l'app, partagée par les magasins qui gardent des images :
 * les inspirations et les îles des abonnés.
 *
 * Pas le localStorage, contrairement aux habitats et aux villes : il plafonne autour de
 * 5 Mo et ne garde que du texte — quelques captures en base64 suffiraient à le remplir.
 * IndexedDB stocke les `Blob` tels quels, et sa limite se compte en centaines de Mo.
 *
 * Version 1 : `inspirations`. Version 2 : + `iles`. La montée crée seulement les magasins
 * absents, sans toucher aux données déjà là.
 */

const BASE = 'pokopia'
const VERSION = 2
const MAGASINS = ['inspirations', 'iles']

let ouverture = null

function base() {
  if (!ouverture) {
    ouverture = new Promise((resolve, reject) => {
      const req = indexedDB.open(BASE, VERSION)
      req.onupgradeneeded = () => {
        for (const nom of MAGASINS)
          if (!req.result.objectStoreNames.contains(nom)) req.result.createObjectStore(nom, { keyPath: 'id' })
      }
      req.onsuccess = () => {
        // Un autre onglet monte de version : on se ferme pour ne pas le bloquer.
        req.result.onversionchange = () => {
          req.result.close()
          ouverture = null
        }
        resolve(req.result)
      }
      req.onerror = () => reject(req.error)
    })
    // Un échec ne doit pas rester en cache : la prochaine tentative rouvre.
    ouverture.catch(() => {
      ouverture = null
    })
  }
  return ouverture
}

/** Une transaction sur `magasin`, résolue avec le résultat de `agir` une fois écrite. */
export async function transaction(magasin, mode, agir) {
  const db = await base()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(magasin, mode)
    const req = agir(tx.objectStore(magasin))
    tx.oncomplete = () => resolve(req?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

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
