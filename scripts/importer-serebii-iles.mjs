// Relève tout ce qu'on trouve sur chaque Île Rêve : matériaux, plantes et blocs, objets.
//
//   node scripts/importer-serebii-iles.mjs                    télécharge, résume, n'écrit rien
//   node scripts/importer-serebii-iles.mjs --ecrire           écrit src/data/iles-reve.json
//   node scripts/importer-serebii-iles.mjs --local <dossier>  part de pages déjà téléchargées
//                                                              (<peluche>doll.shtml, kalos-objets.html)
//
// Serebii tient une page par peluche (`dreamisland/<peluche>doll.shtml`), en trois
// sections : « Naturally Occuring Materials », « Naturally Occuring Plants & Blocks » et
// « Items Found in Area ». Chaque entrée est une cellule `fooevo` (le nom anglais) suivie
// de son image (`items/<slug>.png`) — le slug est aussi la clé de nos sprites.
//
// Beaucoup d'entrées se retrouvent sur les cinq îles de base (journaux sales, sacs de
// sable…) : elles forment le bloc `communs`, et chaque île ne garde que le reste. L'île
// du DLC (Staross) se compare à ce même bloc.
//
// Noms français : notre catalogue d'abord (objets, complément, méthodes, aliments), la
// liste d'objets de Pokékalos sinon. Ce qui n'a pas de nom français garde l'anglais, sans
// `fr` — l'affichage le signale. Toutes les variantes de Serebii sont gardées (couleurs,
// versions sèches, stades de culture), à la demande de l'utilisateur.
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://www.serebii.net/pokemonpokopia/dreamisland'
const KALOS_OBJETS = 'https://www.pokekalos.fr/jeux/switch2/pokopia/objets.html'
const FICHIER = new URL('../src/data/iles-reve.json', import.meta.url)
const DONNEES = new URL('../src/data/', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const dossierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

/** Clé de peluche dans src/data/ilesDeReve.js -> page Serebii. `base` : compte pour les communs. */
const ILES = [
  { cle: 'pikachu', page: 'pikachudoll.shtml', base: true },
  { cle: 'evoli', page: 'eeveedoll.shtml', base: true },
  { cle: 'melofee', page: 'clefairydoll.shtml', base: true },
  { cle: 'arcanin', page: 'arcaninedoll.shtml', base: true },
  { cle: 'dracolosse', page: 'dragonitedoll.shtml', base: true },
  { cle: 'staross', page: 'starmiedoll.shtml', base: false },
]

const SECTIONS = [
  { cle: 'materiaux', titre: /Naturally Occ?urr?ing Materials/i },
  { cle: 'blocs', titre: /Naturally Occ?urr?ing Plants/i },
  { cle: 'objets', titre: /Items Found in Area/i },
]

const reduire = (nom) => nom.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
const decoder = (s) =>
  s
    .replace(/&eacute;/g, 'é')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&rsquo;|&#8217;/g, "'")
    .replace(/’/g, "'")
    .trim()

async function telecharger(url, encodage = 'utf-8') {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`${url} : HTTP ${r.status}`)
  return new TextDecoder(encodage).decode(await r.arrayBuffer())
}

/** Serebii est en latin-1. */
const chargerSerebii = (page) =>
  dossierLocal
    ? fs.readFileSync(path.join(dossierLocal, page), 'latin1')
    : telecharger(`${BASE}/${page}`, 'latin1')

/* ---------- les noms français ---------- */

const lire = (f) => JSON.parse(fs.readFileSync(new URL(f, DONNEES), 'utf8'))
/** nom réduit -> { objet?: nom exact au catalogue, fr } */
const connus = new Map()
const retenir = (en, fr, objet) => {
  if (en && fr && !connus.has(reduire(en))) connus.set(reduire(en), { fr, ...(objet ? { objet } : {}) })
}
for (const o of [...lire('objets.json'), ...lire('objets-complement.json').objets]) retenir(o.en, o.fr, o.en)
for (const m of lire('methodes.json').methodes) retenir(m.en, m.fr, null)
for (const a of lire('aliments.json')) retenir(a.en, a.fr, null)

