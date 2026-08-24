// Imprime le classement des 714 objets par catégorie de meuble, pour relecture.
//
//   node scripts/auditer-categories.mjs            décomptes seuls
//   node scripts/auditer-categories.mjs --tout     décomptes + liste complète
//   node scripts/auditer-categories.mjs lit ecran  seulement ces catégories, en entier
//
// Les règles de src/data/categories.js sont des motifs sur le nom anglais : elles se
// trompent en silence. Ce script est le seul endroit où l'on voit ce qu'elles ont décidé.
import fs from 'node:fs'
import { FR_TYPE_OBJET, TYPES_OBJET, typeObjet } from '../src/data/categories.js'

const objets = JSON.parse(fs.readFileSync(new URL('../src/data/objets.json', import.meta.url)))

const args = process.argv.slice(2)
const tout = args.includes('--tout')
const demandes = args.filter((a) => !a.startsWith('--'))

const parType = new Map(TYPES_OBJET.map((t) => [t, []]))
for (const o of objets) parType.get(typeObjet(o.en, o.categorie)).push(o)

for (const type of TYPES_OBJET) {
  const liste = parType.get(type)
  console.log(`\n${FR_TYPE_OBJET[type]} — ${liste.length} objets`)
  const detaille = tout || demandes.includes(type)
  const montres = detaille ? liste : liste.slice(0, 12)
  console.log('  ' + montres.map((o) => `${o.fr} (${o.en})`).join('\n  '))
  if (!detaille && liste.length > montres.length) console.log(`  … +${liste.length - montres.length}`)
}

console.log('\ntotal :', objets.length)
