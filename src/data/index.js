/**
 * Modèle de données de l'index des préférences de Pokémon Pokopia.
 *
 * Trois fichiers plats, extraits une fois pour toutes par `scripts/extraire-artifact.mjs` :
 *   • preferences.json — les 43 préférences, chacune avec ses objets et ses Pokémon ;
 *   • objets.json      — 714 objets : nom anglais, traduction, catégorie en jeu, sprite ;
 *   • pokemon.json     — 366 Pokémon : nom anglais, nom français, numéro Pokopia, habitat.
 *
 * Les relations sont inversées ici, à l'import, plutôt que recalculées à chaque rendu :
 * l'index affiche jusqu'à 3 000 vignettes déplié, et la vue habitat croise quatre
 * Pokémon avec leurs 43 préférences à chaque frappe.
 */

import preferencesBrutes from './preferences.json'
import objetsBruts from './objets.json'
import complementObjets from './objets-complement.json'
import pokemonBruts from './pokemon.json'
import alimentsBruts from './aliments.json'

/** Nombre maximum de colocataires d'un même habitat. */
export const MAX_COLOCATAIRES = 4

/** Les catégories d'objets du jeu. Un habitat « exceptionnel » demande au moins un de chaque. */
export const FR_CATEGORIE = { Relaxation: 'Repos', Decoration: 'Décoration', Toy: 'Jouet', Road: 'Route' }

/** Les six habitats idéaux. Deux Pokémon d'habitats différents ne peuvent pas cohabiter. */
export const FR_HABITAT = { Bright: 'Lumineux', Dark: 'Sombre', Humid: 'Humide', Dry: 'Sec', Warm: 'Chaud', Cool: 'Froid' }

/**
 * Les cinq goûts, dans l'ordre où on les affiche. Chaque Pokémon en préfère un : lui offrir
 * un aliment de ce goût fait monter son amitié et son confort plus vite que n'importe quel
 * autre. Cinq entrées n'en ont pas — cf. scripts/importer-gouts.mjs, qui dit d'où ils
 * viennent et pourquoi ces cinq-là manquent.
 */
export const GOUTS = ['sweet', 'spicy', 'sour', 'bitter', 'dry']

/** « Sec » est aussi le nom d'un habitat : en contexte de goût, on le préfixe à l'affichage. */
export const FR_GOUT = { sweet: 'Sucré', spicy: 'Épicé', sour: 'Acide', bitter: 'Amer', dry: 'Sec' }

/**
 * Kyogre est le seul Pokémon de l'île qu'aucun enclos ne peut accueillir. Il a pourtant des
 * préférences comme les autres, donc rien dans les données ne le distingue : c'est ici qu'on
 * le dit, et les listes où l'on compose un habitat s'en servent pour l'écarter.
 */
export const NON_LOGEABLES = new Set(['Kyogre'])

/** Peut-il rejoindre un enclos ? Faux pour Kyogre seul. */
export const logeable = (nom) => !NON_LOGEABLES.has(nom)

/** Libellés des 18 types, dont les clés viennent de Pokébip (sans accents, en minuscules). */
export const FR_TYPE = {
  acier: 'Acier',
  combat: 'Combat',
  dragon: 'Dragon',
  eau: 'Eau',
  electrik: 'Électrik',
  fee: 'Fée',
  feu: 'Feu',
  glace: 'Glace',
  insecte: 'Insecte',
  normal: 'Normal',
  plante: 'Plante',
  poison: 'Poison',
  psy: 'Psy',
  roche: 'Roche',
  sol: 'Sol',
  spectre: 'Spectre',
  tenebres: 'Ténèbres',
  vol: 'Vol',
}

export const preferences = preferencesBrutes

/**
 * Le catalogue, extraction d'origine plus rattrapage.
 *
 * objets.json ne porte que les objets CITÉS par une préférence — c'est ainsi qu'il est
 * produit (cf. scripts/extraire-artifact.mjs). Une vingtaine de meubles du jeu n'en
 * cochent aucune : ils manquaient donc au catalogue, introuvables par la recherche et sans
 * fiche. objets-complement.json les rajoute ; l'ordre alphabétique est refait ici pour que
 * le catalogue reste rangé, et les doublons éventuels laissent la main à l'extraction, qui
 * seule porte un sprite.
 */
