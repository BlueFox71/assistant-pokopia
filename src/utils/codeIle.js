/**
 * Les codes d'île des abonnés : huit caractères, écrits `XXXX XXXX`.
 *
 * La saisie est tolérante — minuscules, tirets, espaces en trop, code collé depuis un
 * message — et ne garde que lettres et chiffres, en majuscules, coupés en deux blocs.
 */

export const LONGUEUR_CODE = 8

/** Les caractères utiles d'une saisie, en majuscules, au plus huit. */
export const brutCode = (texte) =>
  String(texte || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, LONGUEUR_CODE)

/** La saisie mise en forme `XXXX XXXX`, au fil de la frappe (`AB` reste `AB`). */
export function formaterCode(texte) {
  const brut = brutCode(texte)
  return brut.length > 4 ? `${brut.slice(0, 4)} ${brut.slice(4)}` : brut
}

/** Un code complet : huit caractères. */
export const codeComplet = (texte) => brutCode(texte).length === LONGUEUR_CODE

/**
 * Le code contenu dans un texte collé (« mon île : AB12-CD34 ! »), mis en forme, ou null.
 * On cherche d'abord deux blocs de quatre ; à défaut, un bloc de huit d'un seul tenant.
 */
export function extraireCode(texte) {
  const s = String(texte || '').toUpperCase()
  const m = s.match(/(?<![A-Z0-9])([A-Z0-9]{4})[\s-]?([A-Z0-9]{4})(?![A-Z0-9])/)
  return m ? `${m[1]} ${m[2]}` : null
}
