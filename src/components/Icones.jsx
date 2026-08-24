/**
 * Le jeu d'icônes de l'application, dessiné à la main.
 *
 * Des SVG inline plutôt qu'une police d'icônes ou une bibliothèque : tout doit rester
 * embarqué (l'application ne fait aucune requête réseau, exe compris), et une vingtaine de
 * formes simples pèsent moins qu'un paquet de plus. Chacune hérite de `currentColor` et se
 * dimensionne en `em`, donc une icône prend la couleur et la taille de son texte.
 */

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