const parNomBrut = new Map(objetsBruts.map((o) => [o.en, o]))
export const objets = [
  ...objetsBruts,
  ...complementObjets.objets.filter((o) => !parNomBrut.has(o.en)),
].sort((a, b) => a.en.localeCompare(b.en, 'en'))

export const pokemon = pokemonBruts

export const prefParSlug = new Map(preferences.map((p) => [p.slug, p]))
export const objetParNom = new Map(objets.map((o) => [o.en, o]))
export const pokemonParNom = new Map(pokemon.map((p) => [p.en, p]))

/** nom anglais d'objet -> slugs des préférences qu'il satisfait, dans l'ordre des cartes. */
export const prefsParObjet = new Map()
/** nom anglais de Pokémon -> slugs des préférences qu'il apprécie. */
export const prefsParPokemon = new Map()

for (const pref of preferences) {
  for (const nom of pref.objets) {
    if (!prefsParObjet.has(nom)) prefsParObjet.set(nom, [])
    prefsParObjet.get(nom).push(pref.slug)
  }
  for (const nom of pref.pokemon) {
    if (!prefsParPokemon.has(nom)) prefsParPokemon.set(nom, [])
    prefsParPokemon.get(nom).push(pref.slug)
  }
}

/* ---------- libellés ---------- */

const OBJET_INCONNU = { fr: null, categorie: null, sprite: null }
const POKEMON_INCONNU = { fr: null, numero: null, habitat: null, sprite: null, types: [], specialites: [], gout: null }
const VIDE = []

const infosObjet = (nom) => objetParNom.get(nom) || OBJET_INCONNU
const infosPokemon = (nom) => pokemonParNom.get(nom) || POKEMON_INCONNU

/** Nom français d'un objet, avec repli sur l'anglais. */
export const frObjet = (nom) => infosObjet(nom).fr || nom
/** Nom français d'un Pokémon, avec repli sur l'anglais. */
export const frPokemon = (nom) => infosPokemon(nom).fr || nom
/** Catégorie en jeu (« Repos », « Décoration »…) ; vide pour les 266 matériaux et revêtements. */
export const categorieDe = (nom) => FR_CATEGORIE[infosObjet(nom).categorie] || ''
/** Habitat idéal d'un Pokémon (« Humide », « Chaud »…). */
export const habitatDe = (nom) => FR_HABITAT[infosPokemon(nom).habitat] || ''
/** Clé du goût préféré (`sweet`, `dry`…), ou null pour les cinq entrées sans donnée. */
export const goutBrutDe = (nom) => infosPokemon(nom).gout || null
/** Goût préféré en français (« Sucré », « Amer »…) ; vide si on ne le connaît pas. */
export const goutDe = (nom) => FR_GOUT[infosPokemon(nom).gout] || ''

/**
 * Les 48 aliments qui ont un goût, dans l'ordre de Serebii : la baie d'abord, puis les
 * ingrédients, puis les plats. Les noms français sont en partie une traduction maison —
 * cf. scripts/importer-aliments.mjs.
 */
export const aliments = alimentsBruts
const alimentsParGout = new Map(GOUTS.map((g) => [g, aliments.filter((a) => a.gout === g)]))

/** Ce qu'offrir à un Pokémon : les aliments de son goût préféré, ou rien s'il n'en a pas. */
export const alimentsDe = (nom) => alimentsParGout.get(infosPokemon(nom).gout) || VIDE
/** Nom français d'un aliment, avec repli sur l'anglais. */
export const frAliment = (aliment) => aliment.fr || aliment.en
/**
 * Pokopia tient trois Pokédex, et chacun repart de #001 : le principal (307 entrées), celui
 * du Bubbly Basin (52, DLC) et l'événementiel (7). Un numéro seul est donc ambigu — Onix est
 * #030 du principal, Mamanbo #030 du bassin — d'où le préfixe à l'affichage et le tri par
 * Pokédex d'abord.
 */
