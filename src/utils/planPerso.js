/**
 * Le plan personnalisé de la vue Construction : une grille carrée qu'on remplit à la main.
 *
 * Un plan est un ensemble de cases, chacune notée « x,y ». Le plan en cours — le brouillon
 * — est gardé dans le localStorage à chaque tracé : il survit à un rechargement, pas à un
 * changement de navigateur. Il retient aussi quel plan enregistré il reprend (`actif`),
 * pour qu'« Enregistrer » sache lequel mettre à jour (cf. plansStorage.js).
 *
 * Les habitats marqués sont notés par une case de leur intérieur — le coin haut-gauche au
 * moment du marquage —, pas par leur rectangle : c'est l'enclos autour qui fait l'habitat,
 * et on le relit à chaque affichage. Un mur effacé depuis, et l'habitat se signale.
 *
 * Chaque habitat peut recevoir des Pokémon : une table à côté (case de l'habitat → noms
 * anglais), comme les couleurs à côté des blocs. Elle ne crée AUCUNE fiche habitat (cf.
 * habitatsStorage.js) : un plan est un projet, pas l'île telle qu'elle est.
 */

import { evaluerHabitat } from './habitatConstruction'
import { cleVilleValide } from '../data/villes'

export const COTE_MIN = 4
export const COTE_MAX = 64
export const COTE_DEFAUT = 16

/** Assez d'étages pour une tour ; au-delà, les onglets ne tiendraient plus dans la colonne. */
export const NIVEAUX_MAX = 8

const CLE = 'pokopia:plan'

/**
 * Les types de bloc, chacun sa couleur sur le plan — pour distinguer le chemin du mur, l'eau
 * du bois. Le premier est celui par défaut.
 *
 * Les couleurs sont une table À CÔTÉ des blocs (case → type), qui ne note que les blocs
 * d'un autre type que le défaut : tout ce qui raisonne sur la forme — enclos, habitats,
 * copie, rotation — continue de lire l'ensemble des blocs, sans se soucier des couleurs.
 */
export const TYPES_BLOC = [
  { id: 'mur', nom: 'Mur' },
  { id: 'chemin', nom: 'Chemin' },
  { id: 'herbe', nom: 'Herbe' },
  { id: 'eau', nom: 'Eau' },
  { id: 'bois', nom: 'Bois' },
  { id: 'pierre', nom: 'Pierre' },
  { id: 'fleurs', nom: 'Fleurs' },
  { id: 'lumiere', nom: 'Lumière' },
  { id: 'sable', nom: 'Sable' },
  { id: 'terre', nom: 'Terre' },
  { id: 'brique', nom: 'Brique' },
  { id: 'lave', nom: 'Lave' },
  { id: 'glace', nom: 'Glace' },
  { id: 'feuillage', nom: 'Feuillage' },
  { id: 'metal', nom: 'Métal' },
  { id: 'neige', nom: 'Neige' },
]
export const TYPE_DEFAUT = TYPES_BLOC[0].id
const TYPES_VALIDES = new Set(TYPES_BLOC.map((t) => t.id))

/**
 * Les couleurs qu'on peut donner à un habitat, pour les distinguer sur le plan : l'intérieur
 * se teinte. Sans couleur, il garde le vert des habitats. Comme les Pokémon prévus, c'est une
 * table à côté (case de l'habitat → couleur), qui suit l'habitat quand il tourne ou bouge.
 */
export const TEINTES_HABITAT = [
  { id: 'vert', nom: 'Vert' },
  { id: 'menthe', nom: 'Menthe' },
  { id: 'bleu', nom: 'Bleu' },
  { id: 'lavande', nom: 'Lavande' },
  { id: 'rose', nom: 'Rose' },
  { id: 'rouge', nom: 'Rouge' },
  { id: 'orange', nom: 'Orange' },
  { id: 'jaune', nom: 'Jaune' },
  { id: 'sable', nom: 'Sable' },
  { id: 'gris', nom: 'Gris' },
]
const TEINTES_VALIDES = new Set(TEINTES_HABITAT.map((t) => t.id))

/** Relit une table stockée (objet « x,y » → couleur), réduite aux habitats présents. */
export function lireTeintes(brut, habitats) {
  const table = new Map()
  if (!brut || typeof brut !== 'object') return table
  for (const [k, t] of Object.entries(brut)) if (habitats.has(k) && TEINTES_VALIDES.has(t)) table.set(k, t)
  return table
}

/** Le type d'un bloc posé. */
export const typeDe = (couleurs, k) => couleurs.get(k) ?? TYPE_DEFAUT

