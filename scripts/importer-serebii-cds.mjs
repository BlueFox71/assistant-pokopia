// Relève la liste des CD de musique, pour le filtre « CD » de la liste de courses.
//
//   node scripts/importer-serebii-cds.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-serebii-cds.mjs --ecrire           applique à src/data/cds.json
//   node scripts/importer-serebii-cds.mjs --local <dossier>  part d'une page déjà téléchargée
//
// Rien dans nos données ne distingue un CD : sans catégorie de confort, « The Academy » ou
// « Pokémon Gym » tombent dans les ressources avec la pierre et le bois (cf. categories.js).
// Serebii leur consacre une page, `cds.shtml`, dont chaque ligne porte l'image de l'objet :
// on garde le nom anglais de celles qui sont à notre catalogue.
import fs from 'node:fs'
import path from 'node:path'

const PAGE = 'cds.shtml'
const SOURCE = `https://www.serebii.net/pokemonpokopia/${PAGE}`

const FICHIER = new URL('../src/data/cds.json', import.meta.url)
const OBJETS = new URL('../src/data/objets.json', import.meta.url)
const COMPLEMENT = new URL('../src/data/objets-complement.json', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const dossierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

const charger = async () =>
  dossierLocal
    ? fs.readFileSync(path.join(dossierLocal, PAGE), 'latin1')
    : fetch(SOURCE, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text())

const html = await charger()

// La clé de sprite plutôt que le nom : c'est celle de nos objets (`theacademy`), et elle
// ne souffre pas des accents que Serebii encode tantôt en entité, tantôt en Latin-1.
const sprites = [...html.matchAll(/<img src="items\/([^"]+)\.png"/g)].map((m) => m[1])
if (!sprites.length) throw new Error(`aucun CD lu dans ${PAGE}`)

const nôtres = [
  ...JSON.parse(fs.readFileSync(OBJETS, 'utf8')),
  ...JSON.parse(fs.readFileSync(COMPLEMENT, 'utf8')).objets,
]
const parSprite = new Map(nôtres.map((o) => [o.sprite, o.en]))

const retenus = [...new Set(sprites.filter((s) => parSprite.has(s)).map((s) => parSprite.get(s)))].sort()
const horsIndex = sprites.filter((s) => !parSprite.has(s))

console.log(`CD lus : ${sprites.length}`)
console.log(`appariés : ${retenus.length}`)
if (horsIndex.length) console.log(`hors de notre index (${horsIndex.length}) :\n  ` + horsIndex.join('\n  '))

const suivant = { source: SOURCE, cds: retenus }

if (!ecrire) console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
else {
  fs.writeFileSync(FICHIER, JSON.stringify(suivant, null, 1))
  console.log('\nsrc/data/cds.json mis à jour.')
}
