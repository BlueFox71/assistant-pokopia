/**
 * Catégories de meubles — dérivées du nom, pas fournies par le jeu.
 *
 * Les données n'exposent que la catégorie de confort (Repos, Décoration, Jouet, Route),
 * qui ne dit pas si un « Repos » est un lit ou une chaise. Or c'est bien ce qu'on cherche
 * en aménageant : « il me faut un lit, une table et une lampe pour cet enclos ». On la
 * déduit donc du nom anglais, seul libellé stable — la traduction française est maison, et
 * les listes de Serebii peuvent encore bouger.
 *
 * Deux garde-fous, parce qu'une règle par mot-clé se trompe silencieusement :
 *   • l'ordre des règles est significatif, et commenté au cas par cas ci-dessous ;
 *   • `scripts/auditer-categories.mjs` imprime le classement complet, à relire quand les
 *     données changent.
 */

/** Ordre d'affichage des bascules ; les deux dernières sont les seules décochées. */
export const TYPES_OBJET = [
  'lit',
  'chaise',
  'canape',
  'table',
  'commode',
  'lumiere',
  'ecran',
  'meuble',
  'plante',
  'decoration',
  'fossile',
  'ressource',
]

export const FR_TYPE_OBJET = {
  lit: 'Lit',
  chaise: 'Chaise',
  canape: 'Canapé',
  table: 'Table',
  commode: 'Commode',
  lumiere: 'Lumière',
  ecran: 'Écran',
  meuble: 'Meuble divers',
  plante: 'Plante',
  decoration: 'Décoration',
  fossile: 'Fossile',
  ressource: 'Ressource',
}

/**
 * Masquées par défaut : ni les fossiles ni les matériaux ne meublent un enclos. Elles
 * restent à un clic, pour qui cherche à compléter sa collection de fossiles.
 */
export const TYPES_PAR_DEFAUT = TYPES_OBJET.filter((t) => t !== 'ressource' && t !== 'fossile')

/**
 * Ce que les mots-clés classent mal, et qu'il vaut mieux nommer que contourner par une
 * regex illisible : deux services de vaisselle qui portent le mot « table », et une
 * argile dont le nom commence par « Light ».
 */
const EXCEPTIONS = {
  'table setting': 'decoration',
  'flowery table setting': 'decoration',
  'light clay': 'ressource',
}

// Premier motif qui accroche l'emporte.
const REGLES = [
  // Avant le repli « ressource » : les fossiles n'ont pas de catégorie de confort, ils y
  // tomberaient tous.
  ['fossile', /\bfossils?\b/],

  ['lit', /\bbeds?\b|hammock|futon/],
  ['canape', /\bsofa\b|\bcouch\b/],
  ['chaise', /\bchairs?\b|\bstools?\b|\bseats?\b|\bbench(es)?\b/],

  // Avant `table` : une « Berry table lamp » et une « Desk light » sont des lampes.
  ['lumiere', /\blamps?\b|\blights?\b|lantern|chandelier|candle|streetlight|\bneon\b|spotlight|\btorch\b/],
  // `\btables?\b` et non `table` : « Inflatable boat » n'est pas une table.
  ['table', /\btables?\b|\bdesks?\b|\bcounter\b/],

  // Avant `plante` : une « Decorative plant shelf » est un rangement.
  [
    'commode',
    /dresser|closet|\bchests?\b|cabinet|shel(f|ves)|bookcase|\bracks?\b|locker|\bstands?\b|storage|drawer|\bcases?\b|\bboxe?s?\b|\bcrates?\b|\bbarrels?\b|toolbox|wardrobe/,
  ],
  // `\btablets?\b` et non `tablet` : « Tabletop mic » n'est pas un écran.
  ['ecran', /monitor|television|\btvs?\b|screen|\btablets?\b|laptop|computer|\bpcs?\b|phone|game boy|arcade|console|projector/],

  // Le mobilier utilitaire : sanitaire, cuisine, électroménager, appareils, cheminées,
  // fontaines, miroirs. Il meuble un enclos sans entrer dans aucune catégorie nommée, et
  // se perdait jusque-là au milieu des 244 décorations.
  [
    'meuble',
    /\bsinks?\b|stove|\bovens?\b|fridge|refrigerator|washing machine|toilet|\bbathtubs?\b|shower|water basin|blender|vending machine|cash register|printer|\bmirrors?\b|fireplace|fountain|humidifier|\bfans?\b|generator|\bservers?\b|\bspeakers?\b|bubble machine/,
  ],
]

/**
 * Ce que la règle « meuble » attrape à tort. Une boule à facettes n'est pas un miroir, et
 * les horloges — que leur nom porte parfois « clock » près d'un mot d'appareil — restent
 * des décorations murales.
 */
const MEUBLE_EXCLU = /mirror ball|bathtime set/

/**
 * Les plantes viennent APRÈS le repli « ressource », à l'inverse des meubles ci-dessus :
 * les dizaines de « Wildflowers », « Mountain flowers » ou « Beautiful flower (pink) »
 * sont des fleurs à cueillir, pas des plantes d'intérieur. Seules celles qui portent une
 * catégorie de confort — plantes en pot, jardinières, couronnes — sont des décors vivants.
 */
const REGLE_PLANTE = /\bplants?\b|\bflowers?\b|bonsai|\bcactus\b|\bpotted\b|wreath|garland|sapling/
const PLANTE_EXCLUE = /cushion|backpack/

/**
 * @param {string} nom nom anglais de l'objet
 * @param {?string} categorieJeu catégorie de confort, telle que fournie par les données
 * @returns {string} une des clés de TYPES_OBJET
 */
export function typeObjet(nom, categorieJeu) {
  const n = nom.toLowerCase()
  if (EXCEPTIONS[n]) return EXCEPTIONS[n]

  for (const [type, motif] of REGLES) {
    if (!motif.test(n)) continue
    if (type === 'meuble' && MEUBLE_EXCLU.test(n)) break
    return type
  }

  // Le reste des objets sans catégorie de confort : matériaux, peintures, revêtements,
  // disques. Les meubles sont déjà partis ci-dessus — plusieurs tables et lits n'ont pas
  // de catégorie de confort, et seraient devenus des « ressources » par ce seul critère.
  if (!categorieJeu) return 'ressource'

  if (REGLE_PLANTE.test(n) && !PLANTE_EXCLUE.test(n)) return 'plante'
  return 'decoration'
}
