// Produit src/data/aliments.json et les vignettes de src/data/sprites/aliments/.
//
//   node scripts/importer-aliments.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-aliments.mjs --ecrire           écrit le JSON et les images
//   node scripts/importer-aliments.mjs --local <fichier>  part d'un flavors.shtml déjà téléchargé
//
// Le goût préféré d'un Pokémon (cf. importer-gouts.mjs) ne sert à rien si l'on ne sait pas
// quoi lui donner : c'est ce que range la page flavors.shtml de Serebii — une section par
// goût, une ligne par aliment, avec son image. La section « No Flavor » (baies Mepo et
// Prine, plats « simples »…) est écartée : aucun Pokémon n'y est sensible.
//
// Les images arrivent en PNG de 160 px — 1,6 Mo pour les 48. Comme les sprites d'objets,
// on les garde en webp de 72 px : le script ne télécharge que celles qui n'existent encore
// sous aucune des deux formes, et dit lesquelles restent à convertir.
//
// ── Les noms français ───────────────────────────────────────────────────────────────────
//
// Serebii ne publie que l'anglais. Les baies, le Super Bonbon et le Lait Meumeu gardent
// leurs noms officiels de la série ; le reste est une TRADUCTION MAISON, en attendant un
// relevé en jeu comme celui des objets. Un nom absent de la table ci-dessous est signalé
// à l'exécution et retombe sur l'anglais.
import fs from 'node:fs'
import path from 'node:path'

const PAGE = 'https://www.serebii.net/pokemonpokopia/flavors.shtml'
const IMAGES = 'https://www.serebii.net/pokemonpokopia/items/'
const FICHIER = new URL('../src/data/aliments.json', import.meta.url)
const DOSSIER_SPRITES = new URL('../src/data/sprites/aliments/', import.meta.url)

const GOUTS = ['sweet', 'spicy', 'sour', 'bitter', 'dry']

const FR = {
  // amer
  'Rawst Berry': 'Baie Fraive',
  Potato: 'Pomme de terre',
  Seaweed: 'Algue',
  'Seaweed salad': 'Salade d’algues',
  'Seaweed soup': 'Soupe d’algues',
  'Recycled bread': 'Pain recyclé',
  'Bitter hamburger steak': 'Steak haché amer',
  'Sea grapes': 'Raisins de mer',
  'Popping salad': 'Salade pétillante',
  'Popping soup': 'Soupe pétillante',
  'Coffee parfait smoothie': 'Smoothie parfait café',
  // sec
  'Chesto Berry': 'Baie Maron',
  Wheat: 'Blé',
  'Cave mushrooms': 'Champignons des cavernes',
  'Crushed-berry salad': 'Salade de baies pilées',
  'Mushroom soup': 'Soupe aux champignons',
  'Mushroom hamburger steak': 'Steak haché aux champignons',
  'Roserade Tea': 'Thé Roserade',
  'Sea grape smoothie': 'Smoothie aux raisins de mer',
  // acide
  'Aspear Berry': 'Baie Willia',
  Tomato: 'Tomate',
  'Shredded salad': 'Salade émincée',
  'Flavorful soup': 'Soupe savoureuse',
  'Leppa bread': 'Pain Mepo',
  'Tomato hamburger steak': 'Steak haché à la tomate',
  'Soda Pop': 'Soda Cool',
  'Refreshing soda smoothie': 'Smoothie soda rafraîchissant',
  // épicé
  'Fresh carrot': 'Carotte fraîche',
  'Crouton salad': 'Salade aux croûtons',
  'Electrifying soup': 'Soupe électrisante',
  'Healthy soup': 'Soupe santé',
  'Carrot bread': 'Pain à la carotte',
  'Bread bowl': 'Pain-bol',
  'Chili sauce': 'Sauce pimentée',
  'Explosive hamburger steak': 'Steak haché explosif',
  'Red-hot smoothie': 'Smoothie brûlant',
  // sucré
  'Pecha Berry': 'Baie Pêcha',
  Bean: 'Haricot',
  'Leppa salad': 'Salade Mepo',
  'Fluffy bread': 'Pain moelleux',
  'Potato hamburger steak': 'Steak haché aux pommes de terre',
  'Moomoo Milk Coffee': 'Café au Lait Meumeu',
  'Common candy': 'Bonbon ordinaire',
  'Rare Candy': 'Super Bonbon',
  'Watermelon slice': 'Tranche de pastèque',
  'Watermelon smoothie': 'Smoothie pastèque',
  'Watermelon bread': 'Pain à la pastèque',
  'Leppa smoothie': 'Smoothie Mepo',
}

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const fichierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

