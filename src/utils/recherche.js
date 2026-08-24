/**
 * Recherche bilingue, insensible à la casse et aux accents.
 *
 * Chaque entrée porte deux libellés : l'original anglais (celui des guides
 * communautaires) et le français affiché. Une saisie doit trouver les deux, sans quoi
 * « Poké Ball Chest » resterait introuvable en tapant « coffre ».
 */

/** Minuscules sans diacritiques : « Écrapince » -> « ecrapince ». */
export const normaliser = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** `terme` doit déjà être normalisé (une seule fois par frappe, pas une fois par entrée). */
export const correspond = (terme, en, fr) =>
  normaliser(en).includes(terme) || normaliser(fr).includes(terme)