export const ORDRE_DEX = { principal: 0, bassin: 1, evenement: 2 }
export const FR_DEX = { principal: 'Pokédex principal', bassin: 'Bassin (DLC)', evenement: 'Événement' }
/** Préfixe court, vide pour le Pokédex principal : le cas courant n'a pas à être qualifié. */
const PREFIXE_DEX = { principal: '', bassin: 'Bassin ', evenement: 'Événement ' }

/** Numéro brut, sur trois chiffres, sans son Pokédex — pour le tri et les comparaisons. */
export const numeroDe = (nom) => infosPokemon(nom).numero || ''
export const dexDe = (nom) => infosPokemon(nom).dex || 'principal'

/** Numéro tel qu'on l'affiche : « #030 », « Bassin #030 ». */
export const numeroAffiche = (nom) => {
  const numero = numeroDe(nom)
  return numero ? `${PREFIXE_DEX[dexDe(nom)] ?? ''}#${numero}` : ''
}

/**
 * Types et spécialité viennent de Pokébip, dont le Pokédex s'arrête à 303 espèces : 78 de
 * nos entrées — les Pokémon aquatiques, pour l'essentiel — n'en ont pas encore. Les deux
 * accesseurs renvoient donc un tableau vide plutôt que d'échouer, et l'affichage se
 * contente de sauter la ligne.
 */
export const typesDe = (nom) => infosPokemon(nom).types || VIDE
/** La spécialité est le travail que le Pokémon accomplit sur l'île. Certains en ont deux. */
export const specialitesDe = (nom) => infosPokemon(nom).specialites || VIDE

/** Les types présents dans les données, dans l'ordre des libellés français. */
export const typesUtilises = [...new Set(pokemon.flatMap((p) => p.types || []))].sort((a, b) =>
  (FR_TYPE[a] || a).localeCompare(FR_TYPE[b] || b, 'fr'),
)

/** Les spécialités présentes dans les données, par ordre alphabétique. */
export const specialitesUtilisees = [...new Set(pokemon.flatMap((p) => p.specialites || []))].sort(
  (a, b) => a.localeCompare(b, 'fr'),
)
export const spriteObjet = (nom) => infosObjet(nom).sprite
export const spritePokemon = (nom) => infosPokemon(nom).sprite

/**
 * Tri par numéro : le Pokédex d'abord — sans quoi Mamanbo, #030 du bassin, s'intercalerait
 * entre Onix #030 et Rhinocorne #031 du principal — puis le numéro. Les formes d'une même
 * espèce partagent un numéro (Sancoki et Sancoki Mer Est) : le nom français les départage
 * pour que l'ordre reste stable.
 */
export const comparerParNumero = (a, b) =>
  (ORDRE_DEX[dexDe(a)] ?? 9) - (ORDRE_DEX[dexDe(b)] ?? 9) ||
  (Number(numeroDe(a)) || 999) - (Number(numeroDe(b)) || 999) ||
  frPokemon(a).localeCompare(frPokemon(b), 'fr')

/* ---------- vue habitat ---------- */

/** Préférences réunies par un groupe de colocataires, dédoublonnées, dans l'ordre de l'index. */
export function preferencesDuGroupe(noms) {
  const reunies = new Set()
  for (const nom of noms) for (const slug of prefsParPokemon.get(nom) || []) reunies.add(slug)
  return preferences.filter((p) => reunies.has(p.slug)).map((p) => p.slug)
}

/**
 * Les objets qu'un Pokémon apprécie : l'union des objets de toutes ses préférences.
 *
 * C'est la granularité qui compte en jeu — on pose des objets, pas des préférences — et
 * deux préférences distinctes se recouvrent souvent largement en objets. Mémoïsé : la
 * compatibilité est évaluée pour les 366 Pokémon à chaque frappe du sélecteur.
 */
const cacheObjetsPokemon = new Map()

export function objetsDuPokemon(nom) {
  let ensemble = cacheObjetsPokemon.get(nom)
  if (!ensemble) {
    ensemble = new Set()
    for (const slug of prefsParPokemon.get(nom) || [])
      for (const objet of prefParSlug.get(slug)?.objets || []) ensemble.add(objet)
    cacheObjetsPokemon.set(nom, ensemble)
  }
  return ensemble
}

