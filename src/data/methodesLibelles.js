/**
 * Les sources d'une méthode, dites en français.
 *
 * Les sources arrivent rangées par scripts/lib/methodes.mjs : un type, parfois une zone, un
 * niveau, un lot, et toujours le texte d'origine de Serebii. Ce module en fait le libellé
 * affiché et la clé des filtres. Il ne lit aucune donnée — le nom de ville lui est passé —,
 * pour rester testable sous Node (cf. methodesLibelles.test.mjs).
 */

/** Les filtres par type, dans l'ordre où la page les propose. */
export const FR_SOURCE = {
  boutique: 'Boutique',
  'offre-du-jour': 'Offre du jour',
  remous: 'Remous scintillants',
  pokedex: 'Paliers du Pokédex',
  histoire: 'Histoire',
  expansion: 'Expansion Pass',
  autre: 'Autre',
}

/**
 * Les rares conditions « autre » qui reviennent assez pour mériter une traduction. Le reste
 * garde le texte de Serebii : une traduction devinée d'un nom d'objet serait pire.
 */
const FR_AUTRE = {
  'after first getting paint': 'Après la première peinture',
  'appraise a lost relic': 'Faire estimer une Relique',
  'find a fossil for the first time': 'Trouver un premier fossile',
}

/** Le libellé d'une source. `nomVille(cle)` donne le nom affiché d'une ville. */
export function libelleSource(s, nomVille) {
  switch (s.type) {
    case 'boutique': {
      let l = 'Boutique'
      if (s.zone) l += ` – ${nomVille(s.zone)}`
      if (s.niveau) l += ` niv. ${s.niveau}`
      if (typeof s.lot === 'string') l += `${s.zone || s.niveau ? ',' : ' –'} lot « ${s.lot} »`
      else if (s.lot) l += ', en lot'
      return l
    }
    case 'pokedex':
      return `${s.zone === 'fonds-bulleux' ? 'Pokédex du bassin' : 'Pokédex'} : ${s.niveau} enregistrés`
    case 'autre': {
      if (s.zone && /\(Item\)/i.test(s.texte)) return `Trouvée à ${nomVille(s.zone)}`
      return FR_AUTRE[s.texte.toLowerCase()] || s.texte
    }
    case 'remous':
    case 'offre-du-jour':
    case 'histoire':
    case 'expansion':
      return FR_SOURCE[s.type]
    default:
      return s.texte
  }
}

/** La clé de filtre : la boutique se range par zone, le reste par type. */
export const cleFiltre = (s) => (s.type === 'boutique' && s.zone ? `boutique-${s.zone}` : s.type)
