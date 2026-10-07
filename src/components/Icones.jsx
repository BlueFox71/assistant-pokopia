/**
 * Le jeu d'icônes de l'application, dessiné à la main.
 *
 * Des SVG inline plutôt qu'une police d'icônes ou une bibliothèque : tout doit rester
 * embarqué (l'application ne fait aucune requête réseau, exe compris), et une vingtaine de
 * formes simples pèsent moins qu'un paquet de plus. Chacune hérite de `currentColor` et se
 * dimensionne en `em`, donc une icône prend la couleur et la taille de son texte.
 *
 * Exception : les villes et les spécialités portent les icônes du jeu lui-même, découpées
 * dans des captures (cf. « icônes du jeu », plus bas). Elles gardent leurs couleurs.
 */

import { urlIconeSpecialite, urlIconeVille } from '../data/images'

const Svg = ({ children, plein = false, ...reste }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill={plein ? 'currentColor' : 'none'}
    stroke={plein ? 'none' : 'currentColor'}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...reste}
  >
    {children}
  </svg>
)

/* ---------- identité ---------- */

/** Poké Ball : l'icône du Pokédex, et la marque. */
export const IconePokeball = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h6M15 12h6" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

/** Feuille : Pokopia, c'est une île qu'on fait reverdir. */
export const IconeFeuille = (p) => (
  <Svg {...p}>
    <path d="M20 4c0 8-4.5 12-11 12H5c0-7 4-12 11-12z" />
    <path d="M5 20c2-4 5-6.5 9-8" />
  </Svg>
)

/** Maison : un habitat, un enclos. */
export const IconeMaison = (p) => (
  <Svg {...p}>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 10v10h12V10" />
    <path d="M10 20v-5h4v5" />
  </Svg>
)

/** Liste à puces : l'index des préférences. */
export const IconeListe = (p) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
)

/** Caisse : le catalogue des objets. */
export const IconeCaisse = (p) => (
  <Svg {...p}>
    <path d="M3 8h18v12H3z" />
    <path d="M3 8 5.5 4h13L21 8" />
    <path d="M12 4v4M9 12h6" />
  </Svg>
)

/** Pinceau : ce que Smearguru peut repeindre. */
export const IconePinceau = (p) => (
  <Svg {...p}>
    <path d="M14.5 3.5 20.5 9.5 12 18H6v-6z" />
    <path d="M11 7 17 13" />
    <path d="M6 18l-2.5 2.5" />
  </Svg>
)

/** Crayon : poser des blocs sur le plan personnalisé. */
export const IconeCrayon = (p) => (
  <Svg {...p}>
    <path d="M4 20l1.2-4.4L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z" />
    <path d="M13.5 7.3l3.2 3.2" />
  </Svg>
)

/** Gomme : effacer des blocs, ou retirer un habitat. */
export const IconeGomme = (p) => (
  <Svg {...p}>
    <path d="M9.5 19.5 3.8 13.8a1.5 1.5 0 0 1 0-2.1l7.9-7.9a1.5 1.5 0 0 1 2.1 0l5.7 5.7a1.5 1.5 0 0 1 0 2.1l-7.9 7.9z" />
    <path d="M7.5 8 16 16.5" />
    <path d="M9.5 19.5H20" />
  </Svg>
)

/** Un trait en biais, deux points au bout : l'outil Ligne du plan. */
export const IconeLigne = (p) => (
  <Svg {...p}>
    <path d="M5 19 19 5" />
    <circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none" />
  </Svg>
)

/** Flèche de souris : le curseur du plan, qui ne fait rien au clic. */
export const IconeCurseur = (p) => (
  <Svg {...p}>
    <path d="M6 3.5v15l4-3.8 2.6 5.8 2.6-1.2-2.6-5.7H18z" />
  </Svg>
)

/** Rectangle en pointillés : l'outil Sélection du plan. */
export const IconeSelection = (p) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="14" rx="1" strokeDasharray="3 2.4" />
  </Svg>
)

/** Un carré : l'outil Carré du plan. */
export const IconeCarre = (p) => (
  <Svg {...p}>
    <rect x="4.5" y="4.5" width="15" height="15" rx="1" />
  </Svg>
)

