import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { _reinitialiser, basculer, connues, exporterMethodes, importerMethodes } from './methodesStorage.js'

/** Un localStorage en mémoire, remis à neuf avant chaque test. */
const memoire = (initial = {}) => {
  const d = { ...initial }
  return {
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => void (d[k] = String(v)),
    removeItem: (k) => void delete d[k],
    _d: d,
  }
}

beforeEach(() => {
  globalThis.localStorage = memoire()
  _reinitialiser()
})

test('cocher puis décocher', () => {
  basculer('Plate')
  assert.ok(connues().has('Plate'))
  assert.deepEqual(JSON.parse(localStorage.getItem('pokopia:methodes')), ['Plate'])
  basculer('Plate', false)
  assert.equal(connues().has('Plate'), false)
})

test('basculer sans second argument inverse', () => {
  basculer('Plate')
  basculer('Plate')
  assert.equal(connues().size, 0)
})

test('instantané stable entre deux écritures', () => assert.equal(connues(), connues()))

test('stockage corrompu → zéro coche', () => {
  globalThis.localStorage = memoire({ 'pokopia:methodes': '{oups' })
  _reinitialiser()
  assert.equal(connues().size, 0)
})

test('stockage qui lève → zéro coche, et cocher marche en mémoire', () => {
  globalThis.localStorage = {
    getItem() { throw new Error('bloqué') },
    setItem() { throw new Error('bloqué') },
  }
  _reinitialiser()
  assert.equal(connues().size, 0)
  basculer('Plate')
  assert.ok(connues().has('Plate'))
})

test('export puis import : ajoute, puis dit « déjà »', () => {
  basculer('Plate')
  const sauvegarde = exporterMethodes()
  assert.equal(JSON.parse(sauvegarde).format, 'pokopia:methodes')
  basculer('Plate', false)
  assert.deepEqual(importerMethodes(sauvegarde), { ajoutees: 1, deja: 0 })
  assert.deepEqual(importerMethodes(sauvegarde), { ajoutees: 0, deja: 1 })
})

test('import : JSON invalide ou autre format → erreur, rien de touché', () => {
  basculer('Plate')
  assert.ok(importerMethodes('pas du json').erreur)
  assert.ok(importerMethodes('{"format":"pokopia:habitats","habitats":[]}').erreur)
  assert.deepEqual([...connues()], ['Plate'])
})

test('import : un nom inconnu est conservé', () => {
  importerMethodes(JSON.stringify({ format: 'pokopia:methodes', version: 1, connues: ['Ancienne méthode'] }))
  assert.ok(connues().has('Ancienne méthode'))
})