/** Recouvrement d'objets d'une paire, de 0 à 1. Mis en cache : la paire ne change jamais. */
const cachePaires = new Map()

function recouvrementPaire(a, b) {
  const cle = a < b ? `${a} ${b}` : `${b} ${a}`
  let taux = cachePaires.get(cle)
  if (taux === undefined) {
    const objetsA = objetsDuPokemon(a)
    const objetsB = objetsDuPokemon(b)
    const [petit, grand] = objetsA.size <= objetsB.size ? [objetsA, objetsB] : [objetsB, objetsA]
    let communs = 0
    for (const objet of petit) if (grand.has(objet)) communs += 1
    const reunis = objetsA.size + objetsB.size - communs
    taux = reunis ? communs / reunis : 0
    cachePaires.set(cle, taux)
  }
  return taux
}

/**
 * Compatibilité d'un groupe, de 0 à 100.
 *
 * On moyenne le recouvrement de chaque PAIRE — objets communs ÷ objets réunis — plutôt que
 * de prendre l'intersection de tout le groupe : à quatre, cette intersection est souvent
 * vide, et le score resterait bloqué à zéro sans rien distinguer. La moyenne par paire,
 * elle, récompense chaque affinité, même partielle.
 *
 * Le recouvrement se mesure sur les OBJETS, pas sur les préférences : deux Pokémon qui
 * n'ont aucune préférence en commun peuvent aimer largement les mêmes meubles — « Lits » et
 * « Sommeil » désignent en partie les mêmes objets — et un enclos se meuble en objets. Le
 * score dit donc directement ce qu'on veut savoir : combien de ce qu'on posera fera plaisir
 * à plusieurs colocataires à la fois.
 *
 * Deux Pokémon aux goûts identiques donnent 100, deux Pokémon sans aucun objet commun
 * donnent 0. Un Pokémon seul n'a personne avec qui s'entendre : la fonction renvoie null,
 * et l'affichage saute la mention.
 *
 * Le score ne dit rien de l'habitat idéal — deux Pokémon très compatibles peuvent être l'un
 * Chaud et l'autre Froid, ce qu'un enclos ne peut pas satisfaire. C'est l'avertissement
 * d'habitat, séparé, qui s'en charge.
 */
export function compatibilite(noms) {
  if (noms.length < 2) return null
  let total = 0
  let paires = 0
  for (let i = 0; i < noms.length; i++) {
    for (let j = i + 1; j < noms.length; j++) {
      total += recouvrementPaire(noms[i], noms[j])
      paires += 1
    }
  }
  return Math.round((total / paires) * 100)
}

/** Ce que deviendrait la compatibilité si `candidat` rejoignait `noms`. */
export const compatibiliteAvec = (noms, candidat) =>
  noms.includes(candidat) ? compatibilite(noms) : compatibilite([...noms, candidat])

/**
 * Les objets que TOUT le groupe apprécie — ceux qui contentent l'enclos entier d'un coup.
 * C'est ce que montre la bascule « Choses en commun » de la vue habitat.
 */
export function objetsCommuns(noms) {
  if (!noms.length) return []
  const autres = noms.slice(1).map(objetsDuPokemon)
  return [...objetsDuPokemon(noms[0])].filter((objet) => autres.every((s) => s.has(objet)))
}

/** Parmi `noms`, ceux qui apprécient la préférence `slug`. */
export const amateursDe = (noms, slug) =>
  noms.filter((nom) => (prefsParPokemon.get(nom) || []).includes(slug))

/**
 * Objets à poser pour un groupe, classés par utilité décroissante.
 *
 * Un objet vaut d'abord par le **nombre de colocataires** qu'il satisfait — un objet
 * « 3 Pokémon » vaut mieux que trois objets séparés — puis par le nombre de préférences
 * qu'il coche. `slugsActifs` restreint le calcul aux préférences filtrées ; le filtre
 * est cumulatif, donc en ajouter une élargit la liste.
 *
 * Retourne `[{ nom, prefs, pokemonSatisfaits }]`.
 */
