// Relève les habitats du jeu — ce qu'il faut assembler pour qu'un Pokémon apparaisse.
//
//   node scripts/importer-serebii-habitats.mjs                    télécharge, compare, n'écrit rien
//   node scripts/importer-serebii-habitats.mjs --ecrire           applique à src/data/habitats.json
//   node scripts/importer-serebii-habitats.mjs --local <dossier>  part de pages déjà téléchargées
//                                                                  (habitats.shtml et une page par habitat)
//
// À ne pas confondre avec l'« habitat idéal » de pokemon.json (Lumineux, Sombre…), qui
// est un climat. Ici, un habitat est une recette : « quatre Herbes vertes », « une
// Lanterne citrouille, un Lampadaire Desséliande… ». Une fois posée, elle attire au
// hasard l'un des Pokémon qu'elle liste, selon sa rareté, l'heure et la météo.
//
// Serebii tient une page par habitat (`habitatdex/<slug>.shtml`), listées sur
// `habitats.shtml` en trois sections : principal, bassin, événement — chacune repart de
// #001, comme les Pokédex. Chaque page porte :
//   • « Requirements » : objet par objet, avec la quantité. Certains sont génériques
//     (« Tree ») et ne renvoient vers aucune fiche ;
//   • « Available Pokémon » : des blocs de quatre colonnes — noms, images, lieux, rareté,
//     puis un tableau heure/météo qui ne liste que les créneaux où le Pokémon vient.
//
// Les noms français des habitats viennent de l'Habitadex de Pokékalos, qui donne les deux
// noms côte à côte ; ceux des objets, de notre catalogue d'abord, de la liste d'objets de
// Pokékalos sinon. Ce qui n'a pas de nom français est signalé et garde l'anglais.
//
// Les vignettes d'habitat (300 × 209, JPEG déguisé en PNG chez Serebii) se convertissent à
// part, en webp de 160 px de large, dans src/data/sprites/habitats/ : le script dit
// lesquelles manquent.
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://www.serebii.net/pokemonpokopia'
const KALOS_HABITATS = 'https://www.pokekalos.fr/jeux/switch2/pokopia/habitats.html'
const KALOS_OBJETS = 'https://www.pokekalos.fr/jeux/switch2/pokopia/objets.html'