/**
 * Donne un type à des cases : le défaut n'est pas noté, il est ce qui reste quand on
 * retire l'entrée. Renvoie une nouvelle table.
 */
export function colorier(couleurs, cases, type) {
  const suivante = new Map(couleurs)
  for (const k of cases) {
    if (type === TYPE_DEFAUT) suivante.delete(k)
    else suivante.set(k, type)
  }
  return suivante
}

/** Relit une table de couleurs stockée (objet « x,y » → type), réduite aux blocs présents. */
export function lireCouleurs(brut, cases) {
  const table = new Map()
  if (!brut || typeof brut !== 'object') return table
  for (const [k, type] of Object.entries(brut)) {
    if (cases.has(k) && TYPES_VALIDES.has(type) && type !== TYPE_DEFAUT) table.set(k, type)
  }
  return table
}

/** La table à ranger : un objet, sans couleur orpheline d'un bloc effacé depuis. */
export const couleursVersObjet = (couleurs, cases) =>
  Object.fromEntries([...couleurs].filter(([k]) => cases.has(k)))

export const cle = (x, y) => `${x},${y}`

/** Les cases d'un segment, sans trou : l'algorithme de Bresenham. */
export function casesLigne(a, b) {
  const cases = []
  let { x, y } = a
  const dx = Math.abs(b.x - a.x)
  const dy = -Math.abs(b.y - a.y)
  const sx = a.x < b.x ? 1 : -1
  const sy = a.y < b.y ? 1 : -1
  let err = dx + dy
  for (;;) {
    cases.push(cle(x, y))
    if (x === b.x && y === b.y) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return cases
}

/** Les cases du rectangle tendu entre deux coins, plein ou réduit à son contour. */
export function casesRectangle(a, b, plein) {
  const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)]
  const [y0, y1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)]
  const cases = []
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (plein || x === x0 || x === x1 || y === y0 || y === y1) cases.push(cle(x, y))
    }
  }
  return cases
}

/**
 * Fait tourner des cases d'un quart de tour dans une grille carrée de `cote` : vers la
 * droite (sens horaire) ou vers la gauche. La rangée 0 est en haut, d'où les formules.
 */
const pivoterCle = (k, cote, sens) => {
  const [x, y] = k.split(',').map(Number)
  return sens === 'droite' ? cle(cote - 1 - y, x) : cle(y, cote - 1 - x)
}

export function pivoter(cases, cote, sens) {
  return new Set([...cases].map((k) => pivoterCle(k, cote, sens)))
}

/** La table des couleurs, tournée avec ses cases. */
export function pivoterCouleurs(couleurs, cote, sens) {
  return new Map([...couleurs].map(([k, type]) => [pivoterCle(k, cote, sens), type]))
}

/**
 * Les Pokémon assignés aux habitats : une Map « case de l'habitat » → noms anglais. Ils
 * suivent leur habitat quand le plan tourne, puisque c'est sa case qui bouge — comme les
 * couleurs des habitats, tournées de la même façon.
 */
export function pivoterOccupants(occupants, cote, sens) {
  return new Map([...occupants].map(([k, noms]) => [pivoterCle(k, cote, sens), noms]))
}

/**
 * Relit une table stockée (objet « x,y » → noms), réduite aux habitats présents. Un même
 * Pokémon ne loge qu'une fois par plan : le premier habitat qui le cite le garde — `vus`,
 * partagé d'un niveau à l'autre, retient ceux déjà logés.
 */
export function lireOccupants(brut, habitats, vus = new Set()) {
  const table = new Map()
  if (!brut || typeof brut !== 'object') return table
  for (const [k, noms] of Object.entries(brut)) {
    if (!habitats.has(k) || !Array.isArray(noms)) continue
    const gardes = noms.filter((n) => typeof n === 'string' && n && !vus.has(n))
    gardes.forEach((n) => vus.add(n))
    if (gardes.length) table.set(k, gardes)
  }
  return table
}

/** La table à ranger : un objet, sans habitat vide ni retiré depuis. */
export const occupantsVersObjet = (occupants, habitats) =>
  Object.fromEntries([...occupants].filter(([k, noms]) => habitats.has(k) && noms.length))

/** Retire les cases hors de la grille — à la relecture d'un plan stocké. */
export function rogner(cases, cote) {
  return new Set(
    [...cases].filter((k) => {
      const [x, y] = k.split(',').map(Number)
      return x < cote && y < cote
    }),
  )
}

/**
 * Les niveaux d'un plan : des étages indépendants, chacun ses blocs, ses couleurs, ses
 * habitats et leurs Pokémon, sur la même grille. Le premier est le sol.
 */