export function objetsPourGroupe(noms, slugsActifs) {
  const prefsParNom = new Map()
  for (const slug of slugsActifs) {
    for (const nom of prefParSlug.get(slug)?.objets || []) {
      if (!prefsParNom.has(nom)) prefsParNom.set(nom, [])
      prefsParNom.get(nom).push(slug)
    }
  }

  const resultat = []
  for (const [nom, prefs] of prefsParNom) {
    resultat.push({
      nom,
      prefs,
      pokemonSatisfaits: noms.filter((m) =>
        prefs.some((slug) => (prefsParPokemon.get(m) || []).includes(slug)),
      ),
    })
  }

  resultat.sort(
    (a, b) =>
      b.pokemonSatisfaits.length - a.pokemonSatisfaits.length ||
      b.prefs.length - a.prefs.length ||
      frObjet(a.nom).localeCompare(frObjet(b.nom), 'fr'),
  )
  return resultat
}

/**
 * Le plus petit lot d'objets qui coche TOUTES les préférences du groupe.
 *
 * Un objet posé dans l'enclos compte pour chaque colocataire qui l'apprécie : il suffit donc
 * qu'une préférence soit cochée une fois pour qu'elle le soit pour tout le monde. La
 * question « que fabriquer ? » est alors une couverture d'ensemble — l'univers est la
 * réunion des préférences, chaque objet en couvre une partie — et on la résout
 * exactement, pas au glouton : à cinq préférences par Pokémon, un groupe en réunit vingt
 * au plus, ce qu'un parcours en profondeur élagué traite en quelques millisecondes.
 *
 * `admissible(nom)` écarte des objets — la vue habitat y retire fossiles et ressources, qui
 * ne meublent rien. Une préférence que seuls ces objets-là cochent est alors quand même
 * couverte, avec eux : mieux vaut un minerai dans le lot qu'une préférence à découvert.
 *
 * Deux lots de même taille se départagent par le nombre de colocataires satisfaits — le
 * même critère que le tri « Utilité » —, et le résultat est rangé dans cet ordre.
 *
 * Retourne `{ objets: [{ nom, prefs, pokemonSatisfaits }], orphelines }` : `orphelines` sont
 * les préférences qu'aucun objet ne coche, et qui restent donc hors de portée.
 */
export function lotMinimal(noms, admissible = () => true) {
  const univers = preferencesDuGroupe(noms)
  const bit = new Map(univers.map((slug, i) => [slug, 1 << i]))
  const candidats = objetsPourGroupe(noms, univers).map((o) => ({
    ...o,
    masque: o.prefs.reduce((m, slug) => m | bit.get(slug), 0),
    admis: admissible(o.nom),
  }))

  const couvrable = (liste) => liste.reduce((m, o) => m | o.masque, 0)
  const parAdmis = couvrable(candidats.filter((o) => o.admis))
  const total = couvrable(candidats)
  // Les objets écartés ne reviennent que pour les préférences que rien d'autre ne coche.
  const retenus = candidats.filter((o) => o.admis || o.masque & total & ~parAdmis)

  // Un objet dont les préférences sont toutes cochées par un autre n'apporte jamais rien de
  // mieux : on ne garde, par masque, que le meilleur représentant, puis les masques qui ne
  // sont inclus dans aucun autre. C'est ce qui ramène quelques centaines d'objets à une
  // vingtaine de vrais choix.
  const parMasque = new Map()
  for (const o of retenus) {
    const deja = parMasque.get(o.masque)
    if (!deja || (o.admis && !deja.admis)) parMasque.set(o.masque, o)
  }
  // Un objet écarté ne fait pas tomber un meuble : s'il coche davantage, c'est quand même le
  // meuble qu'on veut voir proposé pour les préférences qu'ils partagent.
  const domine = (o, par) => par !== o && (par.masque & o.masque) === o.masque && (par.admis || !o.admis)
  const representants = [...parMasque.values()]
  const choix = representants.filter((o) => !representants.some((p) => domine(o, p)))

  const bits = univers.map((slug) => bit.get(slug)).filter((b) => b & total)
  const plusGrand = Math.max(1, ...choix.map((o) => popcount(o.masque)))
  const score = (lot) => lot.reduce((s, o) => s + o.pokemonSatisfaits.length + (o.admis ? 0 : -10), 0)
  let meilleur = null

  function explorer(couvert, lot) {
    if (couvert === total) {
      if (!meilleur || lot.length < meilleur.length || score(lot) > score(meilleur)) meilleur = [...lot]
      return
    }
    // Borne : même avec le plus gros objet à chaque pas, on ne ferait pas mieux. À taille
    // égale on continue, pour le départage par colocataires satisfaits.
    const reste = popcount(total & ~couvert)
    if (meilleur && lot.length + Math.ceil(reste / plusGrand) > meilleur.length) return
    // On branche sur la préférence qui a le moins d'objets : l'un d'eux est forcément dans
    // le lot, et c'est elle qui ouvre l'arbre le plus étroit.
    let cible = 0
    let moins = Infinity
    for (const b of bits) {
      if (couvert & b) continue
      const n = choix.reduce((c, o) => c + (o.masque & b ? 1 : 0), 0)
      if (n < moins) [moins, cible] = [n, b]
    }
    for (const o of choix) {
      if (!(o.masque & cible)) continue
      lot.push(o)
      explorer(couvert | o.masque, lot)
      lot.pop()
    }
  }
  explorer(0, [])

  if (meilleur)
    meilleur.sort(
      (a, b) =>
        b.pokemonSatisfaits.length - a.pokemonSatisfaits.length ||
        b.prefs.length - a.prefs.length ||
        frObjet(a.nom).localeCompare(frObjet(b.nom), 'fr'),
    )
  return {
    objets: (meilleur || []).map(({ nom, prefs, pokemonSatisfaits }) => ({ nom, prefs, pokemonSatisfaits })),
    orphelines: univers.filter((slug) => !(total & bit.get(slug))),
  }
}

