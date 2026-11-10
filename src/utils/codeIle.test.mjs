import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codeComplet, extraireCode, formaterCode } from './codeIle.js'

test('mise en forme XXXX XXXX', () => {
  assert.equal(formaterCode('ab12cd34'), 'AB12 CD34')
  assert.equal(formaterCode(' ab12-cd34 '), 'AB12 CD34')
  assert.equal(formaterCode('ab1'), 'AB1')
  assert.equal(formaterCode('ab12c'), 'AB12 C')
  assert.equal(formaterCode('ab12cd34ef'), 'AB12 CD34')
})

test('code complet', () => {
  assert.ok(codeComplet('AB12 CD34'))
  assert.ok(!codeComplet('AB12 CD3'))
  assert.ok(!codeComplet(''))
})

test('code dans un texte collé', () => {
  assert.equal(extraireCode('Mon île : ab12-cd34 !'), 'AB12 CD34')
  assert.equal(extraireCode('AB12CD34'), 'AB12 CD34')
  assert.equal(extraireCode('rien ici'), null)
  assert.equal(extraireCode('ABCDEFGHIJ'), null)
})
