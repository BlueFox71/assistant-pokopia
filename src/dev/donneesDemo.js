import { pokemon, objets } from '../data'
import methodesJson from '../data/methodes.json'

/**
 * Des données de démonstration, pour voir l'app « habitée » pendant le développement :
 * quelques habitats, une liste de courses, des méthodes connues et une ville renommée.
 *
 * Chargé par main.jsx en mode dev SEULEMENT (la branche disparaît du build), et seulement
 * sur demande : `?demo` dans l'adresse, ou `VITE_DEMO=1` au lancement
 * (`VITE_DEMO=1 npm run desktop:dev` pour la fenêtre Tauri).
 *
 * Ne remplit que les clés VIDES : des données déjà saisies ne sont jamais écrasées. Pour
 * repartir de zéro, vider le stockage du site (`localStorage.clear()` dans la console), puis
 * relancer avec `?demo`.
 *
 * Les noms viennent des vraies données, choisis à pas fixe plutôt qu'au hasard : la démo
 * est la même à chaque fois, et chaque entrée passe les `assainir` des magasins.
 */

const vide = (cle) => {
  const v = localStorage.getItem(cle)
  return v === null || v === '[]' || v === '{}'
}

function habitats() {
  // Des colocataires qui partagent un habitat du jeu : la démo reste vraisemblable.
  const parHabitat = new Map()
  for (const p of pokemon) {
    if (!p.habitat) continue
    if (!parHabitat.has(p.habitat)) parHabitat.set(p.habitat, [])
    parHabitat.get(p.habitat).push(p.en)
  }
  const tailles = [4, 2, 3, 1, 4, 2, 3]
  const groupes = [...parHabitat.values()].filter((g) => g.length >= 4).slice(0, tailles.length)
  const maintenant = Date.now()
  return groupes.map((g, i) => ({
    id: `demo-habitat-${i}`,
    pokemon: g.slice(i % g.length).concat(g).slice(0, tailles[i]),
    creeLe: maintenant - i * 86_400_000,
  }))
}

function courses() {
  const pas = Math.floor(objets.length / 6)
  const choisis = [0, 1, 2, 3, 4].map((i) => objets[i * pas + 7]?.en).filter(Boolean)
  const methodes = methodesJson.methodes.filter((m) => !m.objet).slice(0, 2)
  return [
    ...choisis.map((nom, i) => ({ type: 'objet', nom, quantite: [2, null, 5, 1, 12][i], coche: i === 1 })),
    ...methodes.map((m, i) => ({ type: 'methode', nom: m.en, quantite: i ? 20 : 40, coche: false })),
    { type: 'texte', nom: 'Bois flotté pour la terrasse', quantite: 8, coche: false },
  ]
}

const methodesConnues = () =>
  methodesJson.methodes.filter((_, i) => i % 3 === 0 || i % 7 === 1).map((m) => m.en)

const SEMIS = {
  'pokopia:habitats': habitats,
  'pokopia:courses': courses,
  'pokopia:methodes': methodesConnues,
  'pokopia:villes:noms': () => ({ 'ville-nouvelle': 'Bourg-Lagon' }),
}

/** Sème les données de démo si on le demande ; sans effet sinon. */
export function semerSiDemande() {
  const demande =
    /[?&]demo\b/.test(window.location.search) ||
    /[?&]demo\b/.test(window.location.hash) ||
    import.meta.env.VITE_DEMO === '1'
  if (!demande) return
  try {
    const semees = []
    for (const [cle, fabriquer] of Object.entries(SEMIS)) {
      if (!vide(cle)) continue
      localStorage.setItem(cle, JSON.stringify(fabriquer()))
      semees.push(cle)
    }
    console.info('[démo] clés remplies :', semees.length ? semees.join(', ') : 'aucune (déjà remplies)')
  } catch (e) {
    console.warn('[démo] stockage indisponible', e)
  }
}
