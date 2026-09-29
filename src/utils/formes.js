/**
 * Le tracé des formes en blocs, pour la vue Construction.
 *
 * Une forme est une grille de booléens, rangée par rangée : `cases[y][x]`. Tout part de la
 * surface pleine — une case en fait partie si son CENTRE tombe dans la forme —, puis le
 * contour se déduit d'elle, de la même façon pour toutes. C'est la règle des générateurs
 * de cercles Minecraft : elle donne une forme symétrique, et une taille paire a son centre
 * entre deux blocs, une taille impaire sur un bloc.
 */

export const BRANCHES_MIN = 3
export const BRANCHES_MAX = 12

/**
 * `dimensions` : 1 quand la forme n'a qu'une taille (la hauteur suit la largeur), 2 sinon.
 * `libelle` nomme cette taille unique, ou la largeur.
 */
export const FORMES = [
  { value: 'cercle', label: 'Cercle', dimensions: 1, libelle: 'Diamètre' },
  { value: 'ellipse', label: 'Ellipse', dimensions: 2, libelle: 'Largeur' },
  { value: 'carre', label: 'Carré', dimensions: 1, libelle: 'Côté' },
  { value: 'rectangle', label: 'Rectangle', dimensions: 2, libelle: 'Largeur' },
  { value: 'losange', label: 'Losange', dimensions: 2, libelle: 'Largeur' },
  { value: 'etoile', label: 'Étoile', dimensions: 1, libelle: 'Largeur' },
]

/**
 * Deux contours, parce qu'ils ne servent pas à la même chose :
 *   • « fin » garde les blocs qui touchent l'extérieur par une face. Aux marches de
 *     l'escalier, deux blocs ne se touchent que par l'arête : le trait est léger, mais on
 *     passe entre eux.
 *   • « continu » garde aussi ceux qui ne touchent l'extérieur que par un coin. Chaque
 *     bloc partage une face avec le suivant : c'est un mur étanche, un enclos sans fuite.
 */
export const REMPLISSAGES = [
  { value: 'fin', label: 'Contour fin' },
  { value: 'continu', label: 'Contour continu' },
  { value: 'plein', label: 'Plein' },
]

const VOISINS_FACE = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const VOISINS_COIN = [...VOISINS_FACE, [1, 1], [1, -1], [-1, 1], [-1, -1]]

/**
 * Remplit une grille de `largeur` × `hauteur` en testant le centre de chaque case, exprimé
 * en coordonnées réduites : de -1 à 1 sur chaque axe, 0 au centre de la grille.
 */
function remplir(largeur, hauteur, dedans) {
  const rx = largeur / 2
  const ry = hauteur / 2
  return Array.from({ length: hauteur }, (_, y) => {
    const dy = (y + 0.5 - ry) / ry
    return Array.from({ length: largeur }, (_, x) => dedans((x + 0.5 - rx) / rx, dy))
  })
}

// Une pointe de tolérance dans chaque test : sans elle, les cases posées pile sur le bord
// tombent d'un côté ou de l'autre selon l'arrondi flottant, et la symétrie se perd.
const EPS = 1e-9

/**
 * Les sommets d'une étoile à `n` branches, pointe en haut, inscrite dans le cercle unité.
 *
 * Le rayon intérieur est celui de l'étoile régulière qu'on trace d'un seul trait en sautant
 * un sommet sur deux ({n/2}) : 0,38 pour la classique à cinq branches. En dessous de cinq,
 * cette construction n'existe pas, et au-delà de huit les branches s'aplatissent jusqu'à
 * faire une roue dentée : le rayon est donc borné.
 */
function sommetsEtoile(n) {
  const regulier = n >= 5 ? Math.cos((2 * Math.PI) / n) / Math.cos(Math.PI / n) : 0.4
  const interieur = Math.min(0.55, Math.max(0.38, regulier))
  return Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 1 : interieur
    const angle = -Math.PI / 2 + (i * Math.PI) / n
    return [r * Math.cos(angle), r * Math.sin(angle)]
  })
}

/** Point dans un polygone, par le lancer de rayon habituel. */
function dansPolygone(px, py, sommets) {
  let dedans = false
  for (let i = 0, j = sommets.length - 1; i < sommets.length; j = i++) {
    const [xi, yi] = sommets[i]
    const [xj, yj] = sommets[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dedans = !dedans
  }
  return dedans
}

/** Retire les rangées et colonnes restées vides au pourtour, s'il y en a. */
function rogner(cases) {
  const rangees = cases.map((r) => r.some(Boolean))
  const colonnes = cases[0]?.map((_, x) => cases.some((r) => r[x])) ?? []
  const y0 = rangees.indexOf(true)
  if (y0 < 0) return cases
  const y1 = rangees.lastIndexOf(true)
  const x0 = colonnes.indexOf(true)
  const x1 = colonnes.lastIndexOf(true)
  return cases.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1))
}

