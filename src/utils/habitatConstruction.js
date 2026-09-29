/**
 * Les règles d'une maison construite en blocs, telle que le jeu la reconnaît comme
 * logement — pour le générateur d'habitat de la vue Construction.
 *
 * Aucune source officielle ne les publie ; elles sont relevées par les guides, qui ne
 * s'accordent pas tout à fait :
 *   • Game8 : espace clos d'au moins 2 × 2, d'au plus 10 × 9 ;
 *   • Serebii : structure d'au plus 11 × 12 — soit 9 × 10 à l'intérieur, murs retirés ;
 *   • GameRant : un intérieur d'au plus 100 cases, « pas forcément carré ».
 * Les deux premiers se recoupent, c'est eux qu'on suit. Si le jeu dément, c'est ici qu'on
 * corrige, et toute la page suit.
 */
export const INTERIEUR_MIN = 2
/** Les deux côtés maximum de l'intérieur, dans un sens ou dans l'autre. */
export const INTERIEUR_MAX = [9, 10]
export const MEUBLES_REQUIS = 3
export const CAPACITE = 4
/** Hauteur de mur conseillée pour circuler, et pour empiler un étage par-dessus. */
export const HAUTEUR_CONSEILLEE = 3

export const PORTES_MAX = 6
/** Une porte fait un bloc de large sur deux de haut : c'est ce qu'elle prend au mur. */
export const HAUTEUR_PORTE = 2

/** Les murs font un bloc d'épaisseur : l'extérieur a deux blocs de plus sur chaque axe. */
export const EPAISSEUR_MUR = 1

/**
 * Évalue une maison à partir de son intérieur.
 *
 * @returns {{ statut: 'ok' | 'petit' | 'grand', surface: number, exterieur: [number, number],
 *             blocsParRang: number, blocsMurs: number, blocsPortes: number,
 *             horsBordure: [number, number] }}
 */
export function evaluerHabitat({ largeur, longueur, hauteurMur, portes = 1, deduirePortes = false }) {
  const [petit, grand] = [largeur, longueur].sort((a, b) => a - b)
  const [maxPetit, maxGrand] = INTERIEUR_MAX
  const statut = petit < INTERIEUR_MIN ? 'petit' : petit > maxPetit || grand > maxGrand ? 'grand' : 'ok'

  const ext = [largeur + 2 * EPAISSEUR_MUR, longueur + 2 * EPAISSEUR_MUR]
  // Le tour extérieur, coins comptés une fois : c'est un rang de mur.
  const blocsParRang = 2 * (ext[0] + ext[1]) - 4
  return {
    statut,
    surface: largeur * longueur,
    exterieur: ext,
    blocsParRang,
    // Sous un mur plus bas que la porte, elle ne prend que la hauteur du mur.
    blocsPortes: portes * Math.min(HAUTEUR_PORTE, hauteurMur),
    blocsMurs: blocsParRang * hauteurMur - (deduirePortes ? portes * Math.min(HAUTEUR_PORTE, hauteurMur) : 0),
    // L'intérieur sans la rangée de cases qui longe les murs : ce qui reste au milieu.
    horsBordure: [Math.max(0, largeur - 2), Math.max(0, longueur - 2)],
  }
}

/**
 * Où poser `nombre` portes sur une maison de `l` × `h` hors tout. Jamais dans un coin —
 * une porte d'angle ne mène nulle part. Les murs sont servis tour à tour, bas, haut,
 * gauche, droite, et les portes d'un même mur s'y espacent régulièrement ; un mur trop
 * court pour en prendre une de plus passe son tour.
 *
 * Ce n'est qu'un exemple de placement : le jeu demande des portes, pas un emplacement.
 */
function placerPortes(l, h, nombre) {
  const murs = [
    { long: l - 2, pos: (i) => [i + 1, h - 1] }, // bas
    { long: l - 2, pos: (i) => [i + 1, 0] }, // haut
    { long: h - 2, pos: (i) => [0, i + 1] }, // gauche
    { long: h - 2, pos: (i) => [l - 1, i + 1] }, // droite
  ]
  const parMur = [0, 0, 0, 0]
  for (let posees = 0, tour = 0; posees < nombre && tour < nombre * 4 + 4; tour++) {
    const m = tour % 4
    if (parMur[m] < murs[m].long) {
      parMur[m]++
      posees++
    }
  }
  const portes = new Set()
  murs.forEach((mur, m) => {
    const k = parMur[m]
    for (let i = 0; i < k; i++) {
      const [x, y] = mur.pos(Math.floor(((i + 0.5) * mur.long) / k))
      portes.add(`${x},${y}`)
    }
  })
  return portes
}

/**
 * Le plan vu de dessus, à la taille extérieure : quatre calques pour la grille — la
 * bordure (le sol qui longe les murs), le reste du sol, les murs, et les portes.
 */
export function planHabitat({ largeur, longueur, portes = 1 }) {
  const l = largeur + 2 * EPAISSEUR_MUR
  const h = longueur + 2 * EPAISSEUR_MUR
  const places = placerPortes(l, h, portes)
  const grille = (test) => Array.from({ length: h }, (_, y) => Array.from({ length: l }, (_, x) => test(x, y)))
  const estMur = (x, y) => x === 0 || y === 0 || x === l - 1 || y === h - 1
  const estPorte = (x, y) => places.has(`${x},${y}`)
  const estBordure = (x, y) => !estMur(x, y) && (x === 1 || y === 1 || x === l - 2 || y === h - 2)
  return {
    largeur: l,
    hauteur: h,
    calques: [
      { classe: 'grille-bordure', cases: grille(estBordure) },
      { classe: 'grille-sol', cases: grille((x, y) => !estMur(x, y) && !estBordure(x, y)) },
      { classe: 'grille-mur', cases: grille((x, y) => estMur(x, y) && !estPorte(x, y)) },
      { classe: 'grille-porte', cases: grille(estPorte) },
    ],
  }
}
