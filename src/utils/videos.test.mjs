import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lireVideo } from './videos.js'

test('YouTube : watch, youtu.be, shorts, embed', () => {
  for (const lien of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://youtube.com/shorts/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ]) {
    const v = lireVideo(lien)
    assert.equal(v?.site, 'youtube', lien)
    assert.equal(v.id, 'dQw4w9WgXcQ')
    assert.equal(v.url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    assert.ok(v.miniature)
  }
})

test('TikTok : lien complet, lien court', () => {
  const v = lireVideo('Regarde ça https://www.tiktok.com/@quelquun/video/7301234567890123456?is_from_webapp=1')
  assert.equal(v.site, 'tiktok')
  assert.equal(v.id, '7301234567890123456')
  assert.equal(v.url, 'https://www.tiktok.com/@quelquun/video/7301234567890123456')
  assert.equal(v.embed, 'https://www.tiktok.com/embed/v2/7301234567890123456')

  const court = lireVideo('https://vm.tiktok.com/ZMabc123/')
  assert.equal(court.site, 'tiktok')
  assert.equal(court.id, null)
  assert.equal(court.embed, null)
  assert.equal(court.url, 'https://vm.tiktok.com/ZMabc123/')
})

test('rien de reconnu', () => {
  assert.equal(lireVideo('pas de lien'), null)
  assert.equal(lireVideo('https://www.google.com/search?q=pokopia'), null)
  assert.equal(lireVideo('https://www.youtube.com/'), null)
  assert.equal(lireVideo('https://evil-youtube.com/watch?v=dQw4w9WgXcQ'), null)
})
