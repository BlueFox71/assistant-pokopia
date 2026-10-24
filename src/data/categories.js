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

/**
 * Ordre d'affichage des bascules, en quatre groupes : les meubles (TYPES_PAR_DEFAUT), ce
 * qui se collectionne, ce qui sert à fabriquer, et ce qui sert à construire. Les trois
 * derniers groupes étaient un seul fourre-tout, « Ressource », où un CD côtoyait un lingot
 * et une porte en fer (cf. typeRessource).
 */
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
  // à collectionner
  'fossile',
  'cd',
  'tresor',
  // pour fabriquer
  'matiere',
  'peinture',
  'fleur',
  // pour construire
  'bloc',
  'construction',
  'papier',
  'tapis',
  'affiche',
  'exterieur',
  'utilitaire',
  'divers',
]

/** La première clé de chaque groupe hors meubles : la barre de filtres les sépare d'un trait. */
export const DEBUTS_GROUPE = new Set(['fossile', 'matiere', 'bloc'])

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
  cd: 'CD',
  tresor: 'Trésor',
  matiere: 'Matière première',
  peinture: 'Peinture',
  fleur: 'Fleur',
  bloc: 'Bloc',
  construction: 'Construction',
  papier: 'Papier peint',
  tapis: 'Tapis',
  affiche: 'Affiche',
  exterieur: 'Extérieur',
  utilitaire: 'Utilitaire',
  divers: 'Divers',
}

/**
 * Ce qu'on montre quand aucune catégorie n'est cochée : ni les fossiles ni les matériaux ne
 * meublent un enclos. Ils restent à un clic, pour qui cherche à compléter sa collection.
 */
export const TYPES_PAR_DEFAUT = TYPES_OBJET.slice(0, TYPES_OBJET.indexOf('fossile'))

/**
 * Ce que les mots-clés classent mal, et qu'il vaut mieux nommer que contourner par une
 * regex illisible : deux services de vaisselle qui portent le mot « table », une argile
 * dont le nom commence par « Light », des boîtes-repas qu'on pose sur une table et des
 * caisses qui ne rangent rien — vérifié en jeu, « box » et « crate » n'y suffisent pas.
 * S'y ajoutent des objets sans catégorie de confort qu'on pose pourtant en décor : le sac à
 * dos fleur, la couverture de pique-nique, les assiettes — y compris celles qui se
 * fabriquent hors catalogue (cf. typeFabrique).
 */
const EXCEPTIONS = {
  'table setting': 'decoration',
  'flowery table setting': 'decoration',
  'light clay': 'tresor',
  'lunch box': 'decoration',
  'wooden crate': 'meuble',
  'worn wooden crate': 'meuble',
  'flower backpack': 'decoration',
  'picnic blanket': 'decoration',
  'wooden plate': 'decoration',
  plate: 'decoration',
  'party platter': 'decoration',
  'picnic basket': 'decoration',
  'mysterious pedestal': 'decoration',
  'strength rock': 'decoration',
  'red crystal cluster': 'decoration',
  'push cart': 'table',
  // des appareils qui ont pourtant une catégorie de confort
  'mini generator': 'utilitaire',
  blender: 'utilitaire',
  // le jeu les range dans « Ressources », mais elles ne servent à rien fabriquer
  stardust: 'divers',
  'cotton spores': 'divers',
  'prism scale': 'divers',
  // des rangements que rien dans le nom ne désigne comme tels
  safe: 'commode',
  'portal pod': 'commode',
}

