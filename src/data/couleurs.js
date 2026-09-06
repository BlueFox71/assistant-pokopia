/**
 * La personnalisation des objets : ce que Smearguru peut repeindre, et avec quoi.
 *
 * ── Une seule palette, pour tous les objets ──────────────────────────────────────────────
 *
 * C'est le point qui surprend en cherchant « les couleurs de tel meuble » : elles ne
 * dépendent pas du meuble. Le jeu a **18 couleurs**, les mêmes partout ; ce qui change d'un
 * objet à l'autre, c'est seulement s'il accepte la peinture, le motif, les deux, ou rien —
 * et c'est src/data/personnalisation.json qui le dit, relevé sur Serebii.
 *
 * Huit couleurs se récoltent telles quelles (`base: true`) : un Pokémon de spécialité
 * Broyage écrase une baie et en tire la peinture, avec parfois du blanc ou du noir en
 * second. Les dix autres n'existent qu'en mélange — d'où la recette portée par chaque
 * entrée, qui est aussi bien ce que Smearguru réclame pour repeindre que ce que coûte le
 * ballon de peinture correspondant.
 *
 * ── Les teintes affichées ───────────────────────────────────────────────────────────────
 *
 * `hex` n'est pas choisi à l'œil : c'est la couleur dominante des dix-huit pastilles de
 * Serebii (`paint/1.png`…`18.png`), relevée une fois au pixel. D'où quelques valeurs qui
 * surprennent — le « gris » du jeu tire sur le bleu, le « beige » sur l'olive — mais ce
 * sont les siennes.
 */

import personnalisation from './personnalisation.json'

/**
 * Les 18 couleurs, les huit de base d'abord.
 *
 * `recette` est exprimée en peintures de base : deux unités de la même peinture pour une
 * couleur de base, une de chaque pour un mélange.
 */
export const COULEURS = [
  { cle: 'red', fr: 'Rouge', hex: '#e95e2a', base: true, recette: [['red', 2]] },
  { cle: 'blue', fr: 'Bleu', hex: '#138dd3', base: true, recette: [['blue', 2]] },
  { cle: 'pink', fr: 'Rose', hex: '#ee9dc0', base: true, recette: [['pink', 2]] },
  { cle: 'cyan', fr: 'Cyan', hex: '#74c2f0', base: true, recette: [['cyan', 2]] },
  { cle: 'yellow', fr: 'Jaune', hex: '#fdcb00', base: true, recette: [['yellow', 2]] },
  { cle: 'green', fr: 'Vert', hex: '#3faf2f', base: true, recette: [['green', 2]] },
  { cle: 'white', fr: 'Blanc', hex: '#fbfdfb', base: true, recette: [['white', 2]] },
  { cle: 'black', fr: 'Noir', hex: '#1a0c0b', base: true, recette: [['black', 2]] },
  { cle: 'orange', fr: 'Orange', hex: '#ee9800', recette: [['red', 1], ['yellow', 1]] },
  { cle: 'purple', fr: 'Violet', hex: '#9759c0', recette: [['pink', 1], ['blue', 1]] },
  { cle: 'brown', fr: 'Marron', hex: '#a77435', recette: [['red', 1], ['green', 1]] },
  { cle: 'rose', fr: 'Rose pâle', hex: '#e75f7a', recette: [['red', 1], ['pink', 1]] },
  { cle: 'lime', fr: 'Vert lime', hex: '#a3cc23', recette: [['green', 1], ['yellow', 1]] },
  { cle: 'aquamarine', fr: 'Aigue-marine', hex: '#1caeaf', recette: [['green', 1], ['cyan', 1]] },
  { cle: 'plum', fr: 'Prune', hex: '#654062', recette: [['red', 1], ['blue', 1]] },
  { cle: 'navy', fr: 'Bleu marine', hex: '#4d67aa', recette: [['blue', 1], ['black', 1]] },
  { cle: 'gray', fr: 'Gris', hex: '#7da4b4', recette: [['blue', 1], ['white', 1]] },
  { cle: 'beige', fr: 'Beige', hex: '#898a65', recette: [['white', 1], ['black', 1]] },
]

export const couleurParCle = new Map(COULEURS.map((c) => [c.cle, c]))

/** Libellé français d'une couleur, pour les recettes. */
export const frCouleur = (cle) => couleurParCle.get(cle)?.fr || cle

/**
 * Les six baies à broyer. `secondaire` est le second tirage, plus rare : c'est le seul
 * moyen d'obtenir du blanc et du noir, qu'aucune baie ne donne en principal.
 */
export const BAIES = [
  { en: 'Leppa Berry', fr: 'Baie Mepo', principale: 'red', secondaire: 'white' },
  { en: 'Chesto Berry', fr: 'Baie Kika', principale: 'blue', secondaire: 'white' },
  { en: 'Lum Berry', fr: 'Baie Prine', principale: 'green', secondaire: 'white' },
  { en: 'Pecha Berry', fr: 'Baie Pêcha', principale: 'pink', secondaire: 'black' },
  { en: 'Rawst Berry', fr: 'Baie Fraive', principale: 'cyan', secondaire: 'black' },
  { en: 'Aspear Berry', fr: 'Baie Ceriz', principale: 'yellow', secondaire: 'black' },
]

/** `red` -> « Red paint », l'entrée de objets.json — donc sa vignette et sa fiche. */
export const objetPeinture = (cle) => `${cle[0].toUpperCase()}${cle.slice(1)} paint`

/* ---------- ce que chaque objet accepte ---------- */

/**
 * Les quatre états de la colonne « Colour » de Serebii. Un objet ABSENT de la table n'est
 * pas « non personnalisable » : il n'est simplement pas documenté — la page des meubles est
 * la seule à porter cette colonne, et elle ne couvre pas les matériaux ni les revêtements.
 */
export const FR_PERSONNALISATION = {
  peinture: 'Repeignable',
  'motif+peinture': 'Peinture et motifs',
  motif: 'Motifs seulement',
  aucune: 'Non personnalisable',
}

const table = new Map(Object.entries(personnalisation.objets))

/** @returns {'peinture'|'motif+peinture'|'motif'|'aucune'|null} null = non documenté. */
export const personnalisationDe = (nom) => table.get(nom) || null

/** Peut-il être repeint dans les 18 couleurs ? */
export const repeignable = (nom) => {
  const etat = table.get(nom)
  return etat === 'peinture' || etat === 'motif+peinture'
}

/** Accepte-t-il les motifs de Smearguru, en plus ou à la place de la peinture ? */
export const motifs = (nom) => {
  const etat = table.get(nom)
  return etat === 'motif' || etat === 'motif+peinture'
}

/** Combien d'objets documentés dans chaque état — affiché sur la page Objets. */
export const repartitionPersonnalisation = [...table.values()].reduce(
  (acc, etat) => ({ ...acc, [etat]: (acc[etat] || 0) + 1 }),
  {},
)

/** Nombre d'objets que le jeu laisse modifier, d'une façon ou d'une autre. */
export const nbPersonnalisables = [...table.values()].filter((e) => e !== 'aucune').length
