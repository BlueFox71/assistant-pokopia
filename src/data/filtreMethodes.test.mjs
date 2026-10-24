import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filtrerMethodes } from './filtreMethodes.js'

const m = (en, famille = 'misc', sources = []) => ({ en, fr: en, famille, sources })
const liste = [m('Plate'), m('Bed', 'furniture'), m('Cup')]
const noms = (l) => l.map((x) => x.en)

test('« À trouver » cache les connues', () =>
  assert.deepEqual(noms(filtrerMethodes(liste, { vue: 'a-trouver', connues: new Set(['Plate']) })), ['Bed', 'Cup']))

test('« À trouver » garde visible ce qu’on vient de cocher', () =>
  assert.deepEqual(
    noms(filtrerMethodes(liste, { vue: 'a-trouver', connues: new Set(['Plate']), gardees: new Set(['Plate']) })),
    ['Plate', 'Bed', 'Cup'],
  ))

test('« Connues » et famille', () => {
  assert.deepEqual(noms(filtrerMethodes(liste, { vue: 'connues', connues: new Set(['Cup']) })), ['Cup'])
  assert.deepEqual(noms(filtrerMethodes(liste, { vue: 'toutes', connues: new Set(), famille: 'furniture' })), ['Bed'])
})

test('boutique d’une ville : triée par niveau', () => {
  const a = m('A', 'misc', [{ type: 'boutique', zone: 'grisemer', niveau: 4 }])
  const b = m('B', 'misc', [{ type: 'boutique', zone: 'grisemer', niveau: 2 }])
  assert.deepEqual(noms(filtrerMethodes([a, b], { vue: 'toutes', connues: new Set(), source: 'boutique-grisemer' })), ['B', 'A'])
})
