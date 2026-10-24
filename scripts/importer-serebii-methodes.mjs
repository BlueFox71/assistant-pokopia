// Produit src/data/methodes.json et les vignettes de src/data/sprites/methodes/.
//
//   node scripts/importer-serebii-methodes.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-serebii-methodes.mjs --ecrire           écrit le JSON et les images
//   node scripts/importer-serebii-methodes.mjs --local <dossier>  part de pages déjà téléchargées
//                                                                 (crafting.shtml, objets.html)
//
// Les méthodes de fabrication du jeu, pour la page Méthodes : le joueur y coche celles qu'il
// connaît, et voit pour les autres où les obtenir.
//
// ── Les sources ─────────────────────────────────────────────────────────────────────────
//
//   Serebii   pokemonpokopia/crafting.shtml — une section par famille (Furniture, Misc.,
//             Outdoor, Utilities, Buildings, Blocks, Other), une ligne par méthode : image,
//             nom, « Locations » (où l'obtenir) et ingrédients. La colonne Locations est
//             rangée par scripts/lib/methodes.mjs ; ce qui n'y est pas reconnu est imprimé.
//   Pokékalos jeux/switch2/pokopia/objets.html — le nom français relevé en jeu, comme pour
//             le catalogue (cf. importer-pokekalos-noms.mjs). Le nom du catalogue prime quand
//             la méthode y a son objet ; sans nom nulle part, l'anglais reste.
//
// ── Les vignettes ───────────────────────────────────────────────────────────────────────
//
// Une méthode dont l'objet est au catalogue reprend son sprite. Les autres — blocs, murs,
// sols, constructions, à peu près la moitié — prennent l'image de Serebii : elle arrive en
// PNG, se garde en webp de 72 px comme les autres sprites, et le script ne télécharge que
// celles qui n'existent encore sous aucune des deux formes.
import fs from 'node:fs'
import path from 'node:path'
import { cleNom, decoderEntites, garderNoms, sources } from './lib/methodes.mjs'

const SEREBII = 'https://www.serebii.net/pokemonpokopia/crafting.shtml'
const IMAGES = 'https://www.serebii.net/pokemonpokopia/items/'
const KALOS = 'https://www.pokekalos.fr/jeux/switch2/pokopia/objets.html'
const FICHIER = new URL('../src/data/methodes.json', import.meta.url)
const OBJETS = new URL('../src/data/objets.json', import.meta.url)
const COMPLEMENT = new URL('../src/data/objets-complement.json', import.meta.url)
const DOSSIER_SPRITES = new URL('../src/data/sprites/methodes/', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const dossierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

/** Les familles dans l'ordre de Serebii : ancre de section -> clé. */
const FAMILLES = {
  furniture: 'furniture',
  'misc.': 'misc',
  outdoor: 'outdoor',
  utilities: 'utilities',
  buildings: 'buildings',
  blocks: 'blocks',
  other: 'other',
}
const ORDRE = Object.values(FAMILLES)

async function charger(url, local) {
  if (dossierLocal) return fs.readFileSync(path.join(dossierLocal, local), 'utf8')
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`${url} : HTTP ${r.status}`)
  return r.text()
}

