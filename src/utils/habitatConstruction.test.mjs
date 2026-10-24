import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reglagesDeUrl, reglagesHabitat, reglagesVersUrl } from './habitatConstruction.js'

test('reglagesHabitat borne chaque réglage et remplace l’illisible par le défaut', () => {
  assert.deepEqual(reglagesHabitat({ largeur: 7, longueur: '9', hauteurMur: 3, portes: 2 }), {
    largeur: 7,
    longueur: 9,
    hauteurMur: 3,
    portes: 2,
  })
  assert.deepEqual(reglagesHabitat({ largeur: 99, longueur: 0, hauteurMur: 'x', portes: 40 }), {
    largeur: 10,
    longueur: 1,
    hauteurMur: 3,
    portes: 6,
  })
  assert.deepEqual(reglagesHabitat(), { largeur: 7, longueur: 8, hauteurMur: 3, portes: 1 })
})

test('reglagesVersUrl et reglagesDeUrl font l’aller-retour', () => {
  const reglages = { largeur: 5, longueur: 6, hauteurMur: 4, portes: 2 }
  const params = new URLSearchParams(Object.entries(reglagesVersUrl(reglages)).map(([k, v]) => [k, String(v)]))
  assert.deepEqual(reglagesDeUrl(params), reglages)
})