// Premier motif qui accroche l'emporte.
const REGLES = [
  // Avant le repli sur typeRessource : les fossiles n'ont pas de catégorie de confort, ils y
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
 * Les plantes viennent APRÈS le repli sur typeRessource, à l'inverse des meubles ci-dessus :
 * les dizaines de « Wildflowers », « Mountain flowers » ou « Beautiful flower (pink) »
 * sont des fleurs à cueillir, pas des plantes d'intérieur. Seules celles qui portent une
 * catégorie de confort — plantes en pot, jardinières, couronnes — sont des décors vivants.
 */
const REGLE_PLANTE = /\bplants?\b|\bflowers?\b|bonsai|\bcactus\b|\bpotted\b|wreath|garland|sapling/
const PLANTE_EXCLUE = /cushion|backpack/

/**
 * Les trésors : ce que donnent les objets perdus de petite taille, d'après la liste des
 * artefacts anciens de Pokékalos (articles-liste-des-artefacts-anciens-6383). Rien dans leur
 * nom ne les trahit — un Charbon, un Sable Doux ou une Lumargile passeraient pour des
 * matériaux —, d'où une liste. Elle n'a que les 34 qui sont à notre catalogue, sur 46.
 *
 * S'y ajoutent les deux objets perdus eux-mêmes, et deux objets de collection que la
 * liste ne cite pas et que le jeu range dans « Autres » : Arc-en-Ci'Aile, Argent'Aile.
 */
const TRESORS = new Set([
  'adrenaline orb', 'big root', 'black sludge', 'charcoal', 'clear amulet', 'destiny knot',
  'fairy feather', 'flame orb', 'gold bottle cap', 'hard stone', 'heart scale', 'iron ball',
  'lagging tail', 'leftovers', 'life orb', 'light clay', 'loaded dice', 'lucky egg', 'metal coat',
  'metal powder', 'miracle seed', 'mystic water', 'nugget', 'rare bone', 'ring target',
  'room service', 'silk scarf', 'silver bottle cap', 'silver powder', 'soft sand', 'spell tag',
  'throat spray', 'twisted spoon', 'weakness policy',
  'large lost relic', 'small lost relic',
  'rainbow feather', 'silver feather',
])

/** Les versions murales des blocs : Serebii les nomme toutes ainsi. */
const PAPIER = /\(wallpaper\)/

/**
 * Les tapis, pas les tapis musicaux (des jouets) ni le tatami (un bloc de sol). Le tapis en
 * feutre, lui, est un bloc pour le jeu — son nom en fait un tapis pour qui le cherche.
 */
const TAPIS = /\brugs?\b|doormat|\bmat\b/
const TAPIS_EXCLU = /music mat|tatami/

const PEINTURE = /\bpaint\b|paint balloon/
// Sans `\b` en tête : « Wildflowers » s'écrit d'un seul mot.
const FLEUR = /flowers?\b/

/**
 * Portes, fenêtres, pièces de toit, et le câble et la chaîne qu'on pose (Serebii les range
 * avec les constructions) ; « wall » en fin de nom, pour laisser l'interrupteur mural.
 */
const CONSTRUCTION = /\bdoors?\b|window|\bgate\b|ladder|\broof\b|^wire$|^metal chain$/
const BLOC = /\bwall$|pillar|^berry print$/

/** Ce que l'on ramasse en cassant ou en nettoyant : le jeu en range une partie hors « Ressources ». */
const MATIERE = /garbage|debris|fragments?\b|^mud$/

const AFFICHE = /\bposter\b/

/**
 * Ce qui ne rentre nulle part ailleurs : feux d'artifice, ustensiles, objets de camp, et ce
 * qu'on pose sans le fabriquer — le Rocher Force, le cristal rouge.
 */
const DIVERS =
  /switch|sensor|camera|furnace|utility pole|transmitter|cutting board|\bplate\b|picnic|tent kit|cooking pot|\bcart\b|\bsafe\b|portal pod|\bflag\b|firework|wish note|candy|pedestal|backpack|strength rock|crystal cluster/

/**
 * Ce qui n'a pas de catégorie de confort et n'est pas un meuble : l'ancien fourre-tout
 * « Ressource ». Le nom tranche d'abord ce qu'il dit sans ambiguïté (papier peint, tapis,
 * peinture, fleur, trésor), puis l'onglet du jeu (cf. data/categories-jeu.json) : une
 * matière première est ce que le jeu met dans « Ressources », un utilitaire ce qu'il met
 * dans « Objets utiles ». Sans onglet connu, on retombe sur les mots-clés.
 *
 * @param {string} n nom anglais en minuscules
 * @param {?string} onglet l'onglet du jeu, d'après Pokékalos
 */
function typeRessource(n, onglet) {
  if (PAPIER.test(n)) return 'papier'
  if (TAPIS.test(n) && !TAPIS_EXCLU.test(n)) return 'tapis'
  if (PEINTURE.test(n)) return 'peinture'
  if (FLEUR.test(n) && !PLANTE_EXCLUE.test(n)) return 'fleur'
  if (TRESORS.has(n)) return 'tresor'
  if (onglet === 'Ressources' || MATIERE.test(n)) return 'matiere'
  if (onglet === 'Blocs' || BLOC.test(n)) return 'bloc'
  if (onglet === 'Construction' || CONSTRUCTION.test(n)) return 'construction'
  return typeAutre(n, onglet)
}

/** La fin commune aux objets et à ce qui se fabrique hors catalogue. */
function typeAutre(n, onglet) {
  if (AFFICHE.test(n)) return 'affiche'
  if (onglet === 'Objets utiles') return 'utilitaire'
  if (onglet === 'Extérieur') return 'exterieur'
  if (onglet || DIVERS.test(n)) return 'divers'
  return 'matiere'
}

/**
 * Ce qui se fabrique sans être au catalogue (cf. data/methodes.js) : un type d'après la
 * famille de Serebii et l'onglet du jeu, corrigés par le nom — Serebii range papiers peints,
 * tapis et affiches dans « Autres », et le tapis en feutre parmi les blocs.
 *
 * @param {string} nom nom anglais de la méthode
 * @param {string} famille sa famille dans methodes.json
 * @param {?string} [onglet] l'onglet du jeu, d'après Pokékalos
 */
export function typeFabrique(nom, famille, onglet = null) {
  const n = nom.toLowerCase()
  if (EXCEPTIONS[n]) return EXCEPTIONS[n]
  if (PAPIER.test(n)) return 'papier'
  if (TAPIS.test(n) && !TAPIS_EXCLU.test(n)) return 'tapis'
  if (famille === 'blocks') return 'bloc'
  if (famille === 'buildings' || onglet === 'Construction') return 'construction'
  return typeAutre(n, onglet) === 'matiere' ? 'divers' : typeAutre(n, onglet)
}

/**
 * @param {string} nom nom anglais de l'objet
 * @param {?string} categorieJeu catégorie de confort, telle que fournie par les données
 * @param {object} [infos] ce que le nom ne dit pas :
 *   - `cd` : l'objet est un CD de musique (cf. data/cds.json) — rien dans « The Academy » ou
 *     « Pokémon Gym » ne permet de le deviner ;
 *   - `onglet` : son onglet dans le jeu (cf. data/categories-jeu.json).
 * @returns {string} une des clés de TYPES_OBJET
 */
export function typeObjet(nom, categorieJeu, { cd = false, onglet = null } = {}) {
  // Avant les mots-clés : le CD « Title Screen » passerait pour un écran.
  if (cd) return 'cd'
  const n = nom.toLowerCase()
  if (EXCEPTIONS[n]) return EXCEPTIONS[n]

  for (const [type, motif] of REGLES) {
    if (!motif.test(n)) continue
    if (type === 'meuble' && MEUBLE_EXCLU.test(n)) break
    return type
  }

  // Le reste des objets sans catégorie de confort : matériaux, peintures, revêtements,
  // disques. Les meubles sont déjà partis ci-dessus — plusieurs tables et lits n'ont pas
  // de catégorie de confort, et seraient tombés dans ce lot par ce seul critère.
  if (!categorieJeu) return typeRessource(n, onglet)

  if (REGLE_PLANTE.test(n) && !PLANTE_EXCLUE.test(n)) return 'plante'
  return 'decoration'
}

/**
 * Objets qui s'accrochent au mur — une propriété de pose, pas une catégorie : une « Wall
 * light » reste une lumière, un « Wall monitor » un écran. Le filtre « Mur » se combine
 * donc aux catégories au lieu d'en être une de plus.
 *
 * Les données du jeu ne disent pas où un objet se pose ; sa description, si. La liste
 * ci-dessous vient des textes de Serebii (items/<sprite>.shtml, « Flavor Text »), relevés
 * objet par objet : « Try hanging it up on a wall », « Perfect for livening up any wall! »…
 * Y entrent aussi les objets qui PEUVENT aller au mur sans y être obligés (la bouée, que
 * le texte propose d'accrocher en décor), et les étagères, vérifiées en jeu.
 *
 * Restent dehors, parce que leur texte les met ailleurs : les toiles (sur un support,
 * vérifié en jeu), les enseignes de boutique (sur un toit), le cadre photo (sur une table),
 * les lustres et suspensions (au plafond), et les « Try hanging it up in a frame! » des
 * objets tenus, qui vont dans un Cadre et non au mur.
 */
const MURAUX = new Set([
  // étagères
  'decorative bookshelf',
  'decorative plant shelf',
  'decorative shop shelf',
  'decorative storage shelf',
  'ornate decorative shelf',
  'polygonal shelf',
  'cd rack',
  'mini bookcase',
  // décors muraux
  'decorative cloth',
  'flower garland',
  'frame',
  'jewel wall decoration',
  'party bunting',
  'star wall decoration',
  'town map',
  'wreath',
  'swim ring',
  // horloges, lumières, appareils
  'berry clock',
  'rowlet clock',
  'bell',
  'card reader',
  'gaming light',
  'seedot lamp',
  'string lights',
  'surface light',
  'towel rack',
  'shower',
  'gyarados fountain',
  // panneaux
  'arrow sign (left)',
  'arrow sign (right)',
  'hanging sign',
])

/**
 * Le filet sous la liste : ce que le nom affirme de lui-même — « wall », un calendrier, un
 * rouleau ou une bannière suspendus, une affiche —, pour qu'un objet mural ajouté plus tard
 * n'attende pas un relevé pour être trouvé.
 */
const REGLE_MURAL = /\bwall[- ]|calendar|hanging (scroll|banner)|\bposter\b/
/** « Stone brick wall (wallpaper) » : un revêtement, pas un objet qu'on accroche. */
const MURAL_EXCLU = /wallpaper/

/**
 * @param {string} nom nom anglais de l'objet
 * @returns {boolean}
 */
export function estMural(nom) {
  const n = nom.toLowerCase()
  return MURAUX.has(n) || (REGLE_MURAL.test(n) && !MURAL_EXCLU.test(n))
}
