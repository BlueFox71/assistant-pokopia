// Produit src/data/recettes.json et les images de src/data/sprites/recettes/.
//
//   node scripts/importer-pokekalos-recettes.mjs                      télécharge, compare, n'écrit rien
//   node scripts/importer-pokekalos-recettes.mjs --ecrire             écrit le JSON et télécharge les images
//   node scripts/importer-pokekalos-recettes.mjs --local <plats> <objets>   part des deux pages déjà téléchargées
//
// La page « Liste des plats et leurs effets » de Pokékalos range les 35 plats en cinq
// tableaux, un par ustensile : image, nom, saveur, ingrédients (`1x Feuille<br>1x Autre`),
// et parfois `Commis : <spécialité>` en dernière ligne. Les images des INGRÉDIENTS n'y sont
// pas : on les prend sur la liste des objets du même site, d'après leur nom français.
//
// Ce que la page dit en prose — l'ustensile, la capacité que la famille améliore, ce qu'il
// faut savoir pour cuisiner — est repris à la main dans FAMILLES, résumé : le texte bouge
// moins souvent que les tableaux, et un résumé se lit mieux dans un bandeau.
//
// Les images arrivent en PNG ; comme les autres sprites, elles se gardent en webp de 72 px.
// Le script ne télécharge que celles qui n'existent encore sous aucune des deux formes, et
// dit combien restent à convertir.
import fs from 'node:fs'