function popcount(n) {
  let c = 0
  for (; n; n &= n - 1) c += 1
  return c
}

/**
 * Complète un lot minimal jusqu'à `taille` objets.
 *
 * Le lot minimal coche chaque préférence une fois, et c'est fragile : il suffit qu'un plan
 * manque pour qu'une préférence tombe. Les objets ajoutés sont donc choisis, un par un, pour
 * ce qu'ils apportent EN PLUS du lot déjà formé :
 *   • doubler les préférences cochées une seule fois — le gain décroît à chaque nouvel
 *     objet qui coche la même, pour que le lot s'étale plutôt que d'empiler ;
 *   • contenter beaucoup de colocataires, le critère du tri « Utilité » ;
 *   • apporter la catégorie de confort — repos, décoration, jouet — qui manquerait encore à
 *     un habitat « exceptionnel ».
 *
 * `categorieDe(nom)` donne la catégorie de confort en jeu (`Relaxation`…) ; `confort` est la
 * liste de celles qu'un habitat exceptionnel demande. Retourne les seuls objets ajoutés.
 */
export function completerLot(noms, lot, taille, { admissible = () => true, categorie, confort = [] } = {}) {
  const manque = taille - lot.length
  if (manque <= 0) return []
  const univers = preferencesDuGroupe(noms)
  const compte = new Map(univers.map((slug) => [slug, 0]))
  const categories = new Set()
  const pris = new Set()
  const prendre = (o) => {
    pris.add(o.nom)
    for (const slug of o.prefs) compte.set(slug, compte.get(slug) + 1)
    categories.add(categorie?.(o.nom))
  }
  lot.forEach(prendre)

  const candidats = objetsPourGroupe(noms, univers).filter((o) => admissible(o.nom) && !pris.has(o.nom))
  const ajoutes = []
  while (ajoutes.length < manque) {
    let meilleur = null
    let gainMax = 0
    for (const o of candidats) {
      if (pris.has(o.nom)) continue
      let gain = 0
      for (const slug of o.prefs) gain += 1 / (1 + compte.get(slug))
      gain += o.pokemonSatisfaits.length / noms.length / 2
      const cat = categorie?.(o.nom)
      if (confort.includes(cat) && !categories.has(cat)) gain += 1
      // À gain égal, l'ordre de `objetsPourGroupe` — l'utilité — départage.
      if (gain > gainMax) [meilleur, gainMax] = [o, gain]
    }
    if (!meilleur) break
    prendre(meilleur)
    ajoutes.push(meilleur)
  }
  return ajoutes
}
