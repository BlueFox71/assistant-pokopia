import { IconePanier } from './Icones'
import { ajouter, cleLigne, retirer, useCourses } from '../utils/coursesStorage'

/** Une ligne non cochée pour cet objet ? Une ligne cochée a été prise : on peut la redemander. */
const useDansLesCourses = (type, nom) =>
  useCourses().some((l) => l.type === type && l.nom === nom && !l.coche)

/** Le bouton « ajouter aux courses » d'une fiche. Déjà dans la liste, il le dit et n'ajoute rien. */
export function BoutonCourses({ type = 'objet', nom }) {
  const dedans = useDansLesCourses(type, nom)
  return (
    <button
      type="button"
      className={'ghost-btn bouton-courses' + (dedans ? ' dedans' : '')}
      onClick={() => ajouter(type, nom)}
      disabled={dedans}
    >
      <IconePanier />
      {dedans ? 'Dans les courses' : 'Ajouter aux courses'}
    </button>
  )
}

/**
 * Le petit panier posé dans le coin d'une vignette ; un second clic le retire. `type` vaut
 * `methode` pour un bloc, qui n'a pas d'objet au catalogue (cf. coursesStorage.js).
 */
export function PanierVignette({ type = 'objet', nom }) {
  const dedans = useDansLesCourses(type, nom)
  return (
    <button
      type="button"
      className={'chip-panier' + (dedans ? ' dedans' : '')}
      onClick={() => (dedans ? retirer(cleLigne(type, nom)) : ajouter(type, nom))}
      aria-label={dedans ? 'Retirer des courses' : 'Ajouter aux courses'}
      title={dedans ? 'Dans les courses — cliquer pour retirer' : 'Ajouter aux courses'}
    >
      <IconePanier />
    </button>
  )
}
