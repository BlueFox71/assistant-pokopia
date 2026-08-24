// Complète src/data/pokemon.json avec le Pokédex Pokopia de Pokébip : numéro, types et
// spécialités.
//
//   node scripts/importer-pokebip.mjs                 télécharge, compare, n'écrit rien
//   node scripts/importer-pokebip.mjs --ecrire        applique à src/data/pokemon.json
//   node scripts/importer-pokebip.mjs page.html …     part d'un HTML déjà téléchargé
//
// Source : https://www.pokebip.com/page/jeux-video/pokemon-pokopia/pokedex
//
// L'appariement se fait sur le nom français, seul champ commun avec nos données — les
// numéros, justement, sont ce qu'on vient chercher. Pokébip liste les espèces (303
// lignes) là où nos données listent aussi les formes (366 entrées) : « Sancoki (Mer Est) »
// n'a pas de ligne à lui, il hérite donc de celle de « Sancoki ». Tout ce qui reste
// non apparié est imprimé — c'est le seul moyen de voir qu'une correspondance a été ratée.
import fs from 'node:fs'
import path from 'node:path'

const URL_SOURCE = 'https://www.pokebip.com/page/jeux-video/pokemon-pokopia/pokedex'
const FICHIER = new URL('../src/data/pokemon.json', import.meta.url)

const args = process.argv.slice(2)
const ecrire = args.includes('--ecrire')
const source = args.find((a) => !a.startsWith('--'))

const sansBalises = (html) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&eacute;/g, 'é')
    .trim()

/** Nom comparable : minuscules, sans accents, sans ponctuation ni espaces. */
const cle = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

function extraire(html) {
  const lignes = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  const entrees = []

  for (const [, corps] of lignes) {
    const cellules = [...corps.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1])
    if (cellules.length < 5) continue

    const numero = sansBalises(cellules[0])
    if (!/^\d+$/.test(numero)) continue

    const types = [...cellules[2].matchAll(/alt="Type ([^"]+)"/gi)].map((m) => m[1].toLowerCase())
    const specialites = sansBalises(cellules[4])
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && s !== '-')

    entrees.push({
      numero: numero.padStart(3, '0'),
      nom: sansBalises(cellules[1]).split('\n').pop().trim(),
      types,
      specialites,
    })
  }
  return entrees
}

const html = source
  ? fs.readFileSync(path.resolve(source), 'utf8')
  : await fetch(URL_SOURCE, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text())

const pokebip = extraire(html)
if (pokebip.length < 200) throw new Error(`extraction douteuse : ${pokebip.length} lignes`)
console.log(`Pokébip : ${pokebip.length} espèces`)

const parCle = new Map(pokebip.map((e) => [cle(e.nom), e]))

const nôtres = JSON.parse(fs.readFileSync(FICHIER, 'utf8'))
const rates = []
const ecarts = []

const suivant = nôtres.map((p) => {
  // « Sancoki (Mer Est) » et « Viskuse (mâle) » n'ont pas de ligne : la forme de base fait foi.
  const sansForme = p.fr.replace(/\s*\(.*\)\s*$/, '')
  const trouve = parCle.get(cle(p.fr)) || parCle.get(cle(sansForme))
  if (!trouve) {
    rates.push(`${p.fr} (${p.en})`)
    return p
  }
  if (p.numero && p.numero !== trouve.numero) ecarts.push(`${p.fr} : ${p.numero} → ${trouve.numero}`)
  return { ...p, numero: trouve.numero, types: trouve.types, specialites: trouve.specialites }
})

console.log(`appariés : ${nôtres.length - rates.length}/${nôtres.length}`)
if (ecarts.length) console.log(`\nnuméros corrigés (${ecarts.length}) :\n  ` + ecarts.join('\n  '))
if (rates.length) console.log(`\nsans correspondance (${rates.length}) :\n  ` + rates.join('\n  '))

const sansType = suivant.filter((p) => !p.types?.length).length
const sansSpecialite = suivant.filter((p) => !p.specialites?.length).length
console.log(`\nsans type : ${sansType} · sans spécialité : ${sansSpecialite}`)

if (!ecrire) {
  console.log('\nRien écrit. Relancer avec --ecrire pour appliquer.')
} else {
  fs.writeFileSync(FICHIER, JSON.stringify(suivant, null, 1))
  console.log('\nsrc/data/pokemon.json mis à jour.')
}