const texte = (html) => decoderEntites(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

/* ---------- le catalogue ---------- */

const catalogue = [
  ...JSON.parse(fs.readFileSync(OBJETS, 'utf8')),
  ...JSON.parse(fs.readFileSync(COMPLEMENT, 'utf8')).objets,
]
const objetParCle = new Map()
for (const o of catalogue) if (!objetParCle.has(cleNom(o.en))) objetParCle.set(cleNom(o.en), o)

/* ---------- Pokékalos ---------- */

const kalos = await charger(KALOS, 'objets.html')
const frParCle = new Map()
// Même lecture que importer-pokekalos-noms.mjs : le libellé affiché garde la casse.
for (const m of kalos.matchAll(/data-name-en="([^"]*)"[\s\S]{0,700}?habitat-area-name">([^<]+)</gi)) {
  const cle = cleNom(m[1])
  const fr = decoderEntites(m[2]).replace(/\s*♪\s*$/, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
  if (cle && !frParCle.has(cle)) frParCle.set(cle, fr)
}
if (!frParCle.size) throw new Error('Pokékalos : aucune entrée lue, le listing a changé de forme')

/** Pokékalos donne le même nom au sol et au mur : le suffixe les distingue, comme au catalogue. */
const suffixeMur = (en, fr) => (/\(wallpaper\)$/i.test(en) && !/papier peint/i.test(fr) ? `${fr} (papier peint)` : fr)

/* ---------- Serebii ---------- */

const page = await charger(SEREBII, 'crafting.shtml')
const sections = page.split(/<h2><a name="/).slice(1)
if (sections.length !== ORDRE.length) throw new Error(`crafting.shtml : ${sections.length} sections au lieu de ${ORDRE.length}`)

const parNom = new Map()
const inconnues = new Map()
for (const section of sections) {
  const ancre = section.slice(0, section.indexOf('"'))
  const famille = FAMILLES[ancre]
  if (!famille) throw new Error(`famille inconnue : ${ancre}`)

  // Une ligne : image, nom, Locations, puis la table des ingrédients jusqu'à la ligne suivante.
  const re = /<td class="cen"><a href="items\/([^"]+)\.shtml"><img[^>]*><\/a><\/td><td class="cen"><a href="items\/[^"]+">([^<]+)<\/u><\/a><\/td>\s*<td class="fooinfo">([\s\S]*?)<\/td>([\s\S]*?)(?=<td class="cen"><a href="items\/|<\/table>\s*<\/td>\s*<\/tr>\s*<\/table>|$)/g
  for (const [, slug, nomBrut, locations, reste] of section.matchAll(re)) {
    const en = texte(nomBrut)
    // Serebii a laissé une ligne inachevée — « C », sans image ni ingrédient : on la saute.
    if (en.length < 2) {
      console.log(`ligne écartée, nom inachevé : « ${en} »`)
      continue
    }
    const lignes = locations.split(/<br\s*\/?>/i).map(texte).filter(Boolean)
    const src = lignes.flatMap(sources)
    for (const s of src) if (s.type === 'autre') inconnues.set(s.texte, (inconnues.get(s.texte) || 0) + 1)
    const ingredients = [...reste.matchAll(/<u>([^<]+)<\/u><\/a>\s*\*\s*(\d+)/g)].map(([, n, q]) => [texte(n), Number(q)])

    const deja = parNom.get(cleNom(en))
    if (deja) {
      // Une même méthode listée deux fois : ses sources se réunissent.
      for (const s of src) if (!deja.sources.some((d) => d.texte === s.texte)) deja.sources.push(s)
      continue
    }
    const objet = objetParCle.get(cleNom(en)) || null
    const fr = objet?.fr || (frParCle.has(cleNom(en)) ? suffixeMur(en, frParCle.get(cleNom(en))) : null)
    parNom.set(cleNom(en), {
      en,
      fr: fr || en,
      famille,
      objet: objet ? objet.en : null,
      sprite: objet ? objet.sprite : slug,
      sources: src,
      ingredients,
      _traduite: Boolean(fr),
    })
  }
}

const methodes = [...parNom.values()].sort(
  (a, b) => ORDRE.indexOf(a.famille) - ORDRE.indexOf(b.famille) || a.fr.localeCompare(b.fr, 'fr'),
)

/* ---------- le bilan ---------- */

console.log(`méthodes : ${methodes.length}`)
for (const f of ORDRE) {
  const de = methodes.filter((m) => m.famille === f)
  console.log(`  ${f.padEnd(10)} ${String(de.length).padStart(4)}, dont ${de.filter((m) => m.objet).length} au catalogue`)
}
const sansFr = methodes.filter((m) => !m._traduite)
console.log(`\nsans nom français (${sansFr.length}) : ${sansFr.map((m) => m.en).join(', ') || '—'}`)
console.log(`\nsources non reconnues, rangées dans « autre » (${inconnues.size}) :`)
for (const [t, n] of [...inconnues].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${t}`)

// Une boutique sans ville ou sans niveau ne se range sous aucun filtre de ville, ou s'y
// range en dernier : à relire, comme les « autre ».
const boutiquesFloues = new Set(
  methodes.flatMap((m) => m.sources.filter((s) => s.type === 'boutique' && (!s.zone || !s.niveau)).map((s) => s.texte)),
)
console.log(`\nboutiques sans ville ou sans niveau (${boutiquesFloues.size}) : ${[...boutiquesFloues].join(' | ') || '—'}`)

// Les noms anglais sont les clés des coches du joueur : une correction de casse chez
// Serebii garde l'ancien nom (cf. garderNoms).
const avant = fs.existsSync(FICHIER) ? JSON.parse(fs.readFileSync(FICHIER, 'utf8')).methodes : []
const suivi = garderNoms(methodes, avant)
methodes.splice(0, methodes.length, ...suivi.methodes)
if (avant.length) {
  console.log(`\nnouvelles (${suivi.nouvelles.length}) : ${suivi.nouvelles.join(', ') || '—'}`)
  console.log(`disparues (${suivi.disparues.length}) : ${suivi.disparues.join(', ') || '—'}`)
  console.log(
    `orthographe changée chez Serebii, ancien nom gardé (${suivi.renommees.length}) : ${suivi.renommees.map(([a, b]) => `${a} → ${b}`).join(', ') || '—'}`,
  )
}

if (!ecrire) {
  console.log('\n(rien d’écrit — relancer avec --ecrire)')
  process.exit(0)
}

fs.mkdirSync(DOSSIER_SPRITES, { recursive: true })
let telecharges = 0
for (const { objet, sprite } of methodes) {
  if (objet) continue
  if (fs.existsSync(new URL(`${sprite}.webp`, DOSSIER_SPRITES))) continue
  const cible = new URL(`${sprite}.png`, DOSSIER_SPRITES)
  if (fs.existsSync(cible)) continue
  const r = await fetch(IMAGES + sprite + '.png', { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!r.ok) {
    console.log(`image manquante : ${sprite}.png (${r.status})`)
    continue
  }
  fs.writeFileSync(cible, Buffer.from(await r.arrayBuffer()))
  telecharges += 1
}

const sortie = {
  _lisezMoi:
    "Les méthodes de fabrication du jeu, d'après crafting.shtml de Serebii, noms français de Pokékalos. `objet` est le nom anglais de l'objet au catalogue, ou null ; `sources` dit où obtenir la méthode, `texte` en garde la formulation d'origine. Produit par scripts/importer-serebii-methodes.mjs — ne pas éditer à la main.",
  _source: SEREBII,
  methodes: methodes.map(({ _traduite, ...m }) => m),
}
fs.writeFileSync(FICHIER, JSON.stringify(sortie, null, 1) + '\n')
const aConvertir = fs.readdirSync(DOSSIER_SPRITES).filter((f) => f.endsWith('.png')).length
console.log(`\nécrit : ${methodes.length} méthodes dans src/data/methodes.json, ${telecharges} image(s) téléchargée(s)`)
if (aConvertir) console.log(`${aConvertir} PNG à convertir en webp 72 px dans src/data/sprites/methodes/`)