const FICHIER = new URL('../src/data/habitats.json', import.meta.url)
const OBJETS = new URL('../src/data/objets.json', import.meta.url)
const COMPLEMENT = new URL('../src/data/objets-complement.json', import.meta.url)
const POKEMON = new URL('../src/data/pokemon.json', import.meta.url)
const SPRITES = new URL('../src/data/sprites/habitats/', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const dossierLocal = args.includes('--local') ? args[args.indexOf('--local') + 1] : null

/** Les ancres de habitats.shtml, dans l'ordre de la page. */
const SECTIONS = { main: 'principal', basin: 'bassin', event: 'evenement' }

const RARETES = { common: 'commun', rare: 'rare', 'very rare': 'tres-rare' }
const MOMENTS = { morning: 'matin', day: 'jour', evening: 'soir', night: 'nuit' }
const METEOS = { sun: 'soleil', cloud: 'nuages', rain: 'pluie' }

const texte = (html) =>
  html
    .replace(/<br\s*\/?>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

/** « Poké Ball sofa » et « Poke Ball Sofa » : Serebii écrit l'accent une fois sur deux. */
const reduire = (nom) => nom.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

async function telecharger(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`${url} : HTTP ${r.status}`)
  return r.text()
}

/** Serebii en latin-1 ; en local, les pages sont lues telles que curl les a posées. */
const chargerSerebii = (page) =>
  dossierLocal
    ? fs.readFileSync(path.join(dossierLocal, path.basename(page)), 'latin1')
    : telecharger(`${BASE}/${page}`)

/* ---------- l'index : numéro, section, slug, nom anglais ---------- */

const index = await chargerSerebii('habitats.shtml')
const entrees = []
let section = null
for (const morceau of index.split(/(<a name="(?:main|basin|event)")/)) {
  const ancre = morceau.match(/^<a name="(\w+)"/)
  if (ancre) {
    section = SECTIONS[ancre[1]]
    continue
  }
  if (!section) continue
  for (const [, corps] of morceau.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
    const numero = corps.match(/#(\d{3})/)?.[1]
    const lien = corps.match(/habitatdex\/([^"]+)\.shtml"><u>([^<]+)<\/u>/)
    if (numero && lien) entrees.push({ numero, dex: section, slug: lien[1], en: texte(lien[2]) })
  }
}
if (!entrees.length) throw new Error('aucun habitat lu dans habitats.shtml')

/* ---------- les noms français, chez Pokékalos ---------- */

const kalosHabitats = dossierLocal
  ? fs.readFileSync(path.join(dossierLocal, 'kalos-habitats.html'), 'utf8')
  : await telecharger(KALOS_HABITATS)
/**
 * Pokékalos range ses habitats dans les trois mêmes sections, numérotées comme chez
 * Serebii : on apparie sur (section, numéro). Son `data-en` ne s'y prête pas — coquilles
 * (« Topsy-turby », « Crazy log handicrafts ») et étiquettes décalées (le Spécimen de
 * Fossile Aile y porte le nom anglais du Malicious knight's shrine). On s'en sert seulement
 * pour signaler les paires dont les deux noms anglais n'ont rien de commun.
 */
const SECTIONS_KALOS = { 'section-jeu': 'principal', 'section-dlc1': 'bassin', 'section-evenement': 'evenement' }
const decoder = (s) => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'")
const kalosParCle = new Map()
for (const partie of kalosHabitats.split(/<details[^>]*id="/).slice(1)) {
  const dex = SECTIONS_KALOS[partie.slice(0, partie.indexOf('"'))]
  if (!dex) continue
  for (const [, page, numero, fr, en] of partie.matchAll(/href="([^"]+)" data-num="(\d+)" data-fr="([^"]+)" data-en="([^"]+)"/g))
    kalosParCle.set(`${dex}#${numero}`, { page, fr: decoder(fr).replace(/’/g, "'"), en: decoder(en) })
}

/**
 * Les deux habitats de l'événement Pitrouille manquent encore à l'Habitadex de Pokékalos ;
 * leurs noms viennent de l'article qui l'annonce :
 * https://www.pokekalos.fr/news/actualites-pokemon-pokopia-evenement-les-surprises-sucrees-de-pitrouille-2855.html
 */
const FR_HORS_HABITADEX = {
  'Give me something good to eat': 'Coin friandises ou hantise',
  'Creepy pumpkins': 'Citrouilles inquiétantes',
}

/**
 * La recette en français, telle que la fiche Pokékalos de l'habitat l'écrit : « Herbe
 * verte ×4 », « Arbre (au choix) ×1 ». C'est la seule source des requis génériques
 * (« Tree », « Seat (any) »), qu'aucune liste d'objets ne nomme.
 */
async function recetteKalos(page) {
  const html = dossierLocal
    ? fs.existsSync(path.join(dossierLocal, 'kalos', page)) && fs.readFileSync(path.join(dossierLocal, 'kalos', page), 'utf8')
    : await telecharger(new URL(page, KALOS_HABITATS).href)
  if (!html) return []
  return [...html.matchAll(/<div class="habitat-area-name-item">([^<]+)<\/div>/g)].map((m) => {
    const [, nom, quantite] = decoder(m[1]).trim().match(/^(.*?)\s*×\s*(\d+)$/) || [, decoder(m[1]).trim(), '0']
    return { fr: nom.replace(/’/g, "'"), quantite: Number(quantite) }
  })
}

/** Part des mots de l'un qu'on retrouve dans l'autre : 0 quand les deux noms divergent tout à fait. */
const mots = (s) => new Set(s.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, ' ').split(/\s+/).filter((m) => m.length > 2))
function proximite(a, b) {
  const [ma, mb] = [mots(a), mots(b)]
  const communs = [...ma].filter((m) => mb.has(m)).length
  return communs / Math.max(1, Math.min(ma.size, mb.size))
}

const kalosObjets = dossierLocal
  ? fs.readFileSync(path.join(dossierLocal, 'kalos-objets.html'), 'utf8')
  : await telecharger(KALOS_OBJETS)
/** Pokékalos range ses noms en minuscules dans `data-name-*` ; l'`alt` qui suit garde la casse. */
const frKalosObjet = new Map()
for (const [, en, suite] of kalosObjets.matchAll(/data-name-en="([^"]+)">([\s\S]{0,600})/g)) {
  const alt = suite.match(/alt="([^"]+)"/)?.[1]
  if (alt && !frKalosObjet.has(reduire(en))) frKalosObjet.set(reduire(en), decoder(alt).replace(/’/g, "'"))
}

const catalogue = [
  ...JSON.parse(fs.readFileSync(OBJETS, 'utf8')),
  ...JSON.parse(fs.readFileSync(COMPLEMENT, 'utf8')).objets,
]
const objetParReduit = new Map(catalogue.map((o) => [reduire(o.en), o]))
const pokemonParReduit = new Map(
  JSON.parse(fs.readFileSync(POKEMON, 'utf8')).map((p) => [reduire(p.en), p.en]),
)

/* ---------- une page d'habitat ---------- */

/** « Requirements » : une ligne par objet — nom dans un <u>, quantité dans la dernière cellule. */
function lireRequis(html) {
  const section = html.split(/<h2>Requirements<\/h2>/i)[1]?.split(/<h2>/i)[0] || ''
  const requis = []
  for (const [, corps] of section.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
    const nom = corps.match(/<u>([^<]+)<\/u>/)?.[1]
    const cellules = [...corps.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => texte(m[1]))
    const quantite = Number(cellules.at(-1))
    if (nom && quantite) requis.push({ nom: texte(nom), quantite })
  }
  return requis
}

/**
 * « Available Pokémon » : des blocs de quatre colonnes au plus. La première rangée d'un
 * bloc nomme les Pokémon (cellules `fooevo`) ; les rangées suivantes, dans le même ordre
 * de colonnes, donnent lieux, rareté, puis le tableau heure/météo.
 */
function lirePokemon(html) {
  const section = html.split(/<h2>Available Pok(?:&eacute;|é)mon<\/h2>/i)[1]?.split(/Game Names/)[0] || ''
  const venues = []
  for (const bloc of section.split(/(?=<tr>\s*<td class="fooevo">)/).slice(1)) {
    const noms = [...bloc.matchAll(/<td class="fooevo"><a [^>]*>([^<]+)<\/a><\/td>/g)].map((m) => texte(m[1]))
    const raretes = [...bloc.matchAll(/<b>Rarity<\/b>:<br \/>([^<]*)<\/td>/g)].map((m) => texte(m[1]).toLowerCase())
    const creneaux = [...bloc.matchAll(/<b>Time<\/b>[\s\S]*?<tr><td valign="top">([\s\S]*?)<\/td><td valign="top">([\s\S]*?)<\/tr>/g)]
    noms.forEach((nom, i) => {
      const moments = texte(creneaux[i]?.[1] || '').toLowerCase().split('|').map((s) => s.trim()).filter(Boolean)
      const meteos = texte(creneaux[i]?.[2] || '').toLowerCase().split('|').map((s) => s.trim()).filter(Boolean)
      venues.push({ nom, rarete: raretes[i], moments, meteos })
    })
  }
  return venues
}

/* ---------- assemblage ---------- */

const sansFr = new Set()
const douteux = []
const recettesDivergentes = []
const objetsSansFr = new Set()
const pokemonInconnus = new Set()
const inconnus = new Set()

const reduireFr = (nom) => nom.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

/**
 * Nom générique de Serebii -> noms français que Pokékalos lui oppose, avec leur nombre
 * d'occurrences. Serebii n'est pas constant dans sa casse (« Seat (wide) », « Seat (Wide) »)
 * ni dans ses parenthèses : la clé réduit les deux.
 */
const cleGenerique = (nom) => reduire(nom.replace(/\((any)\)/i, ''))
const parGenerique = new Map()
const votes = (nom) => {
  const cle = cleGenerique(nom)
  if (!parGenerique.has(cle)) parGenerique.set(cle, new Map())
  return parGenerique.get(cle)
}

/** slug -> lignes Pokékalos non expliquées par le catalogue, pour la seconde passe. */
const restantsParHabitat = new Map()

const habitats = []
for (const e of entrees) {
  const html = await chargerSerebii(`habitatdex/${e.slug}.shtml`)
  const image = html.match(/habitatdex\/(e?b?\d+)\.png/)?.[1] || null

  const kalos = kalosParCle.get(`${e.dex}#${e.numero}`)
  const recette = kalos ? await recetteKalos(kalos.page) : []
  const lus = lireRequis(html)
  if (recette.length && recette.length !== lus.length)
    recettesDivergentes.push(`${e.dex} #${e.numero} ${e.en} : ${lus.length} requis chez Serebii, ${recette.length} chez Pokékalos`)

  // Les deux sites ne rangent pas la recette dans le même ordre : on écarte d'abord, côté
  // Pokékalos, les lignes qui nomment un objet de notre catalogue présent dans la recette.
  // Ce qui reste, ce sont les génériques ; on les apparie quand l'appariement est sûr —
  // un seul de chaque côté, ou une quantité qu'un seul porte.
  const requis = lus.map(({ nom, quantite }) => {
    const notre = objetParReduit.get(reduire(nom))
    return notre ? { objet: notre.en, quantite } : { en: nom, fr: null, quantite }
  })
  const frCatalogue = new Set(requis.filter((r) => r.objet).map((r) => reduireFr(objetParReduit.get(reduire(r.objet)).fr)))
  const restants = recette.filter((l) => !frCatalogue.has(reduireFr(l.fr)))
  const generiques = requis.filter((r) => r.en)
  for (const r of generiques) {
    const memeQuantite = restants.filter((l) => l.quantite === r.quantite)
    const ligne =
      generiques.length === 1 && restants.length === 1
        ? restants[0]
        : memeQuantite.length === 1 && generiques.filter((g) => g.quantite === r.quantite).length === 1
          ? memeQuantite[0]
          : null
    if (ligne) votes(r.en).set(ligne.fr, (votes(r.en).get(ligne.fr) || 0) + 1)
  }

  const pokemon = []
  for (const v of lirePokemon(html)) {
    const notre = pokemonParReduit.get(reduire(v.nom))
    if (!notre) {
      pokemonInconnus.add(v.nom)
      continue
    }
    // Serebii laisse quelques cellules vides (rareté non publiée) et en double une
    // (« CommonCommon », Training waterfall) : la vide reste inconnue, la doublée se lit.
    const brute = (v.rarete || '').replace(/^(common|rare|very rare)\1$/, '$1')
    const rarete = brute ? RARETES[brute] : null
    if (brute && !rarete) inconnus.add(`rareté « ${v.rarete} »`)
    const moments = v.moments.map((m) => MOMENTS[m] || (inconnus.add(`moment « ${m} »`), m))
    const meteos = v.meteos.map((m) => METEOS[m] || (inconnus.add(`météo « ${m} »`), m))
    // Les quatre moments, les trois météos : la restriction n'en est pas une, on l'omet.
    pokemon.push({
      nom: notre,
      rarete,
      ...(moments.length && moments.length < 4 ? { moments } : {}),
      ...(meteos.length && meteos.length < 3 ? { meteos } : {}),
    })
  }

  const fr = kalos?.fr || FR_HORS_HABITADEX[e.en] || null
  if (!fr) sansFr.add(`${e.dex} #${e.numero} ${e.en}`)
  else if (kalos && proximite(e.en, kalos.en) === 0) douteux.push(`${e.dex} #${e.numero} ${e.en} → ${fr} (Pokékalos : ${kalos.en})`)
  restantsParHabitat.set(e.slug, restants)
  habitats.push({ ...e, fr: fr || null, image, requis, pokemon })
}

// Chaque générique prend le nom français le plus souvent apparié ; un désaccord est imprimé.
const conflits = []
for (const h of habitats)
  for (const r of h.requis) {
    if (!r.en) continue
    const candidats = [...(parGenerique.get(cleGenerique(r.en)) || [])].sort((a, b) => b[1] - a[1])
    if (candidats.length > 1 && !conflits.some((c) => c.startsWith(r.en)))
      conflits.push(`${r.en} : ${candidats.map(([fr, n]) => `${fr} (${n})`).join(', ')}`)
    r.fr = candidats[0]?.[0] || null
  }

// Seconde passe : dans un habitat, les génériques déjà nommés expliquent leurs lignes
// Pokékalos ; s'il reste alors un seul générique et une seule ligne, ils vont ensemble —
// c'est le cas de « Bed » et « Doll (any) », tous deux ×1 dans « Bed with a plush ».
for (const h of habitats) {
  const sansNom = h.requis.filter((r) => r.en && !r.fr)
  if (sansNom.length !== 1) continue
  const pris = new Set(h.requis.filter((r) => r.fr).map((r) => reduireFr(r.fr)))
  const libres = restantsParHabitat.get(h.slug).filter((l) => !pris.has(reduireFr(l.fr)))
  if (libres.length === 1) sansNom[0].fr = libres[0].fr
}
// Ce qu'elle a nommé vaut pour tous les habitats qui citent le même générique.
const nomme = new Map()
for (const h of habitats) for (const r of h.requis) if (r.en && r.fr) nomme.set(cleGenerique(r.en), r.fr)
for (const h of habitats)
  for (const r of h.requis) {
    if (!r.en) continue
    r.fr ||= nomme.get(cleGenerique(r.en)) || frKalosObjet.get(reduire(r.en)) || null
    if (!r.fr) objetsSansFr.add(r.en)
  }

/* ---------- rapport ---------- */

const parDex = habitats.reduce((acc, h) => ({ ...acc, [h.dex]: (acc[h.dex] || 0) + 1 }), {})
console.log(`habitats : ${habitats.length}`, JSON.stringify(parDex))
const couverts = new Set(habitats.flatMap((h) => h.pokemon.map((p) => p.nom)))
const tous = [...pokemonParReduit.values()]
console.log(`Pokémon rattachés à au moins un habitat : ${couverts.size} / ${tous.length}`)
const orphelins = tous.filter((n) => !couverts.has(n))
if (orphelins.length) console.log(`  sans habitat (${orphelins.length}) : ${orphelins.join(', ')}`)
if (pokemonInconnus.size) console.log(`Pokémon de Serebii absents de chez nous : ${[...pokemonInconnus].join(', ')}`)
if (douteux.length) console.log(`appariements à relire (${douteux.length}) :\n  ` + douteux.join('\n  '))
if (conflits.length) console.log(`génériques aux noms français concurrents (${conflits.length}) :\n  ` + conflits.join('\n  '))
if (recettesDivergentes.length)
  console.log(`recettes de longueur différente (${recettesDivergentes.length}) :\n  ` + recettesDivergentes.join('\n  '))
if (sansFr.size) console.log(`habitats sans nom français (${sansFr.size}) : ${[...sansFr].join(', ')}`)
if (objetsSansFr.size) console.log(`objets requis hors catalogue et sans nom français : ${[...objetsSansFr].join(', ')}`)
if (inconnus.size) throw new Error(`valeurs inconnues : ${[...inconnus].join(', ')}`)

const images = [...new Set(habitats.map((h) => h.image).filter(Boolean))]
const manquantes = images.filter((i) => !fs.existsSync(new URL(`${i}.webp`, SPRITES)))
if (manquantes.length)
  console.log(`vignettes à convertir (${manquantes.length}) : ${BASE}/habitatdex/th/<n>.png → sprites/habitats/<n>.webp`)

const sortie = {
  _lisezMoi:
    "Les habitats du jeu : la recette (`requis`) et les Pokémon qu'elle attire, avec leur rareté et, quand ils sont restreints, les moments et la météo où ils viennent. Un requis porte `objet` (nom anglais de notre catalogue) ou, hors catalogue, `en` et `fr`. Produit par scripts/importer-serebii-habitats.mjs — ne pas éditer à la main.",
  _sources: { habitats: `${BASE}/habitats.shtml`, nomsFr: KALOS_HABITATS },
  habitats,
}

if (ecrire) {
  fs.writeFileSync(FICHIER, JSON.stringify(sortie, null, 1) + '\n')
  console.log(`\nécrit : src/data/habitats.json`)
} else console.log('\n(rien d’écrit — relancer avec --ecrire)')
