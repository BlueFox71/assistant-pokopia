/**
 * Les méthodes de fabrication du jeu (cf. scripts/importer-serebii-methodes.mjs), et ce que
 * la page Méthodes et la fiche objet en tirent. Les libellés des sources sont dans
 * methodesLibelles.js.
 */

import fichier from './methodes.json'

export { FR_SOURCE, cleFiltre, libelleSource } from './methodesLibelles'

/** Les méthodes, rangées par famille puis par nom français. */
export const methodes = fichier.methodes

/** Les familles, dans l'ordre de Serebii. */
export const FAMILLES = [
  { cle: 'furniture', libelle: 'Meubles' },
  { cle: 'misc', libelle: 'Divers' },
  { cle: 'outdoor', libelle: 'Extérieur' },
  { cle: 'utilities', libelle: 'Utilitaires' },
  { cle: 'buildings', libelle: 'Constructions' },
  { cle: 'blocks', libelle: 'Blocs' },
  { cle: 'other', libelle: 'Autres' },
]

export const FR_FAMILLE = Object.fromEntries(FAMILLES.map((f) => [f.cle, f.libelle]))

/** nom anglais d'objet du catalogue -> sa méthode. */
export const methodeParObjet = new Map(methodes.filter((m) => m.objet).map((m) => [m.objet, m]))

/** Les noms anglais connus de methodes.json : seuls ceux-là comptent dans le compteur. */
export const nomsMethodes = new Set(methodes.map((m) => m.en))