export const niveauVide = () => ({
  cases: new Set(),
  habitats: new Set(),
  couleurs: new Map(),
  occupants: new Map(),
  teintes: new Map(),
})

const CASE = /^\d+,\d+$/

function lireNiveau(brut, cote, vus) {
  const garder = (liste) =>
    Array.isArray(liste) ? rogner(liste.filter((k) => typeof k === 'string' && CASE.test(k)), cote) : new Set()
  const cases = garder(brut?.cases)
  const habitats = garder(brut?.habitats)
  return {
    cases,
    habitats,
    couleurs: lireCouleurs(brut?.couleurs, cases),
    occupants: lireOccupants(brut?.occupants, habitats, vus),
    teintes: lireTeintes(brut?.teintes, habitats),
  }
}

/**
 * Relit les niveaux d'un plan stocké. Le sol est rangé à la racine — `cases`, `habitats`,
 * `couleurs`, `occupants`, comme avant les niveaux : les plans et les exports d'alors se
 * relisent tels quels —, les étages au-dessus dans `etages`. Un Pokémon ne loge qu'une
 * fois dans tout le plan, tous niveaux confondus.
 */
export function lireNiveaux(brut, cote) {
  const vus = new Set()
  const etages = Array.isArray(brut?.etages) ? brut.etages.slice(0, NIVEAUX_MAX - 1) : []
  return [brut, ...etages].map((n) => lireNiveau(n, cote, vus))
}

const niveauVersObjet = (n) => ({
  cases: [...n.cases],
  habitats: [...n.habitats],
  couleurs: couleursVersObjet(n.couleurs, n.cases),
  occupants: occupantsVersObjet(n.occupants, n.habitats),
  // Les couleurs des habitats : un objet « x,y » → couleur, sans habitat retiré depuis.
  teintes: Object.fromEntries([...(n.teintes ?? [])].filter(([k]) => n.habitats.has(k))),
})

/** Les niveaux à ranger : le sol à la racine, `etages` seulement s'il y en a. */
export function niveauxVersObjet(niveaux) {
  const [sol, ...etages] = niveaux.map(niveauVersObjet)
  return etages.length ? { ...sol, etages } : sol
}

/**
 * Le lieu d'un plan : la ville où on compte le bâtir (cf. src/data/villes.js), ou null pour
 * aucune en particulier. Il restreint les Pokémon qu'on propose d'y loger.
 */
export const lireLieu = (brut) => (cleVilleValide(brut) ? brut : null)

export function lirePlan() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) || 'null')
    if (!brut || !Array.isArray(brut.cases)) return null
    const cote = Math.min(COTE_MAX, Math.max(COTE_MIN, Number(brut.cote) || COTE_DEFAUT))
    const actif = typeof brut.actif === 'string' ? brut.actif : null
    return { cote, niveaux: lireNiveaux(brut, cote), lieu: lireLieu(brut.lieu), actif }
  } catch {
    return null
  }
}

export function ecrirePlan(cote, niveaux, lieu = null, actif = null) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ cote, ...niveauxVersObjet(niveaux), lieu, actif }))
  } catch {
    // Stockage plein ou bloqué (navigation privée) : le plan vit le temps de la page.
  }
}

/**
 * Ce qu'enferment les blocs autour d'une case : la zone vide qu'on atteint depuis elle sans
 * traverser de bloc (en passant par les faces, pas par les coins), et si le jeu y verrait
 * une maison.
 *
 * Le jeu reconnaît un espace clos RECTANGULAIRE, de 2 × 2 à 9 × 10 à l'intérieur (cf.
 * habitatConstruction.js) : la zone doit donc être fermée — ne pas toucher le bord de la
 * grille, qui n'est pas un mur —, remplir exactement son rectangle, et tenir dans les bornes.
 * La porte n'est pas vérifiée : elle remplace un bloc du mur, et le plan n'en dessine pas.
 *
 * @returns {{ statut: 'mur' | 'ouvert' | 'forme' | 'petit' | 'grand' | 'ok',
 *             zone: Set<string>, x: number, y: number, largeur: number, longueur: number }}
 */
