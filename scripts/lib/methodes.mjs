// Lecture des méthodes de fabrication de Serebii : noms et sources, sans réseau ni fichier,
// pour que scripts/importer-serebii-methodes.mjs reste testable (cf. methodes.test.mjs).
//
// La colonne « Locations » de crafting.shtml est saisie à la main : « Shop - Bleak Beach
// Lv. 2 », « Daily shop special », « Sparkling ripples in water », avec des fautes et des
// variantes (« Sparkly Skylands », « Withered Wasteland », doubles espaces). `sources()` les
// range en six types que l'app sait traduire, et garde toujours le texte d'origine : un texte
// jamais vu tombe dans `autre`, il n'est pas perdu.

const ENTITES = { amp: '&', eacute: 'é', egrave: 'è', apos: "'", quot: '"', nbsp: ' ', rsquo: "'" }

export const decoderEntites = (s) =>
  (s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);/gi, (m, nom) => ENTITES[nom.toLowerCase()] ?? m)

/** La clé d'appariement : « Pok&eacute; Ball Chest » et « Poké Ball chest » donnent la même. */
export const cleNom = (s) =>
  decoderEntites(s)
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

/** Nom de zone Serebii, normalisé par `cleZone`, -> clé de ville (src/data/villes.js). */
export const CLES_ZONE = {
  witheredwasteland: 'terrassec',
  witheredwastelands: 'terrassec',
  bleakbeach: 'grisemer',
  rockyridges: 'collinangle',
  rockyridge: 'collinangle',
  sparklingskylands: 'flotiles',
  sparklyskylands: 'flotiles',
  palettetown: 'ville-nouvelle',
  bubblybasin: 'fonds-bulleux',
}

const cleZone = (s) => s.toLowerCase().replace(/[^a-z]/g, '')
const RE_ZONE = /(withered wastelands?|bleak beach|rocky ridges?|sparkl(?:ing|y) skylands|palette town|bubbly basin)/i

const zoneDe = (texte) => {
  const m = texte.match(RE_ZONE)
  return m ? CLES_ZONE[cleZone(m[1])] : undefined
}

function une(texte) {
  const bas = texte.toLowerCase()

  if (/expansion pass/.test(bas)) return { type: 'expansion', texte }
  if (/daily special|shop special|daily shop/.test(bas)) return { type: 'offre-du-jour', texte }

  // « Register 140 Pokémon », « Regsiter 240 Pokémon », « Basin Pokédex - 25 Registered » :
  // un palier du Pokédex, celui du bassin quand il est nommé.
  const palier = texte.match(/^Reg\w* (\d+) Pok/i) || texte.match(/^Basin Pok\S* - (\d+) Registered/i)
  if (palier) {
    const source = { type: 'pokedex' }
    if (/^basin/.test(bas)) source.zone = 'fonds-bulleux'
    return { ...source, niveau: Number(palier[1]), texte }
  }
  if (/sparkling (water|ripples)|whirlpool|ripples in water/.test(bas)) return { type: 'remous', texte }

  if (/^shop\b/.test(bas)) {
    const source = { type: 'boutique' }
    const zone = zoneDe(texte)
    if (zone) source.zone = zone
    const niveau = texte.match(/(?:Lv\.?|Level)\s*(\d+)/i)
    if (niveau) source.niveau = Number(niveau[1])
    // « Mountain House Recipe Set », « Wooden Construction Set », « Wasteland House Set ».
    const nomme = texte.match(/([A-Z][\w ]*? Set)\b/)
    if (nomme) source.lot = nomme[1].trim()
    else if (/bundle/.test(bas)) source.lot = true
    source.texte = texte
    return source
  }

  if (/^from\b|during the story|^beginning$|request|quest\b/.test(bas)) return { type: 'histoire', texte }

  const zone = zoneDe(texte)
  return zone ? { type: 'autre', zone, texte } : { type: 'autre', texte }
}

/** Une cellule « Locations » déjà découpée sur ses `<br />` : une ligne -> ses sources. */
export function sources(ligne) {
  const propre = decoderEntites(ligne).replace(/\s+/g, ' ').trim()
  if (!propre) return []
  return propre
    .split(/ or /i)
    .map((morceau) => une(morceau.trim()))
}

/**
 * Les clés des coches du joueur sont les noms anglais de methodes.json. Serebii corrige
 * parfois une casse (« Box sofa » -> « Box Sofa ») : la méthode garde alors son ANCIEN nom,
 * sans quoi la coche ne la retrouverait plus. Ce qui a changé est rendu pour être imprimé.
 */
export function garderNoms(methodes, avant) {
  const ancien = new Map(avant.map((m) => [cleNom(m.en), m.en]))
  const renommees = []
  const nouvelles = []
  const vues = new Set()
  const suivant = methodes.map((m) => {
    const cle = cleNom(m.en)
    vues.add(cle)
    const prec = ancien.get(cle)
    if (!prec) {
      nouvelles.push(m.en)
      return m
    }
    if (prec !== m.en) renommees.push([prec, m.en])
    return { ...m, en: prec }
  })
  const disparues = avant.filter((m) => !vues.has(cleNom(m.en))).map((m) => m.en)
  return { methodes: suivant, renommees, nouvelles, disparues }
}
