/**
 * Le tracé d'un escalier en blocs, vu de profil, pour la vue Construction.
 *
 * Chaque marche monte d'UN bloc : aucune source ne publie la hauteur que le personnage
 * franchit d'un pas dans Pokopia, et c'est la règle des jeux de blocs. La profondeur, elle,
 * se règle — une marche de deux blocs de long fait une pente plus douce, et deux fois plus
 * longue.
 *
 * Le profil se lit colonne par colonne, de gauche à droite en montant : `cases[y][x]`, la
 * rangée 0 en haut comme partout ailleurs dans la vue.
 */

export const REMPLISSAGES_ESCALIER = [
  { value: 'plein', label: 'Plein' },
  { value: 'marches', label: 'Marches seules' },
]

/**
 * @param {{ hauteur: number, profondeur: number, palier?: number, remplissage: string }} p
 *   `hauteur` : le dénivelé à franchir, en blocs — autant de marches.
 *   `profondeur` : la longueur de chaque marche.
 *   `palier` : des colonnes à la hauteur d'arrivée, au bout, pour poser le pied.
 * @returns {{ largeur: number, hauteur: number, marches: boolean[][], dessous: boolean[][],
 *             colonnes: { marche: number | null, haut: number, blocs: number }[] }}
 */
export function tracerEscalier({ hauteur, profondeur, palier = 0, remplissage }) {
  const longueur = hauteur * profondeur + palier
  // La hauteur du dessus de chaque colonne : la marche n (de 1 à `hauteur`) occupe
  // `profondeur` colonnes, et le palier reste à la hauteur de la dernière.
  const colonnes = Array.from({ length: longueur }, (_, x) => {
    const marche = x < hauteur * profondeur ? Math.floor(x / profondeur) + 1 : null
    const haut = marche ?? hauteur
    return { marche, haut, blocs: remplissage === 'plein' ? haut : 1 }
  })
  const grille = (test) =>
    Array.from({ length: hauteur }, (_, y) =>
      colonnes.map((c) => test(c, hauteur - y)),
    )
  return {
    largeur: longueur,
    hauteur,
    // Le bloc qu'on foule, à part : c'est lui qu'on repère sur le plan.
    marches: grille((c, niveau) => niveau === c.haut),
    dessous: grille((c, niveau) => remplissage === 'plein' && niveau < c.haut),
    colonnes,
  }
}