/** Pot de peinture qui déborde : remplir une zone d'un coup. */
export const IconePeinture = (p) => (
  <Svg {...p}>
    <path d="M11 3.5 18.5 11l-6.8 6.8a1.5 1.5 0 0 1-2.1 0L4.2 12.4a1.5 1.5 0 0 1 0-2.1z" />
    <path d="M4.5 11h13.5" />
    <path d="M20 14.5s1.5 2 1.5 3a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3z" />
  </Svg>
)

/** Deux feuilles décalées : dupliquer une forme. */
export const IconeCopier = (p) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
    <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
  </Svg>
)

/** Flèche qui revient en arrière : défaire. */
export const IconeDefaire = (p) => (
  <Svg {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
)

/** Flèche qui repart en avant : refaire ce qu'on a défait. */
export const IconeRefaire = (p) => (
  <Svg {...p}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </Svg>
)

/** Disquette : enregistrer le plan. */
export const IconeEnregistrer = (p) => (
  <Svg {...p}>
    <path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    <path d="M8 4v5h7V4" />
    <rect x="8" y="13" width="8" height="7" />
  </Svg>
)

/** Disquette et un « + » : enregistrer une copie, sous un nouveau plan. */
export const IconeEnregistrerCopie = (p) => (
  <Svg {...p}>
    <path d="M13 20H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11l3 3v5" />
    <path d="M8 4v5h7V4" />
    <path d="M18 15v6M15 18h6" />
  </Svg>
)

/** Feuille blanche au coin plié, et un « + » : un nouveau plan vide. */
export const IconeNouveau = (p) => (
  <Svg {...p}>
    <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
    <path d="M14 3v4h4" />
    <path d="M12 11v6M9 14h6" />
  </Svg>
)

/** Deux flèches opposées : exporter et importer. */
export const IconeEchange = (p) => (
  <Svg {...p}>
    <path d="M7 20V5M3.5 8.5 7 5l3.5 3.5" />
    <path d="M17 4v15M13.5 15.5 17 19l3.5-3.5" />
  </Svg>
)

/** Flèche en arc, sens antihoraire : pivoter le plan d'un quart de tour vers la gauche. */
export const IconePivoterGauche = (p) => (
  <Svg {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4 4v4h4" />
  </Svg>
)

/** Flèche en arc, sens horaire : pivoter le plan d'un quart de tour vers la droite. */
export const IconePivoterDroite = (p) => (
  <Svg {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M20 4v4h-4" />
  </Svg>
)

export const IconeLoupe = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.5-4.5" />
  </Svg>
)

/* ---------- habitats ---------- */

export const IconeSoleil = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </Svg>
)

export const IconeLune = (p) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Svg>
)

export const IconeGoutte = (p) => (
  <Svg {...p}>
    <path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z" />
  </Svg>
)

/** Dune : l'habitat sec. */
export const IconeDune = (p) => (
  <Svg {...p}>
    <path d="M2 18c3 0 4-4 7-4s3.5 4 6.5 4 3.5-2 6.5-2" />
    <path d="M2 21h20" />
    <circle cx="17" cy="7" r="2.5" />
  </Svg>
)

export const IconeFlamme = (p) => (
  <Svg {...p}>
    <path d="M12 3c3 4 6 5.5 6 9.5A6 6 0 0 1 6 12.5C6 9 8 7 9 5c.5 2 1.5 3 3 4-.5-2 0-4 0-6z" />
  </Svg>
)

export const IconeFlocon = (p) => (
  <Svg {...p}>
    <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" />
    <path d="M9 4.5 12 7l3-2.5M9 19.5 12 17l3 2.5" />
  </Svg>
)

/* ---------- goûts préférés ---------- */

/** Bonbon : le sucré. */
export const IconeBonbon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M8.5 9.5 4 6v12l4.5-3.5" />
    <path d="M15.5 9.5 20 6v12l-4.5-3.5" />
  </Svg>
)

/** Piment : l'épicé. La flamme sert déjà à l'habitat chaud. */
export const IconePiment = (p) => (
  <Svg {...p}>
    <path d="M14 6c4 0 6 3 6 6.5 0 4-3.5 7-8 7-3.5 0-6-2-6-4.5 0-3 2.5-4 5-5s3-2.5 3-4z" />
    <path d="M14 6c0-1.5 1-3 3-3" />
  </Svg>
)

