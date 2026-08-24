import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const SRC = process.argv[2]
const OUT = process.argv[3]

const lignes = fs.readFileSync(SRC, 'utf8').split('\n')
// Le bloc de données du script de l'artifact : `const DATA = [` jusqu'à la fin de FR_ITEM.
const debut = lignes.findIndex((l) => l.startsWith('const DATA = ['))
const fin = lignes.findIndex((l) => l.startsWith('/* ---------- derived indexes'))
if (debut < 0 || fin < 0) throw new Error('bornes introuvables')
const code = lignes.slice(debut, fin).join('\n')

const ctx = {}
vm.createContext(ctx)
vm.runInContext(code + '\n;globalThis.__out = {DATA,SPR,IMGI,IMGM,CATI,HABM,NOM,FR_CAT,FR_HAB,FR_PREF,FR_MON,FR_ITEM};', ctx)
const d = ctx.__out

console.log('préférences :', d.DATA.length)
console.log('sprites objets :', Object.keys(d.SPR.items).length, '| sprites pokémon :', Object.keys(d.SPR.mon).length)

const items = new Set(), mons = new Set()
for (const p of d.DATA) { p.i.forEach((x) => items.add(x)); p.p.forEach((x) => mons.add(x)) }
console.log('objets distincts :', items.size, '| pokémon distincts :', mons.size)
console.log('objets sans image :', [...items].filter((x) => !d.IMGI[x] || !d.SPR.items[d.IMGI[x]]).length)
console.log('pokémon sans image :', [...mons].filter((x) => !d.IMGM[x] || !d.SPR.mon[d.IMGM[x]]).length)
console.log('objets sans trad FR :', [...items].filter((x) => !d.FR_ITEM[x]).length)
console.log('pokémon sans trad FR :', [...mons].filter((x) => !d.FR_MON[x]).length)
console.log('pokémon sans numéro :', [...mons].filter((x) => !d.NOM[x]).length)
console.log('pokémon sans habitat :', [...mons].filter((x) => !d.HABM[x]).length)
console.log('objets sans catégorie :', [...items].filter((x) => !d.CATI[x]).length)

if (!OUT) process.exit(0)

// --- sprites, un fichier WebP par image ---
let n = 0, octets = 0
for (const [groupe, dossier] of [['items', 'objets'], ['mon', 'pokemon']]) {
  const dir = path.join(OUT, 'sprites', dossier)
  fs.mkdirSync(dir, { recursive: true })
  for (const [cle, dataUrl] of Object.entries(d.SPR[groupe])) {
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    const buf = Buffer.from(b64, 'base64')
    fs.writeFileSync(path.join(dir, cle + '.webp'), buf)
    n++; octets += buf.length
  }
}
console.log('sprites écrits :', n, '(' + Math.round(octets / 1024) + ' Ko)')

const json = (o) => JSON.stringify(o, null, 0)

fs.writeFileSync(path.join(OUT, 'preferences.json'), JSON.stringify(
  d.DATA.map((p) => ({ slug: p.s, en: p.en, fr: d.FR_PREF[p.s] || p.fr, objets: p.i, pokemon: p.p })),
  null, 1))

fs.writeFileSync(path.join(OUT, 'objets.json'), JSON.stringify(
  [...items].sort().map((x) => ({ en: x, fr: d.FR_ITEM[x] || x, categorie: d.CATI[x] || null, sprite: d.IMGI[x] || null })),
  null, 1))

fs.writeFileSync(path.join(OUT, 'pokemon.json'), JSON.stringify(
  [...mons].sort().map((x) => ({ en: x, fr: d.FR_MON[x] || x, numero: d.NOM[x] || null, habitat: d.HABM[x] || null, sprite: d.IMGM[x] || null })),
  null, 1))

console.log('JSON écrits dans', OUT)
