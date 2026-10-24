import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleNom, sources } from './methodes.mjs'

test('boutique de zone avec niveau', () =>
  assert.deepEqual(sources('Shop - Bleak Beach Lv. 2'), [
    { type: 'boutique', zone: 'grisemer', niveau: 2, texte: 'Shop - Bleak Beach Lv. 2' },
  ]))

test('variantes d’orthographe de zone', () => {
  assert.equal(sources('Shop  - Sparkly Skylands Lv. 3')[0].zone, 'flotiles')
  assert.equal(sources('Shop - Withered Wasteland Lv. 1')[0].zone, 'terrassec')
})

test('lot', () => {
  assert.equal(sources('Shop (as bundle) - Palette Town Lv. 2')[0].lot, true)
  assert.equal(sources('Shop as bundle (Sparkling Skylands Lv. 4)')[0].lot, true)
  assert.equal(sources('Shop (as bundle) - Mountain House Recipe Set')[0].lot, 'Mountain House Recipe Set')
  assert.equal(sources('Shop - Withered Wastelands Lv. 3 (Wooden Construction Set)')[0].lot, 'Wooden Construction Set')
})

test('offre du jour, casse libre et condition', () => {
  assert.equal(sources('Daily shop special')[0].type, 'offre-du-jour')
  assert.equal(sources('Daily shop special after Treasure Map found')[0].type, 'offre-du-jour')
  assert.equal(sources('In Daily Specials in shop after finishing Palette Town Challenge')[0].type, 'offre-du-jour')
})

test('remous', () => {
  for (const t of ['Sparkling Water', 'Sparkling ripples in water', 'Random chance in whirlpools'])
    assert.equal(sources(t)[0].type, 'remous')
})

test('deux sources dans un texte', () =>
  assert.deepEqual(
    sources('Bubbly Basin whirlpools or daily shop special').map((s) => s.type),
    ['remous', 'offre-du-jour'],
  ))

test('expansion, histoire', () => {
  assert.equal(sources('Expansion Pass only')[0].type, 'expansion')
  assert.equal(sources('From Chef Dente during the story')[0].type, 'histoire')
  assert.equal(sources('Beginning')[0].type, 'histoire')
})

test('inconnu → autre, texte gardé', () =>
  assert.deepEqual(sources('Obtain a Vine rope'), [{ type: 'autre', texte: 'Obtain a Vine rope' }]))

test('objet trouvé dans une zone → autre avec zone', () =>
  assert.deepEqual(sources('Rocky Ridges (Item)'), [
    { type: 'autre', zone: 'collinangle', texte: 'Rocky Ridges (Item)' },
  ]))

test('cleNom', () => {
  assert.equal(cleNom('Pok&eacute; Ball Chest'), cleNom('Poké Ball chest'))
  assert.equal(cleNom('Adventure Kit'), cleNom('Adventure kit'))
  assert.equal(cleNom('Pikachu&#39;s bed'), cleNom('Pikachu’s bed'))
})

test('palier du Pokédex, coquilles comprises', () => {
  assert.deepEqual(sources('Register 140 Pokémon'), [{ type: 'pokedex', niveau: 140, texte: 'Register 140 Pokémon' }])
  assert.equal(sources('Regsiter 240 Pokémon')[0].niveau, 240)
  assert.equal(sources('Register 25 Pokémon in the Pokédex')[0].type, 'pokedex')
  assert.deepEqual(sources('Basin Pokédex - 25 Registered'), [
    { type: 'pokedex', zone: 'fonds-bulleux', niveau: 25, texte: 'Basin Pokédex - 25 Registered' },
  ])
})

test('demandes et quêtes → histoire', () => {
  for (const t of ["Complete Bulbasaur's request", 'During Poliwrath quest line', "Start Mudkip's Request after building temple", 'During quest to make a picnic'])
    assert.equal(sources(t)[0].type, 'histoire', t)
})

test('hasard de l’offre du jour', () => assert.equal(sources('Random chance in Daily shop')[0].type, 'offre-du-jour'))