/** Tranche d'agrume : l'acide. */
export const IconeAgrume = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="1" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
  </Svg>
)

/** Tasse fumante : l'amer, celui du café et des infusions. */
export const IconeTasse = (p) => (
  <Svg {...p}>
    <path d="M4 10h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5z" />
    <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
    <path d="M8 3v3M12 3v3" />
  </Svg>
)

/** Épi de blé : le sec. La dune sert déjà à l'habitat sec. */
export const IconeEpi = (p) => (
  <Svg {...p}>
    <path d="M12 21V8" />
    <path d="M12 8c0-2.5 1.5-4.5 3.5-5.5C16 5 14.5 7 12 8z" />
    <path d="M12 13c0-2 1.5-3.5 3.5-4C16 11 14.5 12.5 12 13z" />
    <path d="M12 18c0-2 1.5-3.5 3.5-4C16 16 14.5 17.5 12 18z" />
    <path d="M12 13c0-2-1.5-3.5-3.5-4C8 11 9.5 12.5 12 13z" />
    <path d="M12 18c0-2-1.5-3.5-3.5-4C8 16 9.5 17.5 12 18z" />
  </Svg>
)

/* ---------- catégories de meuble ---------- */

export const IconeLit = (p) => (
  <Svg {...p}>
    <path d="M3 18v-7h18v7" />
    <path d="M3 18v2M21 18v2M3 11V7" />
    <path d="M7 11V9h5v2" />
  </Svg>
)

export const IconeChaise = (p) => (
  <Svg {...p}>
    <path d="M7 3v10M17 3v10" />
    <path d="M6 13h12" />
    <path d="M8 13v8M16 13v8" />
  </Svg>
)

export const IconeCanape = (p) => (
  <Svg {...p}>
    <path d="M4 12V9a2 2 0 0 1 4 0v3M16 12V9a2 2 0 0 1 4 0v3" />
    <path d="M4 12h16v5H4z" />
    <path d="M6 17v3M18 17v3" />
  </Svg>
)

export const IconeTable = (p) => (
  <Svg {...p}>
    <path d="M2 9h20" />
    <path d="M5 9v11M19 9v11" />
    <path d="M4 6h16v3H4z" />
  </Svg>
)

export const IconeCommode = (p) => (
  <Svg {...p}>
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <path d="M4 9h16M4 15h16" />
    <path d="M11 6h2M11 12h2M11 18h2" />
  </Svg>
)

export const IconeLampe = (p) => (
  <Svg {...p}>
    <path d="M8 10 12 3l4 7z" />
    <path d="M12 10v8" />
    <path d="M8.5 21h7" />
  </Svg>
)

export const IconeEcran = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M9 20h6M12 16v4" />
  </Svg>
)

/** Robinet : le mobilier utilitaire — sanitaire, cuisine, électroménager. */
export const IconeRobinet = (p) => (
  <Svg {...p}>
    <path d="M7 10V7a3 3 0 0 1 6 0v1h5v2" />
    <path d="M18 10v3a6 6 0 0 1-6 6" />
    <path d="M4 10h6" />
    <path d="M12 19v2" />
  </Svg>
)

export const IconePlante = (p) => (
  <Svg {...p}>
    <path d="M12 20v-8" />
    <path d="M12 12C9 12 7 10 7 6c4 0 5 2 5 6z" />
    <path d="M12 14c3 0 5-1.5 5-5-4 0-5 1.5-5 5z" />
    <path d="M8 20h8" />
  </Svg>
)

/** Étoile : les décorations, tout ce qui orne sans servir. */
export const IconeEtoile = (p) => (
  <Svg {...p}>
    <path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8 6.6 19.7l1.2-6.1L3.3 9.4l6.1-.8z" />
  </Svg>
)

/** Tableau accroché à son clou : le filtre des objets muraux. */
export const IconeCadre = (p) => (
  <Svg {...p}>
    <path d="M8.5 8 12 4l3.5 4" />
    <rect x="4" y="8" width="16" height="12" rx="1" />
    <path d="m7 17 3.5-4 2.5 2.5 1.5-1.5L17 17" />
  </Svg>
)

