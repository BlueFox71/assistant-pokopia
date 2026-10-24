import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  _reinitialiser,
  ajouter,
  assainirQuantite,
  changerQuantite,
  cleLigne,
  cocher,
  courses,
  retirer,
  retirerCochees,
} from './coursesStorage.js'

/** Un localStorage en mémoire, remis à neuf avant chaque test. */
const memoire = (initial = {}) => {
  const d = { ...initial }
  return {
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => void (d[k] = String(v)),
    removeItem: (k) => void delete d[k],
  }
}

beforeEach(() => {
  globalThis.localStorage = memoire()
  _reinitialiser()
})

test('ajouter une ligne, avec ou sans quantité', () => {
  assert.equal(ajouter('objet', 'Plain chest', 3), true)
  assert.equal(ajouter('methode', 'Stone wall'), true)
  assert.deepEqual(courses(), [
    { type: 'objet', nom: 'Plain chest', quantite: 3, coche: false },
    { type: 'methode', nom: 'Stone wall', quantite: null, coche: false },
  ])
  assert.equal(JSON.parse(localStorage.getItem('pokopia:courses')).length, 2)
})

test('pas de doublon ; redemander une ligne cochée la décoche', () => {
  ajouter('objet', 'Plain chest', 3)
  cocher(cleLigne('objet', 'Plain chest'))
  assert.equal(ajouter('objet', 'Plain chest', 8), false)
  assert.deepEqual(courses(), [{ type: 'objet', nom: 'Plain chest', quantite: 3, coche: false }])
})

test('le même nom sous deux types fait deux lignes', () => {
  ajouter('objet', 'Log')
  ajouter('texte', 'Log')
  assert.equal(courses().length, 2)
})

test('texte vide ou type inconnu refusés', () => {
  assert.equal(ajouter('texte', '   '), false)
  assert.equal(ajouter('pokemon', 'Pikachu'), false)
  assert.equal(courses().length, 0)
})

test('quantité : entier positif, sinon rien', () => {
  assert.equal(assainirQuantite(''), null)
  assert.equal(assainirQuantite(0), null)
  assert.equal(assainirQuantite(-2), null)
  assert.equal(assainirQuantite('12'), 12)
  assert.equal(assainirQuantite(2.7), 2)
  assert.equal(assainirQuantite(123456), 9999)
  ajouter('texte', 'Bois')
  changerQuantite(cleLigne('texte', 'Bois'), 40)
  assert.equal(courses()[0].quantite, 40)
  changerQuantite(cleLigne('texte', 'Bois'), null)
  assert.equal(courses()[0].quantite, null)
})

test('cocher, retirer, retirer les cochées', () => {
  ajouter('texte', 'A')
  ajouter('texte', 'B')
  ajouter('texte', 'C')
  cocher(cleLigne('texte', 'A'))
  cocher(cleLigne('texte', 'C'), true)
  retirer(cleLigne('texte', 'B'))
  assert.deepEqual(courses().map((l) => l.nom), ['A', 'C'])
  retirerCochees()
  assert.equal(courses().length, 0)
})

test('instantané stable entre deux écritures', () => assert.equal(courses(), courses()))

test('stockage corrompu → liste vide ; lignes invalides écartées', () => {
  globalThis.localStorage = memoire({ 'pokopia:courses': '{oups' })
  _reinitialiser()
  assert.equal(courses().length, 0)

  globalThis.localStorage = memoire({
    'pokopia:courses': JSON.stringify([
      { type: 'objet', nom: 'Plain chest', quantite: 'x', coche: 'oui' },
      { type: 'objet', nom: 'Plain chest' },
      { type: 'inconnu', nom: 'X' },
      null,
    ]),
  })
  _reinitialiser()
  assert.deepEqual(courses(), [{ type: 'objet', nom: 'Plain chest', quantite: null, coche: false }])
})