const kalos = dossierLocal
  ? fs.readFileSync(path.join(dossierLocal, 'kalos-objets.html'), 'utf8')
  : await telecharger(KALOS_OBJETS)
/** Pokékalos range ses noms en minuscules dans `data-name-*` ; l'`alt` qui suit garde la casse. */
/** Nom réduit -> image Pokékalos : le repli quand Serebii ne sert pas la sienne. */
const imageKalos = new Map()
for (const [, en, suite] of kalos.matchAll(/data-name-en="([^"]+)">([\s\S]{0,600})/g)) {
  const alt = suite.match(/alt="([^"]+)"/)?.[1]
  if (alt) retenir(decoder(en), decoder(alt), null)
  const src = suite.match(/src="([^"]+\.png)"/)?.[1]
  if (src && !imageKalos.has(reduire(decoder(en)))) imageKalos.set(reduire(decoder(en)), src)
}

/**
 * Serebii et Pokékalos ne nomment pas toujours pareil. `null` : on écarte la traduction de
 * Pokékalos, fausse — son « iron deposit » est un « Minerai de cuivre ».
 */
const ALIAS = {
  ironoredeposit: { fr: 'Minerai de fer' },
  goldoredeposit: 'golddeposit',
}
const COULEURS = {
  blue: 'bleu',
  pink: 'rose',
  red: 'rouge',
  white: 'blanc',
  orange: 'orange',
  purple: 'violet',
  yellow: 'jaune',
}

/** Le nom français d'une entrée Serebii, ou null : direct, alias, singulier/pluriel, couleur. */
function trouver(en) {
  const r = reduire(en)
  const alias = ALIAS[r]
  if (alias) return typeof alias === 'string' ? connus.get(alias) || null : alias
  const direct =
    connus.get(r) || connus.get(r + 's') || connus.get(r + 'es') || (r.endsWith('s') && connus.get(r.slice(0, -1)))
  if (direct) return direct
  // « Damp hedge (blue) » -> « Buisson humide (bleu) », comme Pokékalos écrit ses variantes.
  const variante = en.match(/^(.*) \((\w+)\)$/)
  if (variante && COULEURS[variante[2].toLowerCase()]) {
    const base = trouver(variante[1])
    if (base) return { fr: `${base.fr} (${COULEURS[variante[2].toLowerCase()]})` }
  }
  return null
}

/* ---------- une page d'île ---------- */

/** Nos sprites, tous dossiers confondus : une clé qui y est déjà n'a pas à être téléchargée. */
const SPRITES = new URL('sprites/', DONNEES)
const existe = (slug) =>
  ['objets', 'iles', 'aliments', 'methodes'].some((d) => fs.existsSync(new URL(`${d}/${slug}.webp`, SPRITES)))

/** Images que Serebii référence sans les servir (404) : on prend l'image équivalente. */
const ALIAS_SPRITE = {
  ironoredeposit: 'irondeposit',
  goldoredeposit: 'golddeposit',
  cardboardbox: 'cardboardboxes',
  metalfragment: 'metalfragments',
  beautifulflowers: 'beautifulflower',
}

/**
 * Noms que Serebii liste sur une île sans leur avoir fait de fiche ni d'image (404), et
 * que Pokékalos ignore aussi : sans doute des coquilles ou des noms provisoires. Écartés à
 * la demande de l'utilisateur.
 */
const ECARTES = new Set(['woodenchair', 'drymountainflowers', 'moltenboulder', 'pointywoodenfence'])

/** Images que Serebii range sous un autre nom que celui de l'entrée (relevé dans items.shtml). */
const IMAGE_SEREBII = {
  archedtilingfragments: 'arched-tilingfragments',
  pechatreeseeds: 'pechaseeds',
}

/** Notre clé de sprite -> le nom de l'image chez Serebii, pour la télécharger. */
const slugsSerebii = new Map()

