// Complète les spécialités de src/data/pokemon.json depuis les trois Pokédex de Serebii.
//
//   node scripts/importer-serebii-specialites.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-serebii-specialites.mjs --ecrire           applique à src/data/pokemon.json
//   node scripts/importer-serebii-specialites.mjs --local <dossier>  part de pages déjà téléchargées
//
// Pokébip (scripts/importer-pokebip.mjs) ne couvre que le Pokédex principal : le bassin,
// les événementiels et les formes restaient sans spécialité. Serebii les porte toutes,
// sous leur nom anglais ; la traduction suit la liste de Pokékalos, qui donne les deux noms
// côte à côte (https://www.pokekalos.fr/jeux/switch2/pokopia/specialites.html).
//
// Pokébip reste la source première : ce script ne remplit que les trous, et imprime les
// désaccords sans y toucher — sauf pour les entrées de CORRIGER, où l'erreur est la nôtre.
import fs from 'node:fs'
import path from 'node:path'

const PAGES = ['availablepokemon.shtml', 'basinpokedex.shtml', 'eventpokedex.shtml']

const FICHIER = new URL('../src/data/pokemon.json', import.meta.url)

/** Le slug des liens de Serebii (`specialty/<slug>.shtml`) → le nom français. */
const FR = {
  appraise: 'Expertise',
  build: 'Construction',
  bulldoze: 'Aplanissement',
  burn: 'Combustion',
  chop: 'Coupe de bois',
  collect: 'Collection',
  crush: 'Broyage',
  dj: 'DJ',
  dreamisland: 'Île Rêve',
  eat: 'Gloutonnerie',
  engineer: 'Travaux',
  explode: 'Explosion',
  fly: 'Vol',
  gather: 'Rangement',
  gatherhoney: 'Récolte de miel',
  generate: 'Électrification',
  grow: 'Fertilisation',
  hype: 'Animation',
  illuminate: 'Luminescence',
  litter: 'Désordre',
  paint: 'Peinture',
  party: 'Fête',
  rarify: 'Minerai rare',
  recycle: 'Recyclage',
  scrub: 'Nettoyage',
  search: 'Recherche',
  storage: 'Stockage',
  teleport: 'Téléportation',
  trade: 'Troc',
  transform: 'Transformation',
  water: 'Arrosage',
  yawn: 'Bâillement',
}

// Hérité à tort par l'appariement de Pokébip : Peakychu n'y a pas de ligne et tenait celle
// de Pikachu (Électrification), alors qu'il est le seul spécialiste de la Luminescence.
// Serebii a tort sur Bouldeneu (Fertilisation, Désordre) : c'est bien l'Expertise.
const CORRIGER = new Set(['Peakychu'])

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const dossierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

/**
 * Une ligne par Pokémon, ouverte par sa cellule « #001 ». La cellule des spécialités
 * imbrique un tableau, ce qui fausse un découpage par `<tr>` : on coupe sur les numéros.
 */
function extraire(html) {
  const entrees = []
  for (const bloc of html.split(/<td class="cen">#(?=\d+<\/td>)/).slice(1)) {
    const nom = bloc.match(/<u>([^<]+)<\/u><\/a><\/td>/)?.[1]?.replace(/&eacute;/g, 'é')
    const slugs = [...new Set([...bloc.matchAll(/specialty\/([a-z0-9]+)\.shtml"><u>/g)].map((m) => m[1]))]
    if (nom) entrees.push({ nom, slugs })
  }
  return entrees
}

const charger = async (fichier) =>
  dossierLocal
    ? fs.readFileSync(path.join(dossierLocal, fichier), 'utf8')
    : fetch(`https://www.serebii.net/pokemonpokopia/${fichier}`, {
        headers: { 'user-agent': 'Mozilla/5.0' },
      }).then((r) => r.text())

const parNom = new Map()
const inconnus = new Set()
for (const fichier of PAGES) {
  const entrees = extraire(await charger(fichier))
  if (!entrees.length) throw new Error(`aucune entrée lue dans ${fichier}`)
  console.log(`${fichier.padEnd(24)} : ${entrees.length} lignes`)
  for (const { nom, slugs } of entrees) {
    if (parNom.has(nom)) continue
    slugs.filter((s) => !FR[s]).forEach((s) => inconnus.add(s))
    parNom.set(nom, slugs.map((s) => FR[s] || s))
  }
}
if (inconnus.size) throw new Error(`spécialités sans nom français : ${[...inconnus].join(', ')}`)

const memes = (a, b) => [...a].sort().join('|') === [...b].sort().join('|')

const nôtres = JSON.parse(fs.readFileSync(FICHIER, 'utf8'))
const ajouts = []
const corrections = []
const desaccords = []
const rates = []

const suivant = nôtres.map((p) => {
  const serebii = parNom.get(p.en)
  const actuelles = p.specialites || []
  if (!serebii) {
    rates.push(`${p.fr} (${p.en})`)
    return p
  }
  if (!serebii.length || memes(actuelles, serebii)) return p
  if (!actuelles.length) {
    ajouts.push(`${p.fr} : ${serebii.join(', ')}`)
    return { ...p, specialites: serebii }
  }
  if (CORRIGER.has(p.en)) {
    corrections.push(`${p.fr} : ${actuelles.join(', ')} → ${serebii.join(', ')}`)
    return { ...p, specialites: serebii }
  }
  desaccords.push(`${p.fr} : nous ${actuelles.join(', ')} · Serebii ${serebii.join(', ')}`)
  return p
})

if (ajouts.length) console.log(`\najoutées (${ajouts.length}) :\n  ` + ajouts.join('\n  '))
if (corrections.length) console.log(`\ncorrigées (${corrections.length}) :\n  ` + corrections.join('\n  '))
if (desaccords.length)
  console.log(`\ndésaccords laissés en l'état (${desaccords.length}) :\n  ` + desaccords.join('\n  '))
if (rates.length) console.log(`\nabsents de Serebii (${rates.length}) :\n  ` + rates.join('\n  '))

const sans = suivant.filter((p) => !p.specialites?.length).map((p) => p.fr)
console.log(`\nsans spécialité (${sans.length}) : ${sans.join(', ')}`)

if (!ecrire) {
  console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
} else {
  fs.writeFileSync(FICHIER, JSON.stringify(suivant, null, 1))
  console.log('\nsrc/data/pokemon.json mis à jour.')
}
