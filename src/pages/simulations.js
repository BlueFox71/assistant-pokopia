/**
 * Les simulations de la vue Construction, sans leurs composants : l'en-tête en tire son
 * sous-menu sans charger les générateurs, et la page les associe à leur composant par `cle`
 * (cf. ConstructionPage.jsx). Chaque simulation se lit dans l'URL : `?sim=<cle>`.
 */
export const SIMULATIONS = [
  {
    cle: 'habitat',
    libelle: 'Générateur d’habitat',
    chapeau:
      'Une largeur, une longueur : le jeu reconnaîtra-t-il la maison ? La surface intérieure avec et sans sa bordure, l’emprise au sol, les blocs de mur à prévoir, et toutes les tailles acceptées.',
  },
  {
    cle: 'formes',
    libelle: 'Générateur de formes',
    chapeau:
      'Un cercle, un carré, un losange, une étoile… de la taille voulue, dessiné bloc par bloc, avec le nombre de blocs à prévoir et le détail de chaque rangée.',
  },
  {
    cle: 'escalier',
    libelle: 'Générateur d’escalier',
    chapeau:
      'Un dénivelé à franchir : l’escalier vu de profil, marche par marche, avec sa longueur au sol et le nombre de blocs à prévoir.',
  },
  {
    cle: 'plan',
    // On y dessine : la page prend toute la largeur de l'écran, au lieu de la colonne
    // de lecture des autres vues.
    large: true,
    libelle: 'Plan personnalisé',
    chapeau:
      'Une grille vierge, à remplir à la main : case par case, en ligne ou en carré. Le compte des blocs suit chaque tracé.',
  },
]

/** L'adresse d'une simulation. */
export const urlSimulation = (cle) => `/construction?sim=${cle}`