const PAGE = 'https://www.pokekalos.fr/jeux/switch2/pokopia/articles-liste-des-plats-et-leurs-effets-6436.html'
const PAGE_OBJETS = 'https://www.pokekalos.fr/jeux/switch2/pokopia/objets.html'
const FICHIER = new URL('../src/data/recettes.json', import.meta.url)
const DOSSIER_SPRITES = new URL('../src/data/sprites/recettes/', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const locaux = args.includes('--local') ? args.slice(args.indexOf('--local') + 1, args.indexOf('--local') + 3) : null

/** Les cinq familles, dans l'ordre de la page ; `titre` est celui de son tableau. */
const FAMILLES = [
  {
    cle: 'salades',
    titre: 'Recettes de salades',
    nom: 'Salades',
    ustensile: 'Planche à découper',
    capacite: 'Feuillage',
    effet: 'Fait pousser de la mousse sur les rochers et des lentilles d’eau sur l’eau. Bouton maintenu : cinq herbes en croix, ou du lierre sur le bloc d’en face.',
    remarque: null,
  },
  {
    cle: 'soupes',
    titre: 'Recettes de soupes',
    nom: 'Soupes',
    ustensile: 'Marmite',
    capacite: 'Pistolet à O',
    effet: 'Bouton maintenu : arrose une zone plus large.',
    remarque: 'Sur une cuisinière ou un feu de camp. Une marmite se trouve près du musée.',
  },
  {
    cle: 'pains',
    titre: 'Recettes de pains',
    nom: 'Pains',
    ustensile: 'Four à pain',
    capacite: 'Coupe',
    effet: 'Coupe les objets métalliques. Bouton maintenu : Coupe-Vent, une ligne de coupe droit devant.',
    remarque: 'Allumé par un Pokémon de type Feu.',
  },
  {
    cle: 'steaks',
    titre: 'Recettes de steaks hachés',
    nom: 'Steaks hachés',
    ustensile: 'Poêle',
    capacite: 'Éclate-Roc',
    effet: 'Casse les blocs durs, et les blocs simples en moins de coups. Les steaks garni, aux pommes de terre et très épicé en retirent bien davantage.',
    remarque: 'Sur une cuisinière ou un feu de camp.',
  },
  {
    cle: 'smoothies',
    titre: 'Recettes de smoothies',
    nom: 'Smoothies',
    ustensile: 'Blender',
    capacite: 'Surf',
    effet: 'Nage plus vite et plus facilement sous l’eau, et casse une large zone de blocs d’un coup.',
    remarque: 'Arrive avec le DLC Fonds Bulleux.',
  },
]

/**
 * « Âcre », « Sucré » ou « Sucrée » -> la clé de goût de l'app (cf. GOUTS dans data/index.js).
 * La page accorde la saveur tantôt au masculin, tantôt au féminin : on compare sans accents
 * ni « e » final.
 */
const GOUTS = { sucr: 'sweet', epic: 'spicy', acid: 'sour', amer: 'bitter', acr: 'dry' }

/**
 * Ingrédients dont le nom diffère entre la recette et la liste des objets. « Pain »,
 * « Soupe », « Salade » et « Steak haché » ne sont pas des objets : n'importe quel plat de
 * la famille convient — on montre l'image de sa version simple.
 */
const ALIAS = {
  carotte: 'carotte mûre',
  'champignon des grottes': 'champignons des grottes',
  pain: 'pain simple',
  soupe: 'soupe simple',
  salade: 'salade simple',
  'steak haché': 'steak haché simple',
}
const FAMILLE_ENTIERE = new Set(['pain', 'soupe', 'salade', 'steak haché'])

const decoder = (s) =>
  s
    .replace(/&#0?39;|&#x27;|&apos;|&rsquo;|’/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
const texte = (s) => decoder(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const cle = (s) => texte(s).toLowerCase()
const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
/** `.../objets/950.png` -> `950` */
const idImage = (url) => url.match(/objets\/(\d+)\.png/)?.[1] || null

const charger = (url, i) =>
  locaux
    ? fs.readFileSync(locaux[i], 'utf8')
    : fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text())

const html = await charger(PAGE, 0)
const htmlObjets = await charger(PAGE_OBJETS, 1)

// Nom français (minuscules) -> numéro d'image, d'après la liste des objets.
const imageObjet = new Map()
for (const [, fr, src] of htmlObjets.matchAll(/data-name-fr="([^"]*)"[^>]*>[\s\S]*?data-src="([^"]+)"/g)) {
  const id = idImage(src)
  if (id && !imageObjet.has(cle(fr))) imageObjet.set(cle(fr), id)
}

// Les spécialités connues de l'app, pour écrire le commis exactement comme elles.
const specialites = new Map()
for (const p of JSON.parse(fs.readFileSync(new URL('../src/data/pokemon.json', import.meta.url), 'utf8')))
  for (const s of p.specialites || []) specialites.set(s.toLowerCase(), s)

const avertissements = []

function lireIngredients(cellule) {
  const lignes = cellule.split(/<br\s*\/?>/i).map(texte).filter(Boolean)
  const ingredients = []
  let commis = null
  for (const ligne of lignes) {
    const c = ligne.match(/^Commis\s*:\s*(.+)$/i)
    if (c) {
      commis = specialites.get(c[1].toLowerCase()) || c[1]
      if (!specialites.has(c[1].toLowerCase())) avertissements.push(`spécialité inconnue : ${c[1]}`)
      continue
    }
    const m = ligne.match(/^(\d+)\s*x\s*(.+)$/i)
    if (!m) {
      avertissements.push(`ligne d'ingrédient illisible : « ${ligne} »`)
      continue
    }
    const nom = m[2].trim()
    const n = nom.toLowerCase()
    if (n === 'autre') {
      ingredients.push({ nom: 'Au choix', quantite: Number(m[1]), image: null, libre: true })
      continue
    }
    const image = imageObjet.get(ALIAS[n] || n) || null
    if (!image) avertissements.push(`pas d'image pour l'ingrédient « ${nom} »`)
    ingredients.push({ nom, quantite: Number(m[1]), image, ...(FAMILLE_ENTIERE.has(n) && { famille: true }) })
  }
  return { ingredients, commis }
}

const familles = FAMILLES.map(({ titre, ...famille }) => {
  const debut = html.indexOf(`<h3>${titre}</h3>`)
  if (debut < 0) throw new Error(`section introuvable : ${titre}`)
  const fin = html.indexOf('</table>', debut)
  const tableau = html.slice(debut, fin)
  const plats = []
  for (const [, ligne] of tableau.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cellules = [...ligne.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    if (cellules.length !== 4) continue
    const image = idImage(cellules[0])
    const nom = texte(cellules[1])
    const saveur = sansAccent(texte(cellules[2]).toLowerCase()).replace(/e+$/, '')
    const gout = saveur === '-' ? null : GOUTS[saveur]
    if (saveur !== '-' && !gout) avertissements.push(`saveur inconnue pour ${nom} : ${texte(cellules[2])}`)
    plats.push({ nom, gout, image, ...lireIngredients(cellules[3]) })
  }
  return { ...famille, plats }
})

// L'ingrédient clé : le premier de chaque recette de la famille, le même partout.
for (const f of familles) {
  const premiers = new Set(f.plats.map((p) => p.ingredients[0]?.nom))
  if (premiers.size !== 1) avertissements.push(`${f.nom} : l'ingrédient de tête varie (${[...premiers].join(', ')})`)
  f.ingredientCle = [...premiers][0]
}

const nbPlats = familles.reduce((n, f) => n + f.plats.length, 0)
console.log(`plats lus : ${nbPlats}`)
for (const f of familles)
  console.log(`  ${f.nom} (${f.plats.length}) — clé : ${f.ingredientCle} — ${f.plats.map((p) => p.nom).join(', ')}`)
if (avertissements.length) console.log('\nà vérifier :\n  ' + avertissements.join('\n  '))

const images = new Set()
for (const f of familles)
  for (const p of f.plats) {
    if (p.image) images.add(p.image)
    for (const i of p.ingredients) if (i.image) images.add(i.image)
  }

if (!ecrire) {
  console.log(`\n${images.size} images en jeu. Rien écrit. Relancer avec --ecrire pour appliquer.`)
  process.exit(0)
}

fs.mkdirSync(DOSSIER_SPRITES, { recursive: true })
let telecharges = 0
for (const id of images) {
  if (fs.existsSync(new URL(`${id}.webp`, DOSSIER_SPRITES))) continue
  const cible = new URL(`${id}.png`, DOSSIER_SPRITES)
  if (fs.existsSync(cible)) continue
  const r = await fetch(`https://www.media.pokekalos.fr/img/jeux/pokopia/objets/${id}.png`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  })
  if (!r.ok) {
    console.log(`image manquante : ${id}.png (${r.status})`)
    continue
  }
  fs.writeFileSync(cible, Buffer.from(await r.arrayBuffer()))
  telecharges += 1
}

const sortie = {
  _lisezMoi:
    "Les plats du jeu, d'après la liste des plats de Pokékalos. `image` est le numéro de l'image Pokékalos (src/data/sprites/recettes/<image>.webp) ; un ingrédient `libre` se choisit à volonté, un ingrédient `famille` accepte n'importe quel plat de cette famille. `commis` est la spécialité du Pokémon qu'il faut en cuisine. Produit par scripts/importer-pokekalos-recettes.mjs — ne pas éditer à la main.",
  _source: PAGE,
  familles,
}
fs.writeFileSync(FICHIER, JSON.stringify(sortie, null, 1) + '\n')
const aConvertir = fs.readdirSync(DOSSIER_SPRITES).filter((f) => f.endsWith('.png')).length
console.log(`\nécrit : ${nbPlats} plats dans src/data/recettes.json, ${telecharges} image(s) téléchargée(s)`)
if (aConvertir) console.log(`${aConvertir} PNG à convertir en webp 72 px dans src/data/sprites/recettes/`)
