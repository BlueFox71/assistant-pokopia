// Confronte notre index d'objets à celui de Serebii, et n'écrit rien.
//
//   node scripts/auditer-objets-serebii.mjs              l'audit complet
//   node scripts/auditer-objets-serebii.mjs --detail     + la liste des écarts, un par ligne
//
// Pourquoi un audit et pas un import : nos trois fichiers plats viennent d'une extraction
// unique (cf. scripts/extraire-artifact.mjs), et Serebii remplit ses pages à la main —
// « this page is very work in progress and new items will be added periodically », dit-il
// lui-même. Les deux sources ne peuvent donc pas se recopier l'une l'autre : celle-ci sert
// à savoir CE QUI A BOUGÉ chez Serebii, à relire avant de toucher aux données.
//
// Quatre axes, du plus au moins conséquent pour l'app :
//   1. objets par préférence — ce qui manque ici manque aux recommandations d'habitat ;
//   2. Pokémon par préférence — même chose, côté colocataires ;
//   3. catégorie de confort — celle qui décide qu'un habitat est « exceptionnel » ;
//   4. catalogue des meubles — les objets qui ne cochent aucune préférence n'entrent pas
//      dans notre index, qui se construit à partir de preferences.json. Ils n'ont donc ni
//      fiche, ni vignette, ni personnalisation : c'est une limite connue, pas un bug, mais
//      elle se mesure.
//
// Les écarts « en trop chez nous » sont attendus et ne sont pas des erreurs : nos données
// distinguent les variantes que Serebii regroupe en une ligne — « Wildflowers (orange) »,
// « Paint balloon (red) », « Wing Fossil (head) ».
import fs from 'node:fs'

const BASE = 'https://www.serebii.net/pokemonpokopia'
const detaille = process.argv.includes('--detail')