export function analyserEnclos(cases, cote, depart) {
  const vide = { zone: new Set(), x: depart.x, y: depart.y, largeur: 0, longueur: 0 }
  if (cases.has(cle(depart.x, depart.y))) return { statut: 'mur', ...vide }

  const zone = new Set([cle(depart.x, depart.y)])
  const file = [depart]
  let ouvert = false
  let [x0, y0, x1, y1] = [depart.x, depart.y, depart.x, depart.y]
  for (let i = 0; i < file.length; i++) {
    const { x, y } = file[i]
    if (x === 0 || y === 0 || x === cote - 1 || y === cote - 1) ouvert = true
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= cote || ny >= cote) continue
      const k = cle(nx, ny)
      if (zone.has(k) || cases.has(k)) continue
      zone.add(k)
      file.push({ x: nx, y: ny })
    }
  }
  const largeur = x1 - x0 + 1
  const longueur = y1 - y0 + 1
  const base = { zone, x: x0, y: y0, largeur, longueur }
  if (ouvert) return { statut: 'ouvert', ...base }
  if (zone.size !== largeur * longueur) return { statut: 'forme', ...base }
  return { statut: evaluerHabitat({ largeur, longueur, hauteurMur: 1 }).statut, ...base }
}

/**
 * La forme d'un seul tenant autour d'un bloc : tous les blocs qu'on atteint de proche en
 * proche, par les faces ou par les coins. Un clic sur le mur d'un carré en rend le carré
 * entier — escaliers de cercle compris, qui ne se touchent que par l'arête.
 */
export function composante(cases, depart) {
  const k0 = cle(depart.x, depart.y)
  if (!cases.has(k0)) return new Set()
  const forme = new Set([k0])
  const file = [depart]
  for (let i = 0; i < file.length; i++) {
    const { x, y } = file[i]
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const k = cle(x + dx, y + dy)
        if (forme.has(k) || !cases.has(k)) continue
        forme.add(k)
        file.push({ x: x + dx, y: y + dy })
      }
    }
  }
  return forme
}

/**
 * Les blocs d'un même type autour d'un bloc, de proche en proche par les faces : ce que
 * repeint ou efface le pot de peinture quand on clique sur un bloc. Par les faces seulement,
 * comme un pot de peinture : deux murs qui ne se touchent que par le coin restent deux.
 */
export function zoneMemeType(cases, couleurs, depart) {
  const k0 = cle(depart.x, depart.y)
  if (!cases.has(k0)) return new Set()
  const type = typeDe(couleurs, k0)
  const zone = new Set([k0])
  const file = [depart]
  for (let i = 0; i < file.length; i++) {
    const { x, y } = file[i]
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = cle(nx, ny)
      if (zone.has(k) || !cases.has(k) || typeDe(couleurs, k) !== type) continue
      zone.add(k)
      file.push({ x: nx, y: ny })
    }
  }
  return zone
}

/**
 * Une copie : des blocs et des habitats rapportés au coin haut-gauche des blocs copiés,
 * pour pouvoir les recoller n'importe où. `habitats` garde une case d'intérieur par
 * habitat, comme le plan lui-même.
 *
 * @returns {{ blocs: [number, number][], habitats: [number, number][], largeur: number, hauteur: number } | null}
 */
export function copier(blocs, habitats = [], couleurs = new Map()) {
  if (!blocs.size) return null
  const pts = [...blocs].map((k) => [...k.split(',').map(Number), typeDe(couleurs, k)])
  const x0 = Math.min(...pts.map(([x]) => x))
  const y0 = Math.min(...pts.map(([, y]) => y))
  return {
    // Chaque bloc copié garde son type : [dx, dy, type].
    blocs: pts.map(([x, y, type]) => [x - x0, y - y0, type]),
    habitats: habitats.map(({ x, y }) => [x - x0, y - y0]),
    largeur: Math.max(...pts.map(([x]) => x)) - x0 + 1,
    hauteur: Math.max(...pts.map(([, y]) => y)) - y0 + 1,
  }
}

/** La copie tournée d'un quart de tour, dans son propre rectangle. */
export function pivoterCopie(copie, sens) {
  const { largeur: l, hauteur: h } = copie
  const tourne = ([x, y, type]) => (sens === 'droite' ? [h - 1 - y, x, type] : [y, l - 1 - x, type])
  return { blocs: copie.blocs.map(tourne), habitats: copie.habitats.map(tourne), largeur: h, hauteur: l }
}

/**
 * Les cases d'une copie posée avec son coin haut-gauche en `c`, coupées au bord de la
 * grille, avec le type de chaque bloc collé.
 */
export function placerCopie(copie, c, cote) {
  const dedans = ([x, y]) => x >= 0 && y >= 0 && x < cote && y < cote
  const decale = ([dx, dy, type]) => [c.x + dx, c.y + dy, type]
  const blocs = copie.blocs.map(decale).filter(dedans)
  return {
    blocs: new Set(blocs.map(([x, y]) => cle(x, y))),
    types: new Map(blocs.map(([x, y, type]) => [cle(x, y), type ?? TYPE_DEFAUT])),
    habitats: copie.habitats.map(decale).filter(dedans).map(([x, y]) => cle(x, y)),
  }
}
