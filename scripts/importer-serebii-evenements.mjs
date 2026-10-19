// Relève, événement par événement, les objets qu'il a introduits dans le jeu.
//
//   node scripts/importer-serebii-evenements.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-serebii-evenements.mjs --ecrire           applique à src/data/evenements.json
//   node scripts/importer-serebii-evenements.mjs --local <dossier>  part de pages déjà téléchargées
//
// Serebii tient une page par événement (`events/<slug>.shtml`), listées sur `events.shtml`.
// Chacune a une section « New Items in Event » : c'est elle qui fait foi. Les « Event Item
// Exchanges » n'en sont qu'un sous-ensemble, et les tables de récompenses des concours
// (corde à sauter, cache-cache) distribuent surtout des objets ordinaires — PokéMétal,
// plumes — qu'il serait faux de marquer comme événementiels.
//
// Seuls les objets de notre catalogue sont retenus : un objet absent n'a pas de fiche à
// ouvrir. Ils sont imprimés, et rangés sous `absents` pour qu'on sache ce qui manque.
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://www.serebii.net/pokemonpokopia'
const FICHIER = new URL('../src/data/evenements.json', import.meta.url)
const OBJETS = new URL('../src/data/objets.json', import.meta.url)
const COMPLEMENT = new URL('../src/data/objets-complement.json', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const dossierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

/**
 * Le Pokémon qui donne son nom à l'événement, en français, par slug de page. Serebii ne
 * nomme que l'événement, en anglais ; on le désigne ici par son Pokémon, comme le jeu le
 * présente. Un événement inconnu fait échouer le script plutôt que de passer sans nom.
 */
const POKEMON_FR = {
  "pumpkaboo'ssweetsurprises": 'Pitrouille',
  fetchingscalesforfeebas: 'Barpau',
  "zorua'shide-and-sneakcontest": 'Zorua',
  wishuponajirachi: 'Jirachi',
  "sableye'sgemhunt": 'Ténéfix',
  "bulbasaur'sjumpropecontest": 'Bulbizarre',
  copycatchallenge: 'Simularbre',
  moresporesforhoppip: 'Granivol',
}

const MOIS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

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

const charger = async (page) => {
  if (dossierLocal) return fs.readFileSync(path.join(dossierLocal, page.replace(/\//g, '_')), 'latin1')
  const r = await fetch(`${BASE}/${page}`, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`${page} : HTTP ${r.status}`)
  return r.text()
}

/** « October 17th - November 1st 2026 » -> `2026-10-17` : le premier jour de la première période. */
function premierJour(duree) {
  const m = duree.toLowerCase().match(new RegExp(`(${MOIS.join('|')}) (\\d+)`))
  const annee = duree.match(/\b(20\d\d)\b/)
  if (!m || !annee) throw new Error(`durée illisible : « ${duree} »`)
  const mois = String(MOIS.indexOf(m[1]) + 1).padStart(2, '0')
  return `${annee[1]}-${mois}-${m[2].padStart(2, '0')}`
}

const reduire = (nom) => nom.toLowerCase().replace(/[^a-z0-9]/g, '')
const catalogue = [
  ...JSON.parse(fs.readFileSync(OBJETS, 'utf8')),
  ...JSON.parse(fs.readFileSync(COMPLEMENT, 'utf8')).objets,
]
const parNomReduit = new Map(catalogue.map((o) => [reduire(o.en), o.en]))

const index = await charger('events.shtml')
const lignes = [...index.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)]
  .map((m) => m[1])
  .filter((l) => /events\/[^"]+\.shtml/.test(l))

const evenements = []
for (const ligne of lignes) {
  const slug = ligne.match(/events\/([^"]+)\.shtml/)[1]
  const cellules = [...ligne.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => texte(m[1]))
  const [nom, duree] = cellules.filter(Boolean).slice(-2)
  if (!POKEMON_FR[slug]) throw new Error(`événement sans Pokémon dans POKEMON_FR : ${slug} (${nom})`)

  const page = await charger(`events/${slug}.shtml`)
  const section = page.split(/<h2>/i).find((s) => /^New Items in Event/i.test(texte(s)))
  const noms = section
    ? [...new Set([...section.matchAll(/items\/[^"]+\.shtml"><u>([^<]+)<\/u>/gi)].map((m) => texte(m[1])))]
    : []

  const objets = []
  const absents = []
  // « Prism scale (outdoors) » : une variante que notre catalogue ne distingue pas retombe
  // sur l'objet de base.
  for (const n of noms) {
    const notre = parNomReduit.get(reduire(n)) || parNomReduit.get(reduire(n.replace(/\(.*\)/, '')))
    if (!notre) absents.push(n)
    else if (!objets.includes(notre)) objets.push(notre)
  }
  evenements.push({ slug, en: nom, pokemon: POKEMON_FR[slug], debut: premierJour(duree), objets, absents })
}

evenements.sort((a, b) => b.debut.localeCompare(a.debut))

for (const e of evenements) {
  console.log(`${e.debut}  ${e.pokemon.padEnd(11)} ${e.objets.length} objets${e.absents.length ? `, ${e.absents.length} absents du catalogue` : ''}`)
  for (const n of e.absents) console.log(`      absent : ${n}`)
}

const sortie = {
  _lisezMoi:
    "Les objets introduits par chaque événement, d'après la section « New Items in Event » des pages de Serebii. `objets` ne retient que ceux de notre catalogue ; `absents` dit ce qui manque. Produit par scripts/importer-serebii-evenements.mjs — ne pas éditer à la main.",
  _source: `${BASE}/events.shtml`,
  evenements,
}

if (ecrire) {
  fs.writeFileSync(FICHIER, JSON.stringify(sortie, null, 1) + '\n')
  console.log(`\nécrit : ${evenements.length} événements dans src/data/evenements.json`)
} else console.log('\n(rien d’écrit — relancer avec --ecrire)')