/** Os : les fossiles. */
export const IconeOs = (p) => (
  <Svg {...p}>
    <path d="M7.5 6.5a2.2 2.2 0 1 0-2 2.2l7.8 7.8a2.2 2.2 0 1 0 2.2 2 2.2 2.2 0 1 0 2-2.2L9.7 8.5a2.2 2.2 0 1 0-2.2-2z" />
  </Svg>
)

/** Rondin : les matériaux et ressources. */
export const IconeRondin = (p) => (
  <Svg {...p}>
    <path d="M6 5h12a3 3 0 0 1 0 14H6a3 3 0 0 1 0-14z" />
    <ellipse cx="6" cy="12" rx="3" ry="7" />
    <circle cx="6" cy="12" r="1.5" />
  </Svg>
)

/** Mur de briques : la vue Construction. */
export const IconeBriques = (p) => (
  <Svg {...p}>
    <path d="M3 5h18v14H3z" />
    <path d="M3 9.7h18M3 14.3h18" />
    <path d="M12 5v4.7M7.5 9.7v4.6M16.5 9.7v4.6M12 14.3V19" />
  </Svg>
)

/** Escalier vu de profil, trois marches : le générateur d'escalier. */
export const IconeEscalier = (p) => (
  <Svg {...p}>
    <path d="M3 20h18V5h-5v5h-5v5H6v5" />
  </Svg>
)

/* ---------- villes ---------- */

/** Terrasses cultivées : Terrassec, la région de départ. */
export const IconeTerrasse = (p) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <path d="M3 21v-4h5v-4h5v-4h5V5" />
  </Svg>
)

/* ---------- icônes du jeu ---------- */

/**
 * Une image du jeu (cf. data/images.js), dans un `<svg>` de 1em : elle se dimensionne
 * alors comme les icônes dessinées, et les règles `… svg { font-size }` des feuilles de
 * style valent pour elle sans qu'on les double. Elle garde ses couleurs.
 */
const ImageJeu = ({ url, className = '', ...reste }) =>
  url ? (
    <svg
      viewBox="0 0 64 64"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      className={('icone-jeu ' + className).trim()}
      {...reste}
    >
      <image href={url} width="64" height="64" preserveAspectRatio="xMidYMid meet" />
    </svg>
  ) : null

/** L'icône d'une ville, découpée dans le jeu ; IconeTerrasse reste celle de l'onglet Villes. */
const iconeVille = (cle) => {
  const Icone = (p) => <ImageJeu url={urlIconeVille(cle)} {...p} />
  return Icone
}

/** L'icône d'une spécialité, d'après son nom français ; rien si elle est inconnue. */
export const IconeSpecialite = ({ nom, ...p }) => <ImageJeu url={urlIconeSpecialite(nom)} {...p} />

/* ---------- index par clé ---------- */

/** Habitat idéal : les clés sont celles des données (Bright, Dark…). */
export const ICONE_HABITAT = {
  Bright: IconeSoleil,
  Dark: IconeLune,
  Humid: IconeGoutte,
  Dry: IconeDune,
  Warm: IconeFlamme,
  Cool: IconeFlocon,
}

/** Goût préféré : les clés sont celles de GOUTS, dans src/data/index.js. */
export const ICONE_GOUT = {
  sweet: IconeBonbon,
  spicy: IconePiment,
  sour: IconeAgrume,
  bitter: IconeTasse,
  dry: IconeEpi,
}

/** Ville de l'île : les clés sont celles de data/villes.js. */
export const ICONE_VILLE = {
  terrassec: iconeVille('terrassec'),
  grisemer: iconeVille('grisemer'),
  collinangle: iconeVille('collinangle'),
  flotiles: iconeVille('flotiles'),
  'ville-nouvelle': iconeVille('ville-nouvelle'),
  'fonds-bulleux': iconeVille('fonds-bulleux'),
}

/** Catégorie de meuble : les clés sont celles de data/categories.js. */
export const ICONE_CATEGORIE = {
  lit: IconeLit,
  chaise: IconeChaise,
  canape: IconeCanape,
  table: IconeTable,
  commode: IconeCommode,
  lumiere: IconeLampe,
  ecran: IconeEcran,
  meuble: IconeRobinet,
  plante: IconePlante,
  decoration: IconeEtoile,
  fossile: IconeOs,
  ressource: IconeRondin,
}
