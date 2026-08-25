// Remplit src/data/villes.json — la ville d'origine de chaque Pokémon — depuis une liste
// écrite à la main, puisque aucune source ne la publie.
//
//   node scripts/importer-villes.mjs <liste.txt>            lit, compare, n'écrit rien
//   node scripts/importer-villes.mjs <liste.txt> --ecrire   applique
//   node scripts/importer-villes.mjs --deduites             imprime la déduction actuelle
//                                                          au format attendu, à corriger
//
// Le format est celui qu'on écrit sans y penser : une ville en titre, ses Pokémon dessous,
// un par ligne ou séparés par des virgules. Les noms sont acceptés en français comme en
// anglais, accents et casse indifférents.
//
//   Terrassec
//     Bulbizarre, Herbizarre
//     Florizarre
//
//   # Grisemer
//   Nosferapti
//
// Ce que le script écrit fait AUTORITÉ sur la déduction par habitat de src/data/villes.js,
// et l'application présente alors la ville comme officielle. Ce qu'il n'écrit pas continue
// d'être déduit : une liste partielle est utile telle quelle.
import fs from 'node:fs'

const FICHIER_POKEMON = new URL('../src/data/pokemon.json', import.meta.url)
const FICHIER_VILLES = new URL('../src/data/villes.json', import.meta.url)

/** Les villes, recopiées de src/data/villes.js — un .mjs ne peut pas importer le JSX autour. */
const VILLES = [
  { cle: 'terrassec', nom: 'Terrassec', habitats: ['Bright'] },
  { cle: 'grisemer', nom: 'Grisemer', habitats: ['Dark', 'Humid'] },
  { cle: 'collinangle', nom: 'Collinangle', habitats: ['Dry', 'Cool'] },
  { cle: 'flotiles', nom: 'Flotîles-Millefeux', habitats: ['Warm'] },
  { cle: 'ville-nouvelle', nom: 'Ville-Nouvelle', habitats: [] },
  { cle: 'fonds-bulleux', nom: 'Fonds Bulleux', habitats: [] },
]
const HABITAT_VERS_VILLE = Object.fromEntries(
  VILLES.flatMap((v) => v.habitats.map((h) => [h, v.cle])),
)
const DEX_VERS_VILLE = { bassin: 'fonds-bulleux', evenement: 'ville-nouvelle' }

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const source = args.find((a) => !a.startsWith('--'))

const pokemon = JSON.parse(fs.readFileSync(FICHIER_POKEMON, 'utf8'))

/** « Flotîles-Millefeux » -> « flotiles millefeux » : de quoi apparier une saisie à la main. */
const aplatir = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Ville par défaut, telle que src/data/villes.js la calcule — pour --deduites et l'écart. */
const villeParDefaut = (p) =>
  DEX_VERS_VILLE[p.dex] || HABITAT_VERS_VILLE[p.habitat] || 'terrassec'

/* ---------- index de reconnaissance ---------- */

const villeParLibelle = new Map()
for (const v of VILLES) {
  villeParLibelle.set(aplatir(v.cle), v.cle)
  villeParLibelle.set(aplatir(v.nom), v.cle)
}
// « Flotîles » seul suffit : personne n'écrit le nom complet à chaque fois.
villeParLibelle.set('flotiles', 'flotiles')
villeParLibelle.set('bulleux', 'fonds-bulleux')

const pokemonParLibelle = new Map()
for (const p of pokemon) {
  // Le français d'abord : deux entrées peuvent partager un libellé aplati (une forme et son
  // espèce), et c'est l'espèce, listée la première, qu'on veut voir gagner.
  for (const libelle of [aplatir(p.fr), aplatir(p.en)]) {
    if (libelle && !pokemonParLibelle.has(libelle)) pokemonParLibelle.set(libelle, p.en)
  }
}

/* ---------- --deduites : le point de départ à corriger ---------- */

