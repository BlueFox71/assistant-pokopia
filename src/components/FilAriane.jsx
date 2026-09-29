import { Link, useLocation } from 'react-router-dom'
import { frObjet, frPokemon, objetParNom, pokemonParNom } from '../data'
import { SIMULATIONS } from '../pages/simulations'
import { nomDeGroupe, useHabitats } from '../utils/habitatsStorage'
import { nomVille, useNomsVilles } from '../utils/villesStorage'
import { cleVilleValide } from '../data/villes'
import './FilAriane.css'

/** Les vues de premier niveau : leur adresse et leur nom dans le fil. */
const VUES = {
  habitat: 'Habitat',
  villes: 'Villes',
  preferences: 'Préférences',
  objets: 'Objets',
  pokedex: 'Pokédex',
  construction: 'Construction',
}

/**
 * Les étapes du fil pour une adresse : `{ libelle, to? }`, la dernière sans lien. Tout se
 * déduit de l'URL — chemin et paramètres —, comme les pages elles-mêmes : un lien partagé
 * donne le même fil.
 */
function etapes(pathname, params, { habitats, nomsVilles }) {
  const [vue, detail] = pathname.split('/').filter(Boolean)
  if (!vue) return []
  const fil = [{ libelle: 'Accueil', to: '/' }]

  // Une fiche d'objet vit sous /objet/:nom, mais se range sous la vue Objets.
  if (vue === 'objet') {
    const nom = decodeURIComponent(detail || '')
    fil.push({ libelle: VUES.objets, to: '/objets' })
    fil.push({ libelle: objetParNom.has(nom) ? frObjet(nom) : 'Objet inconnu' })
    return fil
  }

  const libelle = VUES[vue]
  if (!libelle) return []
  fil.push({ libelle, to: `/${vue}` })

  if (vue === 'pokedex' && detail) {
    const nom = decodeURIComponent(detail)
    fil.push({ libelle: pokemonParNom.has(nom) ? frPokemon(nom) : 'Pokémon inconnu' })
  }

  if (vue === 'construction') {
    const sim = SIMULATIONS.find((s) => s.cle === params.get('sim'))
    if (sim) fil.push({ libelle: sim.libelle, to: `/construction?sim=${sim.cle}` })
  }

  if (vue === 'villes') {
    const ville = params.get('ville')
    if (cleVilleValide(ville)) fil.push({ libelle: nomVille(nomsVilles, ville), to: `/villes?ville=${ville}` })
  }

  if (vue === 'habitat') {
    const id = params.get('habitat')
    const groupe = (params.get('pokemon') || '').split(',').filter((n) => pokemonParNom.has(n))
    if (id) {
      const h = habitats.find((x) => x.id === id)
      fil.push({ libelle: h ? h.nom : 'Habitat introuvable', to: `/habitat?habitat=${encodeURIComponent(id)}` })
    } else if (params.get('nouveau') === '1') {
      fil.push({ libelle: 'Nouvel habitat', to: '/habitat?nouveau=1' })
    } else if (groupe.length) {
      fil.push({ libelle: nomDeGroupe(groupe), to: `/habitat?pokemon=${groupe.join(',')}` })
    }
    if (params.get('choisir') === '1' && fil.length > 2) fil.push({ libelle: 'Ajouter un colocataire' })
  }

  // La dernière étape est la page où l'on est : pas de lien vers elle-même.
  const derniere = fil.at(-1)
  delete derniere.to
  return fil
}

/**
 * Le fil d'Ariane, sous l'en-tête : d'où vient la page, étape par étape, chaque étape
 * cliquable sauf la dernière. Absent de l'accueil, qui n'a rien au-dessus de lui.
 */
export default function FilAriane() {
  const { pathname, search } = useLocation()
  const habitats = useHabitats()
  const nomsVilles = useNomsVilles()
  const params = new URLSearchParams(search)
  const fil = etapes(pathname, params, { habitats, nomsVilles })
  if (fil.length < 2) return null

  // Le plan personnalisé prend toute la largeur de l'écran : le fil s'aligne sur lui.
  const large = pathname === '/construction' && SIMULATIONS.find((s) => s.cle === params.get('sim'))?.large

  return (
    <nav className={'wrap fil-ariane' + (large ? ' large' : '')} aria-label="Fil d’Ariane">
      <ol>
        {fil.map((e, i) => (
          <li key={i}>
            {e.to ? (
              <Link to={e.to}>{e.libelle}</Link>
            ) : (
              <span aria-current="page">{e.libelle}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
