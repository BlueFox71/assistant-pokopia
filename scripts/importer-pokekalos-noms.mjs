// Remplace les noms français de src/data/objets.json par ceux relevés en jeu.
//
//   node scripts/importer-pokekalos-noms.mjs             télécharge, compare, n'écrit rien
//   node scripts/importer-pokekalos-noms.mjs --ecrire    applique à src/data/objets.json
//   node scripts/importer-pokekalos-noms.mjs --tout      imprime les écarts un par un
//   node scripts/importer-pokekalos-noms.mjs page.html   part d'un HTML déjà téléchargé
//
// Source : https://www.pokekalos.fr/jeux/switch2/pokopia/objets.html
//
// Pourquoi : nos noms français viennent de l'extraction d'origine (cf. extraire-artifact),
// où ils ont été TRADUITS depuis l'anglais plutôt que relevés en jeu. Une traduction
// littérale rate les noms officiels — « Light Clay » est Lumargile et non « Boue Armure »,
// « Adrenaline Orb » est Orbe Frousse et non « Orbe Frisson », et « Bell Tower » est la
// Tour Carillon quand « Tour Cendrée » désigne une AUTRE tour du jeu. Pokékalos transcrit
// le texte du jeu : son listing porte `data-name-en` et `data-name-fr` sur chaque entrée,
// ce qui donne l'appariement le plus sûr possible — sur le nom anglais, notre clé.
//
// Deux normalisations avant écriture, et seulement deux :
//   • le ♪ que Pokékalos accole aux disques est un marqueur de listing, pas un nom ;
//   • l'apostrophe typographique ’ redevient droite, parce que src/utils/recherche.js ne
//     replie pas les apostrophes : « Sac d’exploration » deviendrait introuvable pour qui
//     tape l'apostrophe de son clavier.
import fs from 'node:fs'

const URL_SOURCE = 'https://www.pokekalos.fr/jeux/switch2/pokopia/objets.html'
const FICHIER = new URL('../src/data/objets.json', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const tout = args.includes('--tout')
const source = args.find((a) => !a.startsWith('--'))

/**
 * Ce que Pokékalos donne et qu'on ne reprend pas — relevé en relisant le diff complet.
 *
 * `null` garde notre nom, une chaîne le remplace. Deux lignes de leur table sont fausses,
 * trois portent une coquille : « Minerai de cuivre » sur un gisement de FER (ils nomment
 * déjà Copper ore « Cuivre »), un porte-outils mural sur une boule de fête — ligne
 * visiblement décalée —, et les trois coquilles se corrigent sans rien inventer, leur
 * propre table donnant ailleurs l'orthographe juste (« Fossile Toundra (tête) », « tronc »
 * pour toutes les autres pièces de fossile).
 */
const ECARTS = {
  'Iron deposit': null,
  'Party ball': null,
  // Pokékalos donne « Lampe Poké Ball » aux DEUX objets. Deux vignettes voisines portant le
  // même nom seraient indéchiffrables dans le catalogue : « Poké Ball lamp » prend le nom
  // relevé, « Poké Ball light » garde le nôtre, qui les sépare.
  'Poké Ball light': null,
  'Jaw Fossil': 'Fossile Mâchoire',
  Telescope: 'Télescope',
  'Tundra Fossil (body)': 'Fossile Toundra (tronc)',
}

const decoder = (s) =>
  s
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim()

/** Le nom tel qu'on l'écrira : sans le marqueur de disque, apostrophes droites. */
const assainir = (nom) =>
  decoder(nom)
    .replace(/\s*♪\s*$/, '')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const html = source
  ? fs.readFileSync(source, 'utf8')
  : await fetch(URL_SOURCE, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.text()
    })

/**
 * Chaque vignette du listing porte son nom anglais en attribut et son nom français deux
 * fois : en attribut (minuscules, pour la recherche du site) et dans le libellé affiché,
 * qui garde la casse. C'est ce dernier qu'on retient.
 */
const parAnglais = new Map()
for (const m of html.matchAll(/data-name-en="([^"]*)"[\s\S]{0,700}?habitat-area-name">([^<]+)</gi)) {
  const en = decoder(m[1]).toLowerCase()
  if (en && !parAnglais.has(en)) parAnglais.set(en, assainir(m[2]))
}
if (!parAnglais.size) throw new Error('aucune entrée lue : le listing a changé de forme')
console.log(`entrées lues chez Pokékalos : ${parAnglais.size}`)

const objets = JSON.parse(fs.readFileSync(FICHIER, 'utf8'))
const changes = []
const nonApparies = []
let inchanges = 0

/**
 * Cinq objets existent en version sol et en version mur — « Stone flooring » et « Stone
 * flooring (wallpaper) » — et Pokékalos leur donne le même nom français, sa grille les
 * distinguant par catégorie. Nous n'avons que le nom : on lui rend son suffixe, sinon deux
 * vignettes voisines deviennent indiscernables dans le catalogue.
 */
const suffixeMur = (en, nom) => (/\(wallpaper\)$/i.test(en) ? `${nom} (papier peint)` : nom)

const ecartes = []

const suivant = objets.map((o) => {
  const brut = parAnglais.get(o.en.toLowerCase())
  if (!brut) {
    nonApparies.push(o.en)
    return o
  }
  if (o.en in ECARTS) {
    const remplacement = ECARTS[o.en]
    ecartes.push(`${o.en} : « ${brut} » refusé` + (remplacement ? `, corrigé en « ${remplacement} »` : ''))
    if (!remplacement || remplacement === o.fr) {
      inchanges += 1
      return o
    }
    changes.push({ en: o.en, avant: o.fr, apres: remplacement })
    return { ...o, fr: remplacement }
  }
  const releve = suffixeMur(o.en, brut)
  if (releve === o.fr) {
    inchanges += 1
    return o
  }
  changes.push({ en: o.en, avant: o.fr, apres: releve })
  return { ...o, fr: releve }
})

// Un même nom français sur deux objets rendrait le catalogue trompeur : on veut le voir.
const parFr = new Map()
for (const o of suivant) parFr.set(o.fr, [...(parFr.get(o.fr) || []), o.en])
const doublons = [...parFr].filter(([, l]) => l.length > 1)

console.log(`objets : ${objets.length} | appariés ${objets.length - nonApparies.length} | identiques ${inchanges}`)
console.log(`noms corrigés : ${changes.length}`)
console.log(`non appariés (gardent notre nom) : ${nonApparies.length}`)

const apercu = tout ? changes : changes.slice(0, 25)
for (const c of apercu) console.log(`  ${c.en.padEnd(30)} « ${c.avant} » -> « ${c.apres} »`)
if (!tout && changes.length > apercu.length) console.log(`  … ${changes.length - apercu.length} de plus (--tout)`)

if (ecartes.length) {
  console.log('\nrelevés écartés (cf. ECARTS) :')
  for (const e of ecartes) console.log(`  ${e}`)
}

if (nonApparies.length) {
  console.log('\nnon appariés :')
  for (const n of nonApparies) console.log(`  ${n}`)
}

if (doublons.length) {
  console.log('\nnoms français portés par plusieurs objets — à trancher à la main :')
  for (const [fr, liste] of doublons) console.log(`  « ${fr} » : ${liste.join(' | ')}`)
}

if (!ecrire) console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
else {
  fs.writeFileSync(FICHIER, JSON.stringify(suivant, null, 1))
  console.log('\nsrc/data/objets.json mis à jour.')
}
