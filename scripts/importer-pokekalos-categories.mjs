// Relève la catégorie de chaque objet dans le jeu, d'après la liste des objets de Pokékalos.
//
//   node scripts/importer-pokekalos-categories.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-pokekalos-categories.mjs --ecrire           applique à src/data/categories-jeu.json
//   node scripts/importer-pokekalos-categories.mjs --local <fichier>  part d'une page déjà téléchargée
//
// Le jeu range ses objets en onglets — Ameublement, Objets utiles, Extérieur, Ressources,
// Nature, Autres… — que ni Serebii ni nos données ne reprennent. Pokékalos les donne, objet
// par objet (`data-cat` sur chaque bloc, `data-name-en` sur chaque objet). categories.js
// s'en sert pour ranger ce qui n'est pas un meuble : une matière première est ce que le jeu
// met dans « Ressources », un établi ce qu'il met dans « Objets utiles ».
//
// On ne garde que les noms que nous connaissons (catalogue et méthodes), en minuscules :
// Pokékalos écrit « storage box » là où Serebii écrit « Storage box ».
import fs from 'node:fs'

const SOURCE = 'https://www.pokekalos.fr/jeux/switch2/pokopia/objets.html'
const FICHIER = new URL('../src/data/categories-jeu.json', import.meta.url)
const lire = (f) => JSON.parse(fs.readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'))

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const fichierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

const html = fichierLocal
  ? fs.readFileSync(fichierLocal, 'utf8')
  : await fetch(SOURCE, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text())

const decoder = (s) =>
  s.replace(/&#0?39;|&#x27;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"')
const cle = (s) => decoder(s).toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim()

// Chaque bloc `data-cat` court jusqu'au suivant ; la page répète les onglets pour le jeu de
// base, le DLC et les événements. Un objet listé deux fois garde sa première catégorie.
const reperes = [...html.matchAll(/data-cat="([^"]+)"/g)].map((m) => ({ cat: decoder(m[1]), i: m.index }))
const parNom = new Map()
reperes.forEach(({ cat, i }, k) => {
  const bout = html.slice(i, reperes[k + 1]?.i ?? html.length)
  for (const [, en] of bout.matchAll(/data-name-en="([^"]*)"/g)) if (!parNom.has(cle(en))) parNom.set(cle(en), cat)
})
if (!parNom.size) throw new Error('aucun objet lu sur la page')

const nôtres = [
  ...lire('objets.json').map((o) => o.en),
  ...lire('objets-complement.json').objets.map((o) => o.en),
  ...lire('methodes.json').methodes.filter((m) => !m.objet).map((m) => m.en),
]
const retenus = {}
const absents = []
for (const en of nôtres) {
  const cat = parNom.get(cle(en))
  if (cat) retenus[cle(en)] = cat
  else absents.push(en)
}

const compte = {}
for (const cat of Object.values(retenus)) compte[cat] = (compte[cat] || 0) + 1
console.log(`objets lus : ${parNom.size}`)
console.log(`appariés : ${Object.keys(retenus).length} / ${nôtres.length}`)
console.log('répartition :', JSON.stringify(compte))
// Attendu : les variantes de couleur des fleurs, quelques débris — Pokékalos ne liste
// qu'une entrée par espèce de fleur.
if (absents.length) console.log(`sans catégorie (${absents.length}) :\n  ` + absents.join('\n  '))

const suivant = {
  source: SOURCE,
  categories: Object.fromEntries(Object.keys(retenus).sort().map((n) => [n, retenus[n]])),
}

if (!ecrire) console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
else {
  fs.writeFileSync(FICHIER, JSON.stringify(suivant, null, 1))
  console.log('\nsrc/data/categories-jeu.json mis à jour.')
}
