// Relève, pour chaque meuble, ce que Smearguru peut y changer — peinture, motif, ou rien.
//
//   node scripts/importer-serebii-personnalisation.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-serebii-personnalisation.mjs --ecrire           applique à src/data/personnalisation.json
//   node scripts/importer-serebii-personnalisation.mjs --local <dossier>  part d'une page déjà téléchargée
//
// Une seule page de Serebii porte l'information : `furniture.shtml`, dont la dernière
// colonne — « Colour » — vaut « Paint », « Pattern », les deux, ou « No change possible ».
// Ni items.shtml ni building.shtml n'ont cette colonne : le reste du catalogue (matériaux,
// revêtements, fossiles, disques) n'est donc ni personnalisable, ni documenté comme tel —
// d'où l'absence de clé plutôt qu'un « aucune » qu'on ne pourrait pas justifier.
//
// La palette, elle, ne dépend pas de l'objet : les 18 couleurs sont les mêmes partout, et
// vivent dans src/data/couleurs.js. Ce fichier-ci ne dit que « qui peut être repeint ».
import fs from 'node:fs'
import path from 'node:path'

const PAGE = 'furniture.shtml'
const SOURCE = `https://www.serebii.net/pokemonpokopia/${PAGE}`

const FICHIER = new URL('../src/data/personnalisation.json', import.meta.url)
const OBJETS = new URL('../src/data/objets.json', import.meta.url)
const COMPLEMENT = new URL('../src/data/objets-complement.json', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const dossierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

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

/**
 * « Pattern | Paint | » -> `motif+peinture`. Les quatre valeurs de la colonne se lisent
 * par présence de mots-clés plutôt que par égalité : Serebii empile ses cellules avec des
 * <br />, et l'ordre des deux lignes n'est pas garanti.
 */
function lireColonne(valeur) {
  const peinture = /\bpaint\b/i.test(valeur)
  const motif = /\bpattern\b/i.test(valeur)
  if (peinture && motif) return 'motif+peinture'
  if (peinture) return 'peinture'
  if (motif) return 'motif'
  if (/no change possible/i.test(valeur)) return 'aucune'
  return null
}

const charger = async () =>
  dossierLocal
    ? fs.readFileSync(path.join(dossierLocal, PAGE), 'utf8')
    : fetch(SOURCE, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text())

const html = await charger()

/** Les lignes du tableau : Picture | Name | Description | Locations | Flags | Colour. */
const lignes = []
for (const [, corps] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
  const cellules = [...corps.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => texte(m[1]))
  if (cellules.length !== 6) continue
  const nom = cellules[1]
  if (!nom || nom === 'Name') continue
  const etat = lireColonne(cellules[5])
  if (etat) lignes.push({ nom, etat })
}
if (!lignes.length) throw new Error(`aucune ligne lue dans ${PAGE}`)

// Le complément compte autant que l'extraction : ses meubles ont une fiche, donc un bloc
// « Variantes de couleurs » à remplir. Sans lui, les 19 rattrapés resteraient « rien de
// publié » alors que Serebii, justement, publie leur colonne.
const nôtres = [
  ...JSON.parse(fs.readFileSync(OBJETS, 'utf8')),
  ...JSON.parse(fs.readFileSync(COMPLEMENT, 'utf8')).objets,
]
const parNomNormalise = new Map(nôtres.map((o) => [o.en.toLowerCase(), o.en]))

const retenus = {}
const horsIndex = []
for (const { nom, etat } of lignes) {
  const chezNous = parNomNormalise.get(nom.toLowerCase())
  if (chezNous) retenus[chezNous] = etat
  else horsIndex.push(nom)
}

const compte = {}
for (const etat of Object.values(retenus)) compte[etat] = (compte[etat] || 0) + 1

console.log(`lignes lues : ${lignes.length}`)
console.log(`objets appariés : ${Object.keys(retenus).length}`)
console.log('répartition :', JSON.stringify(compte))
// Attendu : les meubles de Serebii qui ne cochent aucune préférence ne sont pas dans notre
// index, qui se construit à partir de preferences.json. Ils n'ont donc pas de fiche.
if (horsIndex.length)
  console.log(`hors de notre index (${horsIndex.length}) :\n  ` + horsIndex.join('\n  '))

const suivant = {
  source: SOURCE,
  objets: Object.fromEntries(Object.keys(retenus).sort().map((n) => [n, retenus[n]])),
}

if (!ecrire) console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
else {
  fs.writeFileSync(FICHIER, JSON.stringify(suivant, null, 1))
  console.log('\nsrc/data/personnalisation.json mis à jour.')
}
