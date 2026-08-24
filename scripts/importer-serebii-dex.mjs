// Attribue à chaque Pokémon son Pokédex d'origine et son numéro, depuis Serebii.
//
//   node scripts/importer-serebii-dex.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-serebii-dex.mjs --ecrire           applique à src/data/pokemon.json
//   node scripts/importer-serebii-dex.mjs --local <dossier>  part de pages déjà téléchargées
//
// Pokopia tient TROIS Pokédex, et chacun repart de #001 :
//
//   principal   300 espèces (308 lignes avec les formes)  availablepokemon.shtml
//   bassin       52 espèces, DLC Bubbly Basin             basinpokedex.shtml
//   evenement     7 espèces, obtenues en événement        eventpokedex.shtml
//
// Le numéro seul est donc ambigu : Onix est #030 du principal, Mamanbo #030 du bassin.
// C'est ce qui produisait 56 collisions dans nos données, qui les avaient fusionnés en une
// seule table. Le champ `dex` lève l'ambiguïté ; l'affichage et le tri s'en servent.
//
// Pokébip (scripts/importer-pokebip.mjs) ne couvre que le Pokédex principal : c'est lui qui
// apporte types et spécialités, ce script-ci fait autorité sur les numéros.
import fs from 'node:fs'
import path from 'node:path'

const PAGES = {
  principal: 'availablepokemon.shtml',
  bassin: 'basinpokedex.shtml',
  evenement: 'eventpokedex.shtml',
}

const FICHIER = new URL('../src/data/pokemon.json', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const dossierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

const texte = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/** Les tableaux de Serebii : « No. | Pic | Name | … », le numéro préfixé d'un croisillon. */
function extraire(html) {
  const entrees = []
  for (const [, corps] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cellules = [...corps.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => texte(m[1]))
    if (!/^#\d+$/.test(cellules[0] || '')) continue
    const nom = cellules[2]
    if (nom) entrees.push({ numero: cellules[0].slice(1).padStart(3, '0'), nom })
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
for (const [dex, fichier] of Object.entries(PAGES)) {
  const entrees = extraire(await charger(fichier))
  if (!entrees.length) throw new Error(`aucune entrée lue dans ${fichier}`)
  console.log(`${dex.padEnd(10)} : ${entrees.length} lignes`)
  // Le premier gagne : une forme partage le numéro de son espèce, jamais l'inverse.
  for (const e of entrees) if (!parNom.has(e.nom)) parNom.set(e.nom, { dex, numero: e.numero })
}

const nôtres = JSON.parse(fs.readFileSync(FICHIER, 'utf8'))
const rates = []
const ecarts = []

const suivant = nôtres.map((p) => {
  const trouve = parNom.get(p.en)
  if (!trouve) {
    rates.push(`${p.fr} (${p.en})`)
    return p
  }
  if (p.numero !== trouve.numero) ecarts.push(`${p.fr} : ${p.numero} → ${trouve.numero}`)
  return { ...p, numero: trouve.numero, dex: trouve.dex }
})

const compte = suivant.reduce((acc, p) => ({ ...acc, [p.dex || 'sans']: (acc[p.dex || 'sans'] || 0) + 1 }), {})
console.log('\nrépartition :', JSON.stringify(compte))
if (ecarts.length) console.log(`numéros changés (${ecarts.length}) :\n  ` + ecarts.join('\n  '))
if (rates.length) console.log(`sans correspondance (${rates.length}) :\n  ` + rates.join('\n  '))

// Une collision restante signifierait que deux Pokémon distincts d'un même Pokédex
// partagent un numéro sans être deux formes de la même espèce.
const vus = new Map()
for (const p of suivant) {
  const k = `${p.dex}#${p.numero}`
  if (!vus.has(k)) vus.set(k, [])
  vus.get(k).push(p.fr)
}
const collisions = [...vus].filter(([, l]) => l.length > 1)
console.log(`\nnuméros partagés (formes d'une même espèce, attendu) : ${collisions.length}`)
for (const [k, l] of collisions) console.log(`  ${k} → ${l.join(', ')}`)

if (!ecrire) console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
else {
  fs.writeFileSync(FICHIER, JSON.stringify(suivant, null, 1))
  console.log('\nsrc/data/pokemon.json mis à jour.')
}