const texte = (html) =>
  html
    .replace(/<br\s*\/?>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const charger = (page) =>
  fetch(`${BASE}/${page}`, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => {
    if (!r.ok) throw new Error(`${page} : HTTP ${r.status}`)
    return r.text()
  })

const lire = (fichier) => JSON.parse(fs.readFileSync(new URL(`../src/data/${fichier}`, import.meta.url), 'utf8'))

/** Les noms d'objets d'un fragment de page : chaque ligne pointe vers items/<slug>.shtml. */
const objetsDe = (html) =>
  [...new Set([...html.matchAll(/items\/[a-z0-9_.-]+\.shtml"><u>([^<]+)<\/u>/gi)].map((m) => texte(m[1])))]

const liste = (titre, noms) => {
  if (!noms.length) return
  console.log(`  ${titre} (${noms.length})`)
  if (detaille) for (const n of noms) console.log(`      ${n}`)
}

/* ---------- 1 & 2 : les 43 préférences, objet par objet et Pokémon par Pokémon ---------- */

const nosPrefs = lire('preferences.json')
const nosObjets = lire('objets.json')
const nosPokemon = lire('pokemon.json')

const index = await charger('favorites.shtml')
const pages = [...index.matchAll(/favorites\/([a-z0-9-]+)\.shtml"><u>([^<]+)<\/u>/gi)].map((m) => ({
  page: m[1],
  nom: m[2],
}))

const parNom = new Map(nosPrefs.map((p) => [p.en.toLowerCase(), p]))
console.log(`préférences : ${pages.length} chez Serebii, ${nosPrefs.length} chez nous`)
liste('absentes de chez nous', pages.filter((p) => !parNom.has(p.nom.toLowerCase())).map((p) => p.nom))
const nomsSerebii = new Set(pages.map((p) => p.nom.toLowerCase()))
liste('absentes de chez Serebii', nosPrefs.filter((p) => !nomsSerebii.has(p.en.toLowerCase())).map((p) => p.en))

/** Serebii nomme ses Pokémon par slug de Pokédex ; on rapproche sur le nom anglais réduit. */
const reduire = (nom) => nom.toLowerCase().replace(/[^a-z0-9]/g, '')
const pokemonParSlug = new Map(nosPokemon.map((p) => [reduire(p.en), p.en]))

/** Catégorie de confort telle que Serebii la marque, par objet — pour l'axe 3. */
const categorieSerebii = new Map()

let objetsManquants = 0
let objetsEnTrop = 0
let pokemonManquants = 0
let pokemonEnTrop = 0
const detailObjets = []
const detailPokemon = []

for (const { page, nom } of pages) {
  const notre = parNom.get(nom.toLowerCase())
  if (!notre) continue
  const html = await charger(`favorites/${page}.shtml`)

  // La page est en deux tableaux : les objets, puis « List of … that like … ».
  const coupure = html.search(/List of [\s\S]{0,80}?that like/i)
  const partObjets = coupure > 0 ? html.slice(0, coupure) : html
  const partPokemon = coupure > 0 ? html.slice(coupure) : ''

  const objets = objetsDe(partObjets)
  const chezNous = new Set(notre.objets)
  const chezEux = new Set(objets)
  const manquants = objets.filter((o) => !chezNous.has(o))
  const enTrop = notre.objets.filter((o) => !chezEux.has(o))
  objetsManquants += manquants.length
  objetsEnTrop += enTrop.length
  if (manquants.length) detailObjets.push({ nom, manquants })

  // La colonne « Category » porte l'icône de confort ; son alt est le libellé du jeu.
  for (const m of partObjets.matchAll(/items\/[a-z0-9_.-]+\.shtml"><u>([^<]+)<\/u>[\s\S]{0,900}?<\/tr>/gi)) {
    const cat = m[0].match(/alt="(Decoration|Relaxation|Toy|Road)"/)
    if (cat) categorieSerebii.set(texte(m[1]), cat[1])
  }

  const slugs = [...new Set([...partPokemon.matchAll(/\/pokedex\/([a-z0-9'.-]+)\.shtml/gi)].map((m) => m[1]))]
    .filter((s) => s !== 'idealhabitat' && s !== 'specialty')
  const leurs = new Set(slugs.map((s) => pokemonParSlug.get(reduire(s)) || s))
  const nôtres = new Set(notre.pokemon)
  const pkManquants = [...leurs].filter((n) => !nôtres.has(n))
  const pkEnTrop = notre.pokemon.filter((n) => !leurs.has(n))
  pokemonManquants += pkManquants.length
  pokemonEnTrop += pkEnTrop.length
  if (pkManquants.length) detailPokemon.push({ nom, manquants: pkManquants })
}

console.log(`\nobjets par préférence : ${objetsManquants} manquants, ${objetsEnTrop} en trop (variantes, attendu)`)
for (const { nom, manquants } of detailObjets) console.log(`  ${nom} : ${manquants.join(', ')}`)

console.log(`\nPokémon par préférence : ${pokemonManquants} manquants, ${pokemonEnTrop} en trop`)
for (const { nom, manquants } of detailPokemon) console.log(`  ${nom} : ${manquants.join(', ')}`)

/* ---------- 3 : la catégorie de confort ---------- */

const notreCategorie = new Map(nosObjets.map((o) => [o.en, o.categorie]))
const desaccords = []
let comblables = 0
for (const [nom, leur] of categorieSerebii) {
  if (!notreCategorie.has(nom)) continue
  const nôtre = notreCategorie.get(nom)
  if (nôtre === null) comblables += 1
  else if (nôtre !== leur) desaccords.push(`${nom} : nous « ${nôtre} », Serebii « ${leur} »`)
}
console.log(`\ncatégorie de confort : ${categorieSerebii.size} objets marqués chez Serebii`)
console.log(`  ${desaccords.length} désaccords, ${comblables} de nos « null » que Serebii remplit`)
for (const d of desaccords) console.log(`      ${d}`)

/* ---------- 4 : le catalogue des meubles ---------- */

const meubles = objetsDe(await charger('furniture.shtml'))
const complement = lire('objets-complement.json').objets
const connus = new Set([...nosObjets, ...complement].map((o) => o.en.toLowerCase()))
const absents = meubles.filter((m) => !connus.has(m.toLowerCase()))
console.log(`\ncatalogue des meubles : ${meubles.length} chez Serebii`)
console.log(`  catalogue chez nous : ${nosObjets.length} + ${complement.length} rattrapés`)
console.log(`  ${absents.length} encore absents`)
if (absents.length) for (const m of absents) console.log(`      ${m}`)
