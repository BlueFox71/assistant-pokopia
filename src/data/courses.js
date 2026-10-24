/**
 * Ce qu'on peut mettre dans la liste de courses (cf. utils/coursesStorage.js) : les objets
 * du catalogue, puis les méthodes qui n'y ont pas d'objet — blocs, murs, sols, matériaux.
 * Une méthode qui a son objet au catalogue n'est pas reprise : ce serait la même ligne deux
 * fois dans la recherche.
 */

import { frObjet, objetParNom, objets, spriteObjet } from './index'
import { TYPES_PAR_DEFAUT } from './categories'
import { urlSpriteMethode, urlSpriteObjet } from './images'
import { methodes } from './methodes'
import { typeDe, typeDeMethode } from './types'

const methodeParNom = new Map(methodes.map((m) => [m.en, m]))
const meubles = new Set(TYPES_PAR_DEFAUT)

/**
 * Les rayons de la fenêtre d'ajout, dans l'ordre des filtres. Ce n'est pas le classement
 * du catalogue : on y cherche ce qu'on va chercher en entrepôt, et une porte ou un CD y
 * comptent davantage qu'une commode ou une table.
 */
export const RAYONS = [
  { cle: 'meuble', libelle: 'Meubles' },
  { cle: 'bloc', libelle: 'Blocs' },
  { cle: 'porte', libelle: 'Portes' },
  { cle: 'fenetre', libelle: 'Fenêtres' },
  { cle: 'tapis', libelle: 'Tapis' },
  { cle: 'matiere', libelle: 'Matières premières' },
  { cle: 'peinture', libelle: 'Peintures' },
  { cle: 'fleur', libelle: 'Fleurs' },
  { cle: 'cd', libelle: 'CD' },
  { cle: 'autre', libelle: 'Autres' },
]

export const FR_RAYON = Object.fromEntries(RAYONS.map((r) => [r.cle, r.libelle]))

/** Les types du catalogue qui sont aussi des rayons, sous la même clé. */
const RAYONS_DIRECTS = new Set(['bloc', 'tapis', 'matiere', 'peinture', 'fleur', 'cd'])

/**
 * Portes et fenêtres d'après le nom anglais, avant tout le reste : elles se rangent sinon
 * parmi les constructions, avec les clôtures et les toits, alors que c'est elles qu'on
 * cherche. `\bdoors?\b` laisse le paillasson (« doormat ») de côté. Pour le reste, le type
 * du catalogue (cf. categories.js) : les meubles se regroupent, et ce qui n'a pas de rayon
 * — fossiles, trésors, constructions, papiers peints, divers — tombe dans « Autres ».
 */
function rayon(type, nom) {
  const n = nom.toLowerCase()
  if (/\bdoors?\b/.test(n)) return 'porte'
  if (/\bwindows?\b/.test(n)) return 'fenetre'
  if (type === 'methode') {
    const m = methodeParNom.get(nom)
    if (m?.famille === 'furniture') return 'meuble'
    const t = m ? typeDeMethode(m) : 'divers'
    return RAYONS_DIRECTS.has(t) ? t : 'autre'
  }
  const t = typeDe(nom)
  if (meubles.has(t)) return 'meuble'
  return RAYONS_DIRECTS.has(t) ? t : 'autre'
}

const article = (type, nom, fr, url) => ({ type, nom, fr, url, rayon: rayon(type, nom) })

/** Les entrées proposées à l'ajout, triées par nom français. */
export const articles = [
  ...objets.map((o) => article('objet', o.en, frObjet(o.en), urlSpriteObjet(spriteObjet(o.en)))),
  ...methodes.filter((m) => !m.objet).map((m) => article('methode', m.en, m.fr || m.en, urlSpriteMethode(m))),
].sort((a, b) => a.fr.localeCompare(b.fr, 'fr'))

/** Ce qu'affiche une ligne de la liste : libellé, nom anglais s'il diffère, image, lien. */
export function presenter(ligne) {
  if (ligne.type === 'objet') {
    const fr = frObjet(ligne.nom)
    return {
      fr,
      en: fr !== ligne.nom ? ligne.nom : '',
      url: urlSpriteObjet(spriteObjet(ligne.nom)),
      lien: objetParNom.has(ligne.nom) ? `/objet/${encodeURIComponent(ligne.nom)}` : null,
    }
  }
  if (ligne.type === 'methode') {
    const m = methodeParNom.get(ligne.nom)
    const fr = m?.fr || ligne.nom
    return { fr, en: fr !== ligne.nom ? ligne.nom : '', url: urlSpriteMethode(m), lien: null }
  }
  return { fr: ligne.nom, en: '', url: null, lien: null }
}