function lireIle(html) {
  const sections = {}
  for (const partie of html.split(/<h2>/).slice(1)) {
    const titre = partie.slice(0, partie.indexOf('<'))
    const section = SECTIONS.find((s) => s.titre.test(titre))
    if (!section) continue
    // Les noms viennent par rangées de cinq, puis leurs images. On apparie par l'`alt` de
    // l'image plutôt que par la position : quelques cellules en ont deux, ou aucune.
    // « Broken timberMetal fragment » : deux noms collés dans une cellule chez Serebii.
    const noms = [...partie.matchAll(/<td class="fooevo">([^<]+)<\/td>/g)].flatMap((m) =>
      decoder(m[1]).split(/(?<=[a-z])(?=[A-Z])/),
    )
    const slugParNom = new Map()
    for (const [, brut, alt] of partie.matchAll(/<img src="\/pokemonpokopia\/items\/([^"]+)\.png"[^>]*alt="([^"]+)"/g)) {
      // Un sprite déjà là (le catalogue garde les parenthèses) sert tel quel ; sinon, sans
      // parenthèses, la clé fait un nom de fichier sage.
      const slug = ALIAS_SPRITE[brut] || (existe(brut) ? brut : brut.replace(/[()]/g, ''))
      slugParNom.set(reduire(decoder(alt)), slug)
      if (!ALIAS_SPRITE[brut]) slugsSerebii.set(slug, brut)
    }
    const vus = new Set()
    sections[section.cle] = []
    noms.forEach((en) => {
      if (vus.has(reduire(en)) || ECARTES.has(reduire(en))) return
      vus.add(reduire(en))
      const connu = trouver(en)
      sections[section.cle].push({
        en: connu?.objet || en,
        ...(connu ? { fr: connu.fr } : {}),
        // Sans image appariée (les deux noms collés), on tente le nom réduit : c'est la
        // forme des images de Serebii, et le téléchargement dira si elle n'existe pas.
        sprite: slugParNom.get(reduire(en)) || ALIAS_SPRITE[reduire(en)] || reduire(en),
      })
    })
  }
  for (const s of SECTIONS) sections[s.cle] ||= []
  return sections
}

/**
 * Les couleurs d'une même fleur ou d'un même buisson, réunies en une case.
 *
 * Serebii liste les quatre couleurs sur chaque île, mais chacune de leurs fiches précise
 * « Each player [gets] one of four different colours as standard » : une partie n'en voit
 * pousser qu'une, toujours la même ; les trois autres s'achètent à la boutique du jour.
 * Afficher les quatre ferait chercher sur l'île trois variantes qui n'y sont pas. La case
 * gardée porte `couleurs: true`. Une variante seule (« Seabed flowers (purple) ») reste telle
 * quelle : ce n'est pas un choix entre couleurs.
 */
function regrouperCouleurs(liste) {
  const variantesDe = new Map()
  for (const e of liste) {
    const m = e.en.match(/^(.*) \((\w+)\)$/)
    if (!m || !COULEURS[m[2].toLowerCase()]) continue
    const base = reduire(m[1])
    if (!variantesDe.has(base)) variantesDe.set(base, { nom: m[1], variantes: [] })
    variantesDe.get(base).variantes.push(e)
  }
  const groupes = new Map([...variantesDe].filter(([, g]) => g.variantes.length > 1))
  const sortie = []
  const places = new Set()
  for (const e of liste) {
    const m = e.en.match(/^(.*) \((\w+)\)$/)
    const cle = groupes.has(reduire(e.en)) ? reduire(e.en) : m && groupes.has(reduire(m[1])) ? reduire(m[1]) : null
    if (!cle) {
      sortie.push(e)
      continue
    }
    if (places.has(cle)) continue
    places.add(cle)
    // La case de base si Serebii la donne, sinon on la tire de la première couleur.
    const base = liste.find((x) => reduire(x.en) === cle)
    const nom = groupes.get(cle).nom
    const connu = trouver(nom)
    const premiere = groupes.get(cle).variantes[0]
    sortie.push({
      en: base?.en || connu?.objet || nom,
      ...(base?.fr || connu?.fr ? { fr: base?.fr || connu.fr } : {}),
      sprite: base?.sprite || premiere.sprite,
      couleurs: true,
    })
  }
  return sortie
}

