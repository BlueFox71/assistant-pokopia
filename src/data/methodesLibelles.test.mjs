import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleFiltre, libelleSource } from './methodesLibelles.js'

const villes = { grisemer: 'Grisemer', 'fonds-bulleux': 'Fonds Bulleux', collinangle: 'Collinangle' }
const nomVille = (cle) => villes[cle] || cle
const lib = (s) => libelleSource(s, nomVille)

test('boutique de zone', () => {
  assert.equal(lib({ type: 'boutique', zone: 'grisemer', niveau: 2, texte: '' }), 'Boutique – Grisemer niv. 2')
  assert.equal(lib({ type: 'boutique', zone: 'grisemer', niveau: 2, lot: true, texte: '' }), 'Boutique – Grisemer niv. 2, en lot')
  assert.equal(lib({ type: 'boutique', lot: 'Mountain House Recipe Set', texte: '' }), 'Boutique – lot « Mountain House Recipe Set »')
  assert.equal(lib({ type: 'boutique', texte: 'Shop' }), 'Boutique')
})

test('types simples', () => {
  assert.equal(lib({ type: 'offre-du-jour', texte: 'Daily Shop Special' }), 'Offre du jour')
  assert.equal(lib({ type: 'remous', texte: 'Sparkling Water' }), 'Remous scintillants')
  assert.equal(lib({ type: 'expansion', texte: 'Expansion Pass only' }), 'Expansion Pass')
  assert.equal(lib({ type: 'histoire', texte: 'From Chef Dente during the story' }), 'Histoire')
})

test('palier du Pokédex', () => {
  assert.equal(lib({ type: 'pokedex', niveau: 140, texte: '' }), 'Pokédex : 140 enregistrés')
  assert.equal(lib({ type: 'pokedex', zone: 'fonds-bulleux', niveau: 25, texte: '' }), 'Pokédex du bassin : 25 enregistrés')
})

test('autre : objet trouvé dans une zone, traductions connues, sinon le texte', () => {
  assert.equal(lib({ type: 'autre', zone: 'collinangle', texte: 'Rocky Ridges (Item)' }), 'Trouvée à Collinangle')
  assert.equal(lib({ type: 'autre', texte: 'After first getting paint' }), 'Après la première peinture')
  assert.equal(lib({ type: 'autre', texte: 'Talk to Slowpoke' }), 'Talk to Slowpoke')
})

test('clé de filtre : la boutique se range par zone', () => {
  assert.equal(cleFiltre({ type: 'boutique', zone: 'grisemer' }), 'boutique-grisemer')
  assert.equal(cleFiltre({ type: 'boutique' }), 'boutique')
  assert.equal(cleFiltre({ type: 'remous' }), 'remous')
  assert.equal(cleFiltre({ type: 'autre', zone: 'collinangle' }), 'autre')
})
