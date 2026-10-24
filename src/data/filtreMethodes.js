/**
 * Le filtrage de la page Méthodes, à part pour être testé sous Node
 * (cf. filtreMethodes.test.mjs).
 */

import { correspond } from '../utils/recherche.js'
import { cleFiltre } from './methodesLibelles.js'

/** Une méthode répond-elle au filtre de source ? « boutique » prend toutes les boutiques. */
const aLaSource = (m, source) =>
  m.sources.some((s) => (source === 'boutique' ? s.type === 'boutique' : cleFiltre(s) === source))

/** Le plus petit niveau de boutique de la zone filtrée : c'est l'ordre d'achat. */
const niveauDans = (m, source) =>
  Math.min(...m.sources.filter((s) => cleFiltre(s) === source && s.niveau).map((s) => s.niveau), Infinity)

/**
 * Les méthodes à afficher. `gardees` : celles cochées depuis que la vue est ouverte — en
 * « À trouver », elles restent à leur place, sans quoi la liste remonterait sous le pointeur
 * à chaque coche, et une coche de travers deviendrait introuvable. `terme` est déjà normalisé.
 */
export function filtrerMethodes(methodes, { vue, connues, gardees = new Set(), famille, source, terme }) {
  let l = methodes
  if (vue === 'a-trouver') l = l.filter((m) => !connues.has(m.en) || gardees.has(m.en))
  else if (vue === 'connues') l = l.filter((m) => connues.has(m.en))
  if (famille) l = l.filter((m) => m.famille === famille)
  if (source) l = l.filter((m) => aLaSource(m, source))
  if (terme) l = l.filter((m) => correspond(terme, m.en, m.fr))
  // Filtrée sur la boutique d'une ville, la liste suit l'ordre des niveaux : ce qu'on peut
  // acheter maintenant d'abord, ce qui attend un palier ensuite.
  if (source?.startsWith('boutique-')) l = [...l].sort((a, b) => niveauDans(a, source) - niveauDans(b, source))
  return l
}