if (args.includes('--deduites')) {
  for (const v of VILLES) {
    const siens = pokemon
      .filter((p) => villeParDefaut(p) === v.cle)
      .sort((a, b) => a.fr.localeCompare(b.fr, 'fr'))
    console.log(`\n# ${v.nom}  (${siens.length})`)
    for (const p of siens) console.log(p.fr)
  }
  process.exit(0)
}

if (!source) {
  console.error('Usage : node scripts/importer-villes.mjs <liste.txt> [--ecrire]')
  console.error('        node scripts/importer-villes.mjs --deduites')
  process.exit(1)
}

/* ---------- lecture de la liste ---------- */

const attributions = {}
const inconnus = []
const doublons = []
let villeCourante = null
let ligneNo = 0

for (const brute of fs.readFileSync(source, 'utf8').split(/\r?\n/)) {
  ligneNo += 1
  const ligne = brute.replace(/^\s*[#*\-–]+\s*/, '').trim()
  if (!ligne) continue

  // Une ligne qui ne nomme qu'une ville — éventuellement suivie d'un décompte entre
  // parenthèses, comme ce que --deduites imprime — ouvre une section.
  const sansCompte = ligne.replace(/\(\s*\d+\s*\)\s*$/, '').replace(/[:：]\s*$/, '').trim()
  const villeSeule = villeParLibelle.get(aplatir(sansCompte))
  if (villeSeule) {
    villeCourante = villeSeule
    continue
  }

  // « Terrassec : Bulbizarre, Herbizarre » — la ville et ses Pokémon sur la même ligne.
  const deuxPoints = ligne.indexOf(':')
  let reste = ligne
  if (deuxPoints > 0) {
    const avant = villeParLibelle.get(aplatir(ligne.slice(0, deuxPoints)))
    if (avant) {
      villeCourante = avant
      reste = ligne.slice(deuxPoints + 1)
    }
  }

  for (const morceau of reste.split(/[,;/]|\s{2,}/)) {
    const libelle = aplatir(morceau)
    if (!libelle) continue
    if (!villeCourante) {
      inconnus.push(`l.${ligneNo} « ${morceau.trim()} » — aucune ville ouverte avant`)
      continue
    }
    const nom = pokemonParLibelle.get(libelle)
    if (!nom) {
      inconnus.push(`l.${ligneNo} « ${morceau.trim()} » — Pokémon inconnu`)
      continue
    }
    if (attributions[nom] && attributions[nom] !== villeCourante) {
      doublons.push(`${nom} : ${attributions[nom]} puis ${villeCourante}`)
    }
    attributions[nom] = villeCourante
  }
}

/* ---------- rapport ---------- */

const compte = {}
for (const cle of Object.values(attributions)) compte[cle] = (compte[cle] || 0) + 1
console.log(`${Object.keys(attributions).length} Pokémon rattachés sur ${pokemon.length}`)
for (const v of VILLES) console.log(`  ${v.nom.padEnd(20)} ${compte[v.cle] || 0}`)

const ecarts = pokemon.filter((p) => attributions[p.en] && attributions[p.en] !== villeParDefaut(p))
console.log(`\ndont ${ecarts.length} qui corrigent la déduction par habitat`)

const manquants = pokemon.filter((p) => !attributions[p.en])
if (manquants.length)
  console.log(
    `\n${manquants.length} Pokémon restent déduits :\n  ` +
      manquants.map((p) => p.fr).join(', '),
  )
if (doublons.length) console.log(`\ncités deux fois (le dernier gagne) :\n  ` + doublons.join('\n  '))
if (inconnus.length) console.log(`\nnon reconnus (${inconnus.length}) :\n  ` + inconnus.join('\n  '))

if (!ecrire) {
  console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
} else {
  const fichier = JSON.parse(fs.readFileSync(FICHIER_VILLES, 'utf8'))
  const trie = Object.fromEntries(
    Object.entries(attributions).sort(([a], [b]) => a.localeCompare(b, 'en')),
  )
  fs.writeFileSync(FICHIER_VILLES, JSON.stringify({ ...fichier, attributions: trie }, null, 2) + '\n')
  console.log('\nsrc/data/villes.json mis à jour.')
}