/** La surface pleine de chaque forme. */
function surfacePleine({ forme, largeur, hauteur, branches = 5 }) {
  switch (forme) {
    case 'carre':
    case 'rectangle':
      return remplir(largeur, hauteur, () => true)
    case 'losange':
      return remplir(largeur, hauteur, (x, y) => Math.abs(x) + Math.abs(y) <= 1 + EPS)
    case 'etoile': {
      // Inscrite dans un cercle, l'étoile n'en touche ni les côtés ni le bas : tracée telle
      // quelle, une étoile « de 25 » en ferait 21 de large. On la recadre donc sur sa propre
      // boîte, de -1 à 1 sur les deux axes, et la hauteur suit ses proportions.
      const brut = sommetsEtoile(branches)
      const xs = brut.map(([x]) => x)
      const ys = brut.map(([, y]) => y)
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
      const sommets = brut.map(([x, y]) => [
        ((x - x0) / (x1 - x0)) * 2 - 1,
        ((y - y0) / (y1 - y0)) * 2 - 1,
      ])
      const haut = Math.max(1, Math.round((largeur * (y1 - y0)) / (x1 - x0)))
      // Même recadrée, une pointe effilée peut passer entre deux centres de case, et la
      // colonne du bord reste vide. On grossit l'étoile par petits pas jusqu'à ce qu'elle
      // occupe toute la largeur demandée : au pire, les pointes débordent d'un bloc et demi,
      // la grille les coupe et elles s'émoussent. Une étoile minuscule peut rester en deçà.
      let trace = null
      for (let pas = 0; pas <= 30; pas++) {
        const k = 1 + (pas * 0.1) / largeur
        trace = rogner(remplir(largeur, haut, (x, y) => dansPolygone(x / k, y / k, sommets)))
        if (trace[0]?.length === largeur) break
      }
      return trace
    }
    default:
      return remplir(largeur, hauteur, (x, y) => x * x + y * y <= 1 + EPS)
  }
}

/**
 * Distance de chaque case pleine à l'extérieur, en nombre de pas : 1 pour le bord, 2 pour
 * la couche d'en dessous, etc. Un parcours en largeur parti de toutes les cases vides — et
 * du pourtour de la grille, qui est vide lui aussi.
 */
function distancesAuBord(pleine, voisins) {
  const h = pleine.length
  const l = h ? pleine[0].length : 0
  const dist = pleine.map((r) => r.map(() => Infinity))
  const file = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      if (!pleine[y][x]) continue
      const auBord = voisins.some(([ox, oy]) => {
        const nx = x + ox
        const ny = y + oy
        return nx < 0 || ny < 0 || nx >= l || ny >= h || !pleine[ny][nx]
      })
      if (auBord) {
        dist[y][x] = 1
        file.push([x, y])
      }
    }
  }
  for (let i = 0; i < file.length; i++) {
    const [x, y] = file[i]
    for (const [ox, oy] of voisins) {
      const nx = x + ox
      const ny = y + oy
      if (nx < 0 || ny < 0 || nx >= l || ny >= h || !pleine[ny][nx]) continue
      if (dist[ny][nx] > dist[y][x] + 1) {
        dist[ny][nx] = dist[y][x] + 1
        file.push([nx, ny])
      }
    }
  }
  return dist
}

/**
 * La forme finale.
 *
 * @param {{ forme: string, largeur: number, hauteur: number, remplissage: string,
 *           epaisseur?: number, branches?: number }} p
 * @returns {boolean[][]}  Ses dimensions peuvent différer de celles demandées (étoile).
 */
export function tracerForme({ remplissage, epaisseur = 1, ...p }) {
  const pleine = surfacePleine(p)
  if (remplissage === 'plein') return pleine
  const dist = distancesAuBord(pleine, remplissage === 'continu' ? VOISINS_COIN : VOISINS_FACE)
  return dist.map((r) => r.map((d) => d <= epaisseur))
}

/**
 * Le décompte, rangée par rangée : combien de blocs, et en quels segments. C'est ce qu'on
 * suit en jeu — « rangée 4 : de la colonne 3 à la 6, puis de la 15 à la 18 ».
 */
export function decompterRangees(cases) {
  return cases.map((rangee) => {
    const segments = []
    let debut = null
    rangee.forEach((plein, x) => {
      if (plein && debut === null) debut = x
      if (!plein && debut !== null) {
        segments.push([debut + 1, x])
        debut = null
      }
    })
    if (debut !== null) segments.push([debut + 1, rangee.length])
    const total = segments.reduce((n, [a, b]) => n + b - a + 1, 0)
    return { total, segments }
  })
}
