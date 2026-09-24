// Complète src/data/pokemon.json avec le goût préféré de chaque Pokémon.
//
//   node scripts/importer-gouts.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-gouts.mjs --ecrire           applique à src/data/pokemon.json
//   node scripts/importer-gouts.mjs --local <dossier>  part de pages déjà téléchargées
//
// Le goût préféré — sucré, épicé, acide, amer ou sec — décide des aliments qu'un Pokémon
// veut recevoir : lui offrir ce qu'il aime fait monter son amitié et son niveau de confort
// bien plus vite. Le jeu l'expose sur la fiche du Pokémon, au milieu de ses préférences.
//
// ── Pourquoi pas Serebii ────────────────────────────────────────────────────────────────
//
// Serebii, qui fait autorité ailleurs dans ce dossier, ne publie PAS cette donnée : sa page
// flavors.shtml ne liste que les aliments par goût, et sa page favorites.shtml — d'où
// viennent nos 43 préférences — ne porte aucun Pokémon (« very work in progress », tout en
// TBD). Les deux sources ci-dessous sont donc des wikis de joueurs, ce qui demande de s'en
// méfier : c'est pourquoi le script les croise systématiquement et imprime les désaccords.
// Au dernier relevé, 289 Pokémon étaient couverts par les deux, sans une seule divergence.
//
//   PRIMAIRE   pokopiaguide.com  — /pokedex, /pokedex/dlc, /pokedex/<slug>
//              Le plus complet : le Pokédex de base, les 52 du Bubbly Basin et les fiches
//              individuelles des Pokémon d'événement. Les données sont embarquées dans le
//              flux RSC de Next.js, d'où l'extraction ci-dessous.
//   COMPLÉMENT wikipokopia.com/favorites
//              Range les Pokémon par goût. Sert de contre-épreuve, et rattrape la quinzaine
//              d'entrées que le premier laisse sans goût (Sancoki, Tatsugiri, Rotom…).
//
// ── Ce qui reste sans goût ──────────────────────────────────────────────────────────────
//
// Six entrées ne sont données par aucune des deux sources : Métamorph, Jirachi, Ténéfix,
// Mosslax, Peakychu et le Professeur Saquedeneu. Le champ est alors absent, et l'affichage
// saute la mention — comme il le fait déjà pour les types et les spécialités manquants.
import fs from 'node:fs'
import path from 'node:path'

const FICHIER = new URL('../src/data/pokemon.json', import.meta.url)

const GUIDE = 'https://pokopiaguide.com'
const WIKI = 'https://wikipokopia.com/favorites'

/** Les cinq goûts du jeu, tels que les deux sources les nomment. */
const GOUTS = ['sweet', 'spicy', 'sour', 'bitter', 'dry']

/**
 * Les formes n'ont pas de fiche à elles : elles héritent du goût de leur espèce. Sancoki
 * Mer Est aime ce qu'aime Sancoki ; le Rotom de Pokopia est un Rotom. À gauche nos noms,
 * à droite ceux des sources.
 */
const FORMES = {
  'Shellos East Sea': 'Shellos',
  'Gastrodon East Sea': 'Gastrodon',
  'Tatsugiri Curly Form': 'Tatsugiri',
  'Tatsugiri Droopy Form': 'Tatsugiri',
  'Tatsugiri Stretchy Form': 'Tatsugiri',
  'Toxtricity Amped Form': 'Toxtricity',
  'Toxtricity Low Key Form': 'Toxtricity',
  'Stereo Rotom': 'Rotom',
  'Paldean Wooper': 'Wooper',
  'Frillish Female Form': 'Frillish (Female)',
  'Frillish Male Form': 'Frillish (Male)',
  'Jellicent Female Form': 'Jellicent (Female)',
  'Jellicent Male Form': 'Jellicent (Male)',
}

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const dossierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

/* ---------- téléchargement ---------- */

/** `null` plutôt qu'une exception sur un 404 : les fiches individuelles sont tentées à l'aveugle. */
async function charger(url, fichierLocal) {
  if (dossierLocal) {
    const chemin = path.join(dossierLocal, fichierLocal)
    return fs.existsSync(chemin) ? fs.readFileSync(chemin, 'utf8') : null
  }
  const reponse = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })
  return reponse.ok ? await reponse.text() : null
}

/* ---------- pokopiaguide : le flux RSC de Next.js ---------- */

/**
 * Next.js sème ses données dans des `self.__next_f.push([1,"…"])`, une tranche par morceau
 * de page. On les recolle avant de chercher quoi que ce soit : un tableau de 300 Pokémon
 * est découpé en plusieurs de ces appels.
 */
function fluxRsc(html) {
  let flux = ''
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g))
    flux += JSON.parse('"' + m[1] + '"')
  return flux
}

/** Le tableau JSON qui suit `"<cle>":`, découpé sur ses crochets équilibrés. */
function tableau(flux, cle) {
  const debut = flux.indexOf(`"${cle}":[`)
  if (debut < 0) return []
  const brut = flux.slice(debut)
  const ouvrant = brut.indexOf('[')
  let profondeur = 0
  let dansChaine = false
  for (let i = ouvrant; i < brut.length; i++) {
    const c = brut[i]
    if (dansChaine) {
      if (c === '\\') i += 1
      else if (c === '"') dansChaine = false
      continue
    }
    if (c === '"') dansChaine = true
    else if (c === '[' || c === '{') profondeur += 1
    else if (c === ']' || c === '}') {
      profondeur -= 1
      if (!profondeur) return JSON.parse(brut.slice(ouvrant, i + 1))
    }
  }
  return []
}

