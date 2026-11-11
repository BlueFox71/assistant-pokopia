/**
 * Les Îles Rêve : une peluche posée chez soi, Baudrive propose d'y voler, et l'île qu'on
 * visite dépend de la peluche. Chaque île met en avant trois ressources, et certaines
 * cachent un Pokémon légendaire au fond d'une grotte.
 *
 * Ressources d'après la base « Dream Islands » de Serebii (les trois « Focus » de chaque
 * peluche) ; noms français des îles et des ressources d'après l'infographie de PokopiaFR et des captures du jeu ;
 * légendaires et biomes d'après les notes fournies par l'utilisateur. Les noms des objets
 * au catalogue de l'app restent ceux du catalogue. `traduit: true` : nom traduit de
 * l'anglais, faute de nom français connu.
 *
 * `sprite` : `{ objet | aliment | recette | ile: clé }`, résolu par data/images.js.
 * `legendaire` : nom anglais du Pokémon (clé de pokemon.json), absent si l'île n'en a pas.
 */

import trouvailles from './iles-reve.json'

/** Chance qu'un légendaire apparaisse, d'après les notes de l'utilisateur. */
export const CHANCE_LEGENDAIRE = '15 %'

export const PELUCHES = [
  {
    cle: 'pikachu',
    objet: 'Pikachu doll',
    ile: 'Île Rêve de l’océan',
    ville: 'grisemer',
    biome: 'Rivage et plage, rochers en bord d’océan.',
    legendaire: 'Raikou',
    ressources: [
      { en: 'Twine', fr: 'Fil de tissu', sprite: { objet: 'twine' } },
      { en: 'Sea glass fragments', fr: 'Fragments de verre de mer', sprite: { objet: 'seaglassfragments' } },
      { en: 'Seashell', fr: 'Coquillage', sprite: { objet: 'seashell' } },
    ],
  },
  {
    cle: 'evoli',
    objet: 'Eevee doll',
    ile: 'Île Rêve de la plaine',
    ville: 'terrassec',
    biome: 'Plaine herbeuse avec ruines et quelques arbres.',
    legendaire: 'Suicune',
    ressources: [
      { en: 'Leppa Berry', fr: 'Baie Mepo', sprite: { recette: '15' } },
      { en: 'Vine rope', fr: 'Corde en lierre', sprite: { objet: 'vinerope' } },
      { en: 'Glowing mushrooms', fr: 'Champignons luisants', sprite: { ile: 'glowingmushrooms' } },
    ],
  },
  {
    cle: 'melofee',
    objet: 'Clefairy doll',
    ile: 'Île Rêve des collines',
    ville: 'collinangle',
    biome: 'Collines rocheuses : montagne douce, grottes et falaises.',
    ressources: [
      { en: 'Cave mushrooms', fr: 'Champignon des grottes', sprite: { aliment: 'cavemushrooms' } },
      { en: 'Copper ore', fr: 'Cuivre', sprite: { objet: 'copperore' } },
      { en: 'Limestone', fr: 'Calcaire', sprite: { ile: 'limestone' } },
    ],
  },
  {
    cle: 'arcanin',
    objet: 'Arcanine doll',
    ile: 'Île Rêve du volcan',
    ville: 'collinangle',
    biome: 'Volcan : coulées de lave, roches sombres, cratères.',
    legendaire: 'Entei',
    ressources: [
      { en: 'Iron ore', fr: 'Fer', sprite: { objet: 'ironore' } },
      { en: 'Gold ore', fr: 'Or', sprite: { objet: 'goldore' } },
      { en: 'Glowing stone', fr: 'Roche lumineuse', sprite: { ile: 'glowingstone' } },
    ],
  },
  {
    cle: 'dracolosse',
    objet: 'Dragonite doll',
    ile: 'Île Rêve du ciel',
    ville: 'flotiles',
    biome: 'Îles flottantes en altitude, reliefs abrupts, ponts et falaises.',
    legendaire: 'Mewtwo',
    ressources: [
      { en: 'Wastepaper', fr: 'Déchets de papier', sprite: { objet: 'wastepaper' } },
      { en: 'Pokémetal', fr: 'Poké Métal', sprite: { objet: 'pokemetal' } },
      { en: 'Crystal fragment', fr: 'Fragment de cristal', sprite: { objet: 'crystalfragment' } },
    ],
  },
  {
    cle: 'staross',
    objet: 'Starmie doll',
    ile: 'Île Rêve des fonds marins',
    ville: 'fonds-bulleux',
    dlc: true,
    ressources: [
      { en: 'Sea grapes', fr: 'Raisins de mer', sprite: { aliment: 'seagrapes' } },
      { en: 'Small coral', fr: 'Corail de petite taille', sprite: { ile: 'smallcoral' } },
      { en: 'Grubby pearl', fr: 'Perle sale', sprite: { objet: 'grubbypearl' } },
    ],
  },
  {
    cle: 'metamorph',
    objet: 'Ditto doll',
    ile: 'Une Île Rêve au hasard',
    hasard: true,
    ressources: [],
  },
  {
    cle: 'clonage',
    objet: 'Substitute doll',
    ile: 'Une Île Rêve au hasard',
    hasard: true,
    ressources: [],
  },
]

/**
 * Tout ce qu'on trouve sur chaque île, d'après Serebii (cf. scripts/importer-serebii-iles.mjs) :
 * `communs` pour ce que les cinq îles de base partagent, `iles[cle]` pour le reste.
 */
export const TROUVAILLES_COMMUNES = trouvailles.communs
export const TROUVAILLES = trouvailles.iles

/** Les trois sections de Serebii, dans l'ordre de la page. */
export const SECTIONS_TROUVAILLES = [
  { cle: 'materiaux', libelle: 'Matériaux' },
  { cle: 'blocs', libelle: 'Plantes et blocs' },
  { cle: 'objets', libelle: 'Objets sur place' },
]