const html = fichierLocal
  ? fs.readFileSync(fichierLocal, 'utf8')
  : await (await fetch(PAGE, { headers: { 'user-agent': 'Mozilla/5.0' } })).text()

/**
 * Chaque goût ouvre sa section par une ancre `<a name="bitter">` ; la suivante la ferme.
 * Une ligne d'aliment porte son image `items/<cle>.png` et son nom anglais en `alt`.
 */
const aliments = []
const sections = html.split(/<a name="(\w+)"><\/a>/)
for (let i = 1; i < sections.length; i += 2) {
  const gout = sections[i]
  if (!GOUTS.includes(gout)) continue
  for (const m of sections[i + 1].matchAll(/<img src="items\/([^"]+)\.png"[^>]*alt="([^"]+)"/g)) {
    const en = m[2].replace(/&eacute;/g, 'é').replace(/&amp;/g, '&')
    aliments.push({ en, fr: FR[en] || null, gout, sprite: m[1] })
  }
}

const parGout = Object.fromEntries(GOUTS.map((g) => [g, aliments.filter((a) => a.gout === g).length]))
console.log(`aliments        : ${aliments.length}`, JSON.stringify(parGout))
const vides = GOUTS.filter((g) => !parGout[g])
if (vides.length) throw new Error(`aucun aliment lu pour ${vides.join(', ')} (structure changée ?)`)

const sansFr = aliments.filter((a) => !a.fr).map((a) => a.en)
if (sansFr.length) console.log(`sans nom français (${sansFr.length}) :\n  ` + sansFr.join('\n  '))

const avant = fs.existsSync(FICHIER) ? JSON.parse(fs.readFileSync(FICHIER, 'utf8')) : []
const connus = new Set(avant.map((a) => a.en))
const nouveaux = aliments.filter((a) => !connus.has(a.en)).map((a) => a.en)
const disparus = avant.filter((a) => !aliments.some((b) => b.en === a.en)).map((a) => a.en)
if (nouveaux.length) console.log(`nouveaux (${nouveaux.length}) : ${nouveaux.join(', ')}`)
if (disparus.length) console.log(`disparus (${disparus.length}) : ${disparus.join(', ')}`)

if (!ecrire) {
  console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
  process.exit(0)
}

fs.mkdirSync(DOSSIER_SPRITES, { recursive: true })
let telecharges = 0
for (const { sprite } of aliments) {
  if (fs.existsSync(new URL(`${sprite}.webp`, DOSSIER_SPRITES))) continue
  const cible = new URL(`${sprite}.png`, DOSSIER_SPRITES)
  if (fs.existsSync(cible)) continue
  const reponse = await fetch(IMAGES + sprite + '.png', { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!reponse.ok) {
    console.log(`image manquante : ${sprite}.png (${reponse.status})`)
    continue
  }
  fs.writeFileSync(cible, Buffer.from(await reponse.arrayBuffer()))
  telecharges += 1
}
fs.writeFileSync(FICHIER, JSON.stringify(aliments, null, 1) + '\n')
console.log(`\nsrc/data/aliments.json écrit, ${telecharges} image(s) téléchargée(s) dans ${path.basename(DOSSIER_SPRITES.pathname)}/.`)