/**
 * Le goût se trouve parmi les « favorites » : les 43 préférences et les cinq goûts y sont
 * mêlés, ces derniers seuls suffixés de « flavors ».
 */
const goutDesFavoris = (favoris = []) =>
  (favoris.find((f) => f.endsWith(' flavors')) || '').split(' ')[0] || null

/** `Frillish (Female)` -> `frillish-female`, le slug des fiches du guide. */
const slug = (nom) =>
  nom
    .toLowerCase()
    .replace(/['’().]/g, '')
    .trim()
    .replace(/\s+/g, '-')

async function lireGuide(nomsAChercher) {
  const trouves = new Map()

  for (const [page, fichier, cle] of [
    ['/pokedex', 'pokedex.html', 'basePokemon'],
    ['/pokedex/dlc', 'pokedex-dlc.html', 'pokemon'],
  ]) {
    const html = await charger(GUIDE + page, fichier)
    if (!html) throw new Error(`page ${page} illisible`)
    const entrees = tableau(fluxRsc(html), cle)
    if (!entrees.length) throw new Error(`aucune entrée lue dans ${page} (structure changée ?)`)
    let avecGout = 0
    for (const p of entrees) {
      const gout = goutDesFavoris(p.pokopia?.favorites)
      if (gout) {
        trouves.set(p.name, gout)
        avecGout += 1
      }
    }
    console.log(`${page.padEnd(14)} : ${entrees.length} entrées, ${avecGout} avec un goût`)
  }

  // Les Pokémon d'événement n'apparaissent dans aucune des deux listes : ils n'ont qu'une
  // fiche. On ne tente que ce qui manque encore, et un 404 est une réponse comme une autre.
  const restants = nomsAChercher.filter((n) => !trouves.has(n))
  const fiches = []
  for (const nom of restants) {
    const html = await charger(`${GUIDE}/pokedex/${slug(nom)}`, `pokedex-${slug(nom)}.html`)
    if (!html) continue
    const gout = GOUTS.find((g) => new RegExp(`>${g} Flavors</span>`, 'i').test(html))
    if (gout) {
      trouves.set(nom, gout)
      fiches.push(`${nom} (${gout})`)
    }
  }
  console.log(
    `fiches          : ${restants.length} tentées, ${fiches.length} avec un goût` +
      (fiches.length ? ` — ${fiches.join(', ')}` : ''),
  )

  return trouves
}

/* ---------- wikipokopia : une section par goût ---------- */

async function lireWiki() {
  const html = await charger(WIKI, 'favorites.html')
  if (!html) throw new Error('page des favoris du wiki illisible')

  const trouves = new Map()
  for (const gout of GOUTS) {
    const debut = html.indexOf(`id="${gout}-flavors"`)
    if (debut < 0) {
      console.log(`wiki            : section ${gout} introuvable`)
      continue
    }
    const section = html.slice(debut, html.indexOf('</section>', debut))
    const noms = [...section.matchAll(/class="font-display[^"]*truncate">([^<]+)<\/p>/g)].map((m) =>
      m[1].replace(/&#x27;/g, "'").replace(/&amp;/g, '&'),
    )
    for (const nom of noms) trouves.set(nom, gout)
  }
  console.log(`wiki            : ${trouves.size} Pokémon rangés par goût`)
  return trouves
}

/* ---------- croisement ---------- */

const nôtres = JSON.parse(fs.readFileSync(FICHIER, 'utf8'))
/** Ce qu'on demande aux sources : nos noms, ou celui de l'espèce pour les formes. */
const cherches = [...new Set(nôtres.map((p) => FORMES[p.en] || p.en))]

const guide = await lireGuide(cherches)
const wiki = await lireWiki()

const desaccords = []
for (const [nom, gout] of guide) {
  const autre = wiki.get(nom)
  if (autre && autre !== gout) desaccords.push(`${nom} : guide=${gout}, wiki=${autre}`)
}
const communs = [...guide.keys()].filter((n) => wiki.has(n)).length
console.log(`\ncroisement      : ${communs} Pokémon dans les deux sources, ${desaccords.length} désaccords`)
if (desaccords.length) console.log('  ' + desaccords.join('\n  '))

const rattrapes = []
const sansGout = []
const changes = []

const suivant = nôtres.map((p) => {
  const cherche = FORMES[p.en] || p.en
  const gout = guide.get(cherche) || wiki.get(cherche) || null
  if (!gout) {
    sansGout.push(`${p.fr} (${p.en})`)
    const { gout: _, ...sansChamp } = p
    return sansChamp
  }
  if (!guide.has(cherche)) rattrapes.push(`${p.fr} ← wiki`)
  if (p.gout && p.gout !== gout) changes.push(`${p.fr} : ${p.gout} → ${gout}`)
  return { ...p, gout }
})

const repartition = suivant.reduce(
  (acc, p) => (p.gout ? { ...acc, [p.gout]: (acc[p.gout] || 0) + 1 } : acc),
  {},
)
console.log(`\ncouverture      : ${suivant.length - sansGout.length}/${suivant.length}`)
console.log('répartition     :', JSON.stringify(repartition))
if (rattrapes.length) console.log(`rattrapés par le wiki (${rattrapes.length}) :\n  ` + rattrapes.join('\n  '))
if (changes.length) console.log(`goûts changés (${changes.length}) :\n  ` + changes.join('\n  '))
if (sansGout.length) console.log(`sans goût (${sansGout.length}) :\n  ` + sansGout.join('\n  '))

if (!ecrire) console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
else {
  fs.writeFileSync(FICHIER, JSON.stringify(suivant, null, 1))
  console.log('\nsrc/data/pokemon.json mis à jour.')
}