const pages = {}
for (const ile of ILES) {
  pages[ile.cle] = lireIle(await chargerSerebii(ile.page))
  for (const { cle } of SECTIONS) pages[ile.cle][cle] = regrouperCouleurs(pages[ile.cle][cle])
}

/* ---------- communs et propres ---------- */

const communs = {}
const iles = Object.fromEntries(ILES.map((i) => [i.cle, {}]))
for (const { cle: section } of SECTIONS) {
  const bases = ILES.filter((i) => i.base).map((i) => pages[i.cle][section])
  const partout = new Set(
    bases[0].map((e) => reduire(e.en)).filter((r) => bases.every((l) => l.some((e) => reduire(e.en) === r))),
  )
  communs[section] = bases[0].filter((e) => partout.has(reduire(e.en)))
  for (const ile of ILES) iles[ile.cle][section] = pages[ile.cle][section].filter((e) => !partout.has(reduire(e.en)))
}

/* ---------- résumé ---------- */

const compter = (s) => SECTIONS.map(({ cle }) => `${s[cle].length} ${cle}`).join(', ')
console.log(`communs : ${compter(communs)}`)
for (const ile of ILES) console.log(`${ile.cle.padEnd(11)} : ${compter(iles[ile.cle])}`)
const sansFr = new Set(
  [communs, ...Object.values(iles)].flatMap((s) => SECTIONS.flatMap(({ cle }) => s[cle])).filter((e) => !e.fr).map((e) => e.en),
)
console.log(`\n${sansFr.size} noms sans traduction (affichés en anglais) :\n${[...sansFr].join(' ; ')}`)

if (!ecrire) {
  console.log('\nRien écrit : relancer avec --ecrire.')
  process.exit(0)
}

const sortie = {
  _lisezMoi:
    "Tout ce qu'on trouve sur chaque Île Rêve, d'après les pages « Dream Island » de Serebii, en trois sections : matériaux, plantes et blocs, objets. `communs` : ce que les cinq îles de base ont toutes ; chaque île ne garde que le reste. `fr` absent : pas de nom français connu. `sprite` : slug Serebii, qui est aussi la clé de nos sprites. Produit par scripts/importer-serebii-iles.mjs — ne pas éditer à la main.",
  _source: 'https://www.serebii.net/pokemonpokopia/dreamislands.shtml',
  communs,
  iles,
}
fs.writeFileSync(FICHIER, JSON.stringify(sortie, null, 1) + '\n')
console.log('\nsrc/data/iles-reve.json écrit.')

/* ---------- les images qui manquent ---------- */

// Celles qu'aucun dossier de sprites n'a encore : téléchargées en PNG dans sprites/iles/,
// à convertir en webp 72 × 72 comme les autres sprites (puis supprimer les PNG).
const manquantes = new Set(
  [communs, ...Object.values(iles)]
    .flatMap((s) => SECTIONS.flatMap(({ cle }) => s[cle]))
    .map((e) => e.sprite)
    .filter((slug) => slug && !existe(slug)),
)
let telechargees = 0
for (const slug of manquantes) {
  const cible = new URL(`iles/${slug}.png`, SPRITES)
  if (fs.existsSync(cible)) continue
  const entete = { headers: { 'user-agent': 'Mozilla/5.0' } }
  let r = await fetch(`https://www.serebii.net/pokemonpokopia/items/${IMAGE_SEREBII[slug] || slugsSerebii.get(slug) || slug}.png`, entete)
  if (!r.ok && imageKalos.has(slug)) r = await fetch(imageKalos.get(slug), entete)
  if (!r.ok) {
    console.log(`image manquante : ${slug}.png (${r.status})`)
    continue
  }
  fs.writeFileSync(cible, Buffer.from(await r.arrayBuffer()))
  telechargees += 1
}
if (telechargees) console.log(`${telechargees} PNG à convertir en webp 72 px dans src/data/sprites/iles/`)
