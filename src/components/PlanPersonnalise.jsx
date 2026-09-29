import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Segmented } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import {
  COTE_DEFAUT,
  COTE_MAX,
  COTE_MIN,
  NIVEAUX_MAX,
  TYPES_BLOC,
  TYPE_DEFAUT,
  analyserEnclos,
  casesLigne,
  casesRectangle,
  cle,
  colorier,
  composante,
  copier,
  ecrirePlan,
  lireNiveaux,
  lirePlan,
  niveauVide,
  pivoter,
  pivoterCouleurs,
  pivoterCopie,
  pivoterOccupants,
  placerCopie,
  typeDe,
  zoneMemeType,
} from '../utils/planPerso'
import { INTERIEUR_MAX, INTERIEUR_MIN } from '../utils/habitatConstruction'
import {
  IconeCarre,
  IconeCopier,
  IconeCrayon,
  IconeCurseur,
  IconeDefaire,
  IconeGomme,
  IconeLigne,
  IconeLoupe,
  IconeMaison,
  IconePeinture,
  IconePivoterDroite,
  IconePivoterGauche,
  IconeRefaire,
  IconeLune,
  IconeSelection,
  IconeSoleil,
} from './Icones'
import HabitatsDuPlan, { nomHabitat } from './HabitatsDuPlan'
import MesPlans from './MesPlans'
import { Chiffre, Dimension, Grille } from './OutilsConstruction'
import { useTheme } from '../context/ThemeContext'
import { pokemonParNom, spritePokemon } from '../data'
import { urlSpritePokemon } from '../data/images'

/**
 * La boîte à outils, comme dans un logiciel de dessin : une icône par outil, le mot dessous
 * et en infobulle (`title`), un seul outil pris à la fois.
 *
 * Crayon et gomme tracent à main levée, de la même épaisseur réglable. Les autres posent par défaut, et s'effacent au choix dans leurs
 * réglages (cf. ACTIONS).
 */
const OUTILS = [
  { value: 'curseur', label: 'Curseur', title: 'Curseur : survoler sans rien modifier', Icone: IconeCurseur },
  { value: 'crayon', label: 'Crayon', title: 'Crayon : à main levée, de l’épaisseur choisie', Icone: IconeCrayon },
  { value: 'gomme', label: 'Gomme', title: 'Gomme : effacer à main levée', Icone: IconeGomme },
  { value: 'peinture', label: 'Peinture', title: 'Pot de peinture : remplir une zone d’un clic', Icone: IconePeinture },
  { value: 'ligne', label: 'Ligne', Icone: IconeLigne },
  { value: 'carre', label: 'Carré', Icone: IconeCarre },
  { value: 'habitat', label: 'Habitat', Icone: IconeMaison },
  { value: 'dupliquer', label: 'Dupliquer', Icone: IconeCopier },
  { value: 'selection', label: 'Sélection', title: 'Sélection : encadrer une zone, la déplacer, l’effacer', Icone: IconeSelection },
]

/**
 * Le thème de la grille seule, à part de celui de l'application : on dessine peut-être mieux
 * sur fond sombre dans une page claire. null suit l'application. Une préférence de ce
 * navigateur, pas une donnée du plan.
 */
const CLE_THEME_GRILLE = 'pokopia:plan-grille'
const lireThemeGrille = () => {
  try {
    const v = localStorage.getItem(CLE_THEME_GRILLE)
    return v === 'clair' || v === 'sombre' ? v : null
  } catch {
    return null
  }
}

/** Montrer ou non les sprites des Pokémon prévus sur la grille : une préférence du navigateur. */
const CLE_SPRITES_GRILLE = 'pokopia:plan-sprites'
const lireSpritesGrille = () => {
  try {
    return localStorage.getItem(CLE_SPRITES_GRILLE) !== 'non'
  } catch {
    return true
  }
}

/** Une case est-elle dans un rectangle { x0, y0, x1, y1 } ? */
const dansRect = (r, { x, y }) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1

/** Le rectangle tendu entre deux coins, bornes rangées. */
const rectDe = (a, b) => ({
  x0: Math.min(a.x, b.x),
  y0: Math.min(a.y, b.y),
  x1: Math.max(a.x, b.x),
  y1: Math.max(a.y, b.y),
})

/** Les outils rangés par famille, un espace entre deux : curseur, tracer, formes, habitat, édition. */
const GROUPES_OUTILS = [
  { nom: 'Curseur', outils: ['curseur'] },
  { nom: 'Tracer', outils: ['crayon', 'gomme', 'peinture'] },
  { nom: 'Formes', outils: ['ligne', 'carre'] },
  { nom: 'Habitat', outils: ['habitat'] },
  { nom: 'Édition', outils: ['selection', 'dupliquer'] },
]
const outilParValeur = new Map(OUTILS.map((o) => [o.value, o]))

/** Les outils à main levée : le tracé case par case, qui pose ou efface selon l'outil. */
const MAIN_LEVEE = { crayon: 'poser', gomme: 'effacer' }

/** Poser ou effacer avec une forme — ligne, carré, pot de peinture, habitat, copie. */
const ACTIONS = [
  { value: 'poser', label: 'Poser' },
  { value: 'effacer', label: 'Effacer' },
]

const REMPLISSAGES = [
  { value: 'contour', label: 'Contour' },
  { value: 'plein', label: 'Plein' },
]

/** Les deux façons de faire un habitat : marquer un enclos existant, ou le tracer d'un geste. */
const METHODES = [
  { value: 'remplir', label: 'Remplir un enclos' },
  { value: 'dessiner', label: 'Dessiner un habitat' },
]

const [MAX_PETIT, MAX_GRAND] = INTERIEUR_MAX

/** Pourquoi une zone n'est pas un habitat, en une phrase. */
function raisonRefus(r) {
  const dims = `${r.largeur} × ${r.longueur}`
  switch (r.statut) {
    case 'mur':
      return 'Cliquez dans le vide à l’intérieur d’un enclos, pas sur un bloc.'
    case 'ouvert':
      return 'Cette zone n’est pas fermée : elle rejoint le bord de la grille. Entourez-la de blocs sur ses quatre côtés.'
    case 'forme':
      return `L’intérieur n’est pas un rectangle (${r.zone.size} cases dans un ${dims}) : le jeu ne reconnaît que les espaces clos rectangulaires.`
    case 'occupe':
      return 'L’intérieur contient déjà des blocs : videz-le, ou dessinez l’habitat ailleurs.'
    case 'petit':
      return `Trop petit : l’intérieur fait ${dims}, il faut au moins ${INTERIEUR_MIN} × ${INTERIEUR_MIN}.`
    case 'grand':
      return `Trop grand : l’intérieur fait ${dims}, le maximum est ${MAX_PETIT} × ${MAX_GRAND}. Une cloison en ferait deux habitats.`
    default:
      return ''
  }
}

const lireCase = (k) => {
  const [x, y] = k.split(',').map(Number)
  return { x, y }
}

/** Le pinceau le plus large, en cases de côté : au-delà, autant tracer un carré plein. */
const PINCEAU_MAX = 5

/** Au-delà, on oublie les plus anciens : cent retours en arrière suffisent largement. */
const HISTORIQUE_MAX = 100

/**
 * Le plan personnalisé : une grille carrée à remplir à la main, bloc par bloc.
 *
 * Trois outils de dessin — case par case, ligne, carré —, chacun pour poser ou effacer. Un
 * tracé ne s'applique qu'au relâchement : jusque-là, la grille en montre l'aperçu, et c'est
 * un seul retour en arrière qui l'annule en entier.
 *
 * Le quatrième, « Habitat », ne pose rien : il marque l'intérieur d'un enclos comme maison,
 * si les règles du jeu l'acceptent (cf. analyserEnclos), et dit pourquoi sinon. Un habitat
 * marqué se relit à chaque tracé : effacer un de ses murs le signale aussitôt.
 *
 * Chaque habitat valide reçoit un numéro, et peut accueillir des Pokémon (cf.
 * HabitatsDuPlan) : un projet propre au plan, qui ne touche pas à « Mes habitats ».
 *
 * Le plan en cours est gardé dans le navigateur à chaque tracé (cf. utils/planPerso.js),
 * pas dans l'URL : quelques centaines de cases n'y tiendraient pas. Pour en garder
 * plusieurs et les reprendre plus tard, on les enregistre sous un nom (cf. MesPlans).
 */
export default function PlanPersonnalise() {
  const [initial] = useState(lirePlan)
  const [cote, setCote] = useState(initial?.cote ?? COTE_DEFAUT)
  // Les étages du plan, le sol d'abord (cf. planPerso.js), et celui qu'on dessine. Chacun a
  // ses blocs, ses couleurs — le type de chaque bloc qui n'est pas un mur (cf. TYPES_BLOC)
  // —, ses habitats et leurs Pokémon prévus : case de l'habitat → noms.
  const [niveaux, setNiveaux] = useState(() => initial?.niveaux ?? [niveauVide()])
  const [courant, setCourant] = useState(0)
  const { sombre: appliSombre } = useTheme() ?? {}
  const [themeGrille, setThemeGrille] = useState(lireThemeGrille)
  const grilleSombre = themeGrille ? themeGrille === 'sombre' : !!appliSombre
  const basculerThemeGrille = () => {
    // Revenir au thème de l'application, c'est ne plus rien forcer.
    const voulu = grilleSombre ? 'clair' : 'sombre'
    const suivant = (voulu === 'sombre') === !!appliSombre ? null : voulu
    setThemeGrille(suivant)
    try {
      if (suivant) localStorage.setItem(CLE_THEME_GRILLE, suivant)
      else localStorage.removeItem(CLE_THEME_GRILLE)
    } catch {
      /* navigation privée : le choix vaut pour la session */
    }
  }
  // « Grille entière » : la grille se réduit à la hauteur qui reste sous elle, pour tenir
  // dans l'écran sans défiler. On mesure plutôt que de deviner, la tête de page variant
  // avec le nom du plan, les messages et la largeur de fenêtre.
  const zoneRef = useRef(null)
  const [ajuste, setAjuste] = useState(false)
  useLayoutEffect(() => {
    const zone = zoneRef.current
    if (!ajuste || !zone) return
    const mesurer = () => {
      const haut = zone.getBoundingClientRect().top + window.scrollY
      zone.style.setProperty('--haut-dispo', `${Math.max(240, window.innerHeight - haut - 16)}px`)
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [ajuste])
  const [spritesGrille, setSpritesGrille] = useState(lireSpritesGrille)
  const changerSpritesGrille = (oui) => {
    setSpritesGrille(oui)
    try {
      if (oui) localStorage.removeItem(CLE_SPRITES_GRILLE)
      else localStorage.setItem(CLE_SPRITES_GRILLE, 'non')
    } catch {
      /* navigation privée : le choix vaut pour la session */
    }
  }
  // La ville où le plan sera bâti, ou null : elle filtre les Pokémon proposés aux habitats.
  const [lieu, setLieu] = useState(initial?.lieu ?? null)
  const { cases, habitats, couleurs, occupants, teintes = new Map() } = niveaux[Math.min(courant, niveaux.length - 1)]
  // Le type de bloc qu'on pose.
  const [type, setType] = useState(TYPE_DEFAUT)
  // L'habitat survolé dans la liste des habitats prévus, surligné sur la grille.
  const [habitatSurvole, setHabitatSurvole] = useState(null)
  // Le verdict du dernier clic de l'outil Habitat : marqué, retiré, ou refusé et pourquoi.
  const [alerte, setAlerte] = useState(null)
  const [historique, setHistorique] = useState([])
  // Ce qu'on a défait, pour « Refaire » ; vidé dès qu'on trace autre chose.
  const [avenir, setAvenir] = useState([])
  // Le plan enregistré que reprend le brouillon, pour qu'« Enregistrer » le mette à jour.
  const [actif, setActif] = useState(initial?.actif ?? null)

  // Le bouton pris dans la boîte à outils (cf. OUTILS) ; ce qu'il fait s'en déduit : l'outil
  // de tracé, poser ou effacer, et l'épaisseur du trait.
  const [choix, setChoix] = useState('crayon')
  const [actionForme, setActionForme] = useState('poser')
  const [remplissage, setRemplissage] = useState('contour')
  const [methode, setMethode] = useState('remplir')
  const [epaisseurTrait, setEpaisseurTrait] = useState(1)
  const [epaisseurLigne, setEpaisseurLigne] = useState(1)
  const outil = MAIN_LEVEE[choix] ? 'case' : choix
  const action = MAIN_LEVEE[choix] ?? actionForme
  const pinceau = choix === 'ligne' ? epaisseurLigne : epaisseurTrait
  // La gomme, avec l'outil Habitat, retire un marquage : la méthode ne compte plus, et
  // on ne dessine un habitat qu'en posant.
  const dessineHabitat = outil === 'habitat' && methode === 'dessiner' && action === 'poser'
  const aPinceau = choix === 'crayon' || choix === 'gomme' || choix === 'ligne'
  // Ce que l'outil Dupliquer a en main : null tant qu'on n'a rien copié.
  const [copie, setCopie] = useState(null)
  // Le rectangle de l'outil Sélection, ou null. Il ne survit ni à un changement d'outil ni
  // à un changement d'étage : il désigne des blocs de ce niveau-ci.
  const [selection, setSelection] = useState(null)
  useEffect(() => setSelection(null), [choix, courant])
  const [survol, setSurvol] = useState(null)

  // Le tracé en cours vit dans une ref : les gestionnaires du pointeur doivent lire sa
  // dernière valeur, pas celle du rendu où ils ont été créés. Le compteur force l'aperçu.
  const trace = useRef(null)
  const [, rafraichir] = useState(0)

  useEffect(() => ecrirePlan(cote, niveaux, lieu, actif), [cote, niveaux, lieu, actif])

  /**
   * Remplace le plan, en gardant l'ancien pour « Défaire ». `changePlan` marque les étapes
   * qui passent d'un plan enregistré à un autre — ouvrir, nouveau plan : seules celles-là
   * rendent le plan d'avant quand on les annule. Un simple tracé, lui, n'y touche pas, sinon
   * annuler un trait fait avant d'enregistrer « fermerait » le plan qu'on vient de garder.
   *
   * `cases`, `habitats`, `couleurs`, `occupants`, `teintes` changent le niveau en cours ; `niveaux`
   * les remplace tous — pivoter, ouvrir, ajouter un étage —, et `courant` change d'étage.
   */
  const modifier = (changements, changePlan = false) => {
    setHistorique((h) => [...h.slice(-(HISTORIQUE_MAX - 1)), instantane(changePlan)])
    setAvenir([])
    const { cote: nouveauCote, niveaux: remplaces, courant: nouveauCourant, ...duNiveau } = changements
    if (remplaces) setNiveaux(remplaces)
    else if (Object.keys(duNiveau).length) setNiveaux(niveaux.map((n, i) => (i === courant ? { ...n, ...duNiveau } : n)))
    if (nouveauCote) setCote(nouveauCote)
    if (nouveauCourant != null) setCourant(nouveauCourant)
  }

  /** L'état du plan, tel qu'on le range dans l'historique. */
  function instantane(avecActif) {
    return avecActif ? { cote, niveaux, courant, actif } : { cote, niveaux, courant }
  }

  const appliquer = (etape) => {
    setNiveaux(etape.niveaux)
    setCote(etape.cote)
    // On revient à l'étage du tracé défait : on voit ce qu'on défait.
    setCourant(etape.courant)
    setAlerte(null)
    // Défaire l'ouverture d'un plan rend aussi le plan d'avant : sans quoi « Enregistrer »
    // écraserait le plan ouvert avec le dessin qu'on vient de ramener.
    if ('actif' in etape) setActif(etape.actif)
  }

  const defaire = () => {
    const precedent = historique.at(-1)
    if (!precedent) return
    setHistorique((h) => h.slice(0, -1))
    setAvenir((a) => [...a, instantane('actif' in precedent)])
    appliquer(precedent)
  }

  const refaire = () => {
    const suivant = avenir.at(-1)
    if (!suivant) return
    setAvenir((a) => a.slice(0, -1))
    setHistorique((h) => [...h.slice(-(HISTORIQUE_MAX - 1)), instantane('actif' in suivant)])
    appliquer(suivant)
  }

  // Ctrl+Z (ou Cmd+Z) défait, Ctrl+Y ou Ctrl+Maj+Z refait — sauf quand on tape dans un
  // champ : là, ils reviennent sur la saisie.
  const clavierRef = useRef({})
  useEffect(() => {
    const surTouche = (e) => {
      if (e.key === 'Escape') {
        setCopie(null)
        setSelection(null)
        return
      }
      // Suppr (ou Retour arrière) efface la sélection, hors d'un champ de saisie.
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.closest?.('input, textarea, [contenteditable="true"]')) {
        if (clavierRef.current.effacerSelection?.()) e.preventDefault()
        return
      }
      if (!(e.ctrlKey || e.metaKey)) return
      const touche = e.key.toLowerCase()
      const refait = touche === 'y' || (touche === 'z' && e.shiftKey)
      if (touche !== 'z' && !refait) return
      if (e.target.closest?.('input, textarea, [contenteditable="true"]')) return
      e.preventDefault()
      if (refait) clavierRef.current.refaire()
      else clavierRef.current.defaire()
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [])

  /**
   * L'habitat tracé d'un coin à l'autre : le rectangle est son MUR, l'intérieur ce qu'il
   * enferme. On le juge comme s'il était posé — murs ajoutés aux blocs existants —, avec la
   * même règle que la méthode « Remplir un enclos », pour que les deux ne se contredisent jamais.
   */
  const habitatDuTrace = (t) => {
    const murs = new Set(casesRectangle(t.depart, t.courant, false))
    const [x0, x1] = [Math.min(t.depart.x, t.courant.x), Math.max(t.depart.x, t.courant.x)]
    const [y0, y1] = [Math.min(t.depart.y, t.courant.y), Math.max(t.depart.y, t.courant.y)]
    const largeur = x1 - x0 - 1
    const longueur = y1 - y0 - 1
    const exterieur = { largeur: x1 - x0 + 1, longueur: y1 - y0 + 1 }
    if (largeur < 1 || longueur < 1) {
      return { murs, exterieur, analyse: { statut: 'petit', largeur: Math.max(0, largeur), longueur: Math.max(0, longueur), zone: new Set() } }
    }
    const interieur = new Set(casesRectangle({ x: x0 + 1, y: y0 + 1 }, { x: x1 - 1, y: y1 - 1 }, true))
    if ([...interieur].some((k) => cases.has(k))) {
      return { murs, exterieur, analyse: { statut: 'occupe', largeur, longueur, zone: interieur } }
    }
    const avecMurs = new Set([...cases, ...murs])
    return { murs, exterieur, analyse: analyserEnclos(avecMurs, cote, { x: x0 + 1, y: y0 + 1 }) }
  }

  /**
   * Élargit un trait à la taille du pinceau : chaque case devient un carré de `pinceau`
   * de côté, centré sur elle — décalé d'une case vers le bas et la droite quand la taille
   * est paire, faute de centre. Ce qui déborde de la grille est coupé.
   */
  const epaissir = (liste) => {
    if (pinceau === 1) return new Set(liste)
    const avant = Math.floor((pinceau - 1) / 2)
    const apres = pinceau - 1 - avant
    const large = new Set()
    for (const k of liste) {
      const { x, y } = lireCase(k)
      for (let dy = -avant; dy <= apres; dy++) {
        for (let dx = -avant; dx <= apres; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < cote && ny < cote) large.add(cle(nx, ny))
        }
      }
    }
    return large
  }

  /** Les blocs de ce niveau pris dans la sélection. */
  const blocsSelection = (r) => [...cases].filter((k) => dansRect(r, lireCase(k)))

  const casesDuTrace = (t) => {
    if (outil === 'selection') {
      if (!t.deplace) return new Set(casesRectangle(t.depart, t.courant, true))
      // En déplaçant : là où les blocs sélectionnés arriveraient.
      const dx = t.courant.x - t.depart.x
      const dy = t.courant.y - t.depart.y
      return new Set(
        blocsSelection(selection)
          .map(lireCase)
          .map(({ x, y }) => ({ x: x + dx, y: y + dy }))
          .filter(({ x, y }) => x >= 0 && y >= 0 && x < cote && y < cote)
          .map(({ x, y }) => cle(x, y)),
      )
    }
    if (dessineHabitat) return new Set(casesRectangle(t.depart, t.courant, false))
    if (outil === 'dupliquer') return new Set(casesRectangle(t.depart, t.courant, true))
    if (outil === 'ligne') return epaissir(casesLigne(t.depart, t.courant))
    if (outil === 'carre') return new Set(casesRectangle(t.depart, t.courant, remplissage === 'plein'))
    // Toujours un nouvel ensemble : le tracé s'allonge en place, et l'aperçu doit changer
    // d'identité pour que la grille se redessine.
    return epaissir(t.peintes)
  }

  /** Les habitats marqués de chaque niveau, chacun relu dans l'état actuel de ses blocs. */
  const analysesParNiveau = useMemo(
    () => niveaux.map((n) => [...n.habitats].map((k) => ({ cle: k, ...analyserEnclos(n.cases, cote, lireCase(k)) }))),
    [niveaux, cote],
  )
  const analyses = analysesParNiveau[Math.min(courant, niveaux.length - 1)]
  const valides = analyses.filter((a) => a.statut === 'ok')
  const invalides = analyses.filter((a) => a.statut !== 'ok')

  /** Un clic de l'outil Habitat : marquer l'enclos en posant, retirer l'habitat en effaçant. */
  const marquer = (c) => {
    const k = cle(c.x, c.y)
    const touche = analyses.find((a) => a.zone.has(k) || a.cle === k)
    if (action === 'effacer') {
      if (!touche) {
        setAlerte({ ok: false, texte: 'Aucun habitat ici : cliquez dans un habitat marqué pour le retirer.' })
        return
      }
      const reste = new Set(habitats)
      reste.delete(touche.cle)
      const sansLui = new Map(occupants)
      sansLui.delete(touche.cle)
      modifier({ habitats: reste, occupants: sansLui, teintes: rognerA(teintes, reste) })
      setAlerte({
        ok: true,
        texte: occupants.get(touche.cle)?.length
          ? 'Habitat retiré, murs conservés, ses Pokémon prévus avec lui. Ctrl+Z remet le tout.'
          : 'Habitat retiré, murs conservés. Ctrl+Z le remet.',
      })
      return
    }
    if (touche) {
      setAlerte({ ok: true, texte: 'C’est déjà un habitat. Prenez la gomme pour le retirer.' })
      return
    }
    const r = analyserEnclos(cases, cote, c)
    if (r.statut !== 'ok') {
      setAlerte({ ok: false, texte: raisonRefus(r) })
      return
    }
    // Noté par son coin haut-gauche : le même enclos, cliqué ailleurs, garde la même clé.
    modifier({ habitats: new Set(habitats).add(cle(r.x, r.y)) })
    setAlerte({
      ok: true,
      texte: `Habitat de ${r.largeur} × ${r.longueur} marqué : ${r.largeur * r.longueur} cases. N’oubliez pas la porte, à la place d’un bloc du mur.`,
    })
  }

  /**
   * Les habitats valides de tout le plan, numérotés niveau après niveau, et dans chacun
   * dans l'ordre de lecture — de haut en bas, puis de gauche à droite — : le numéro de la
   * grille et celui de la liste des habitats prévus. Leur `cle` porte le niveau (« 1|x,y »),
   * pour qu'un même coin sur deux étages fasse deux habitats.
   */
  const numerotes = useMemo(() => {
    let numero = 0
    return analysesParNiveau.flatMap((liste, niveau) =>
      liste
        .filter((a) => a.statut === 'ok')
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((a) => ({ ...a, cle: `${niveau}|${a.cle}`, niveau, numero: ++numero })),
    )
  }, [analysesParNiveau])
  const numerotesIci = numerotes.filter((a) => a.niveau === courant)

  /** Les Pokémon prévus de tout le plan, sous les clés de `numerotes`. */
  const tousOccupants = useMemo(
    () => new Map(niveaux.flatMap((n, i) => [...n.occupants].map(([k, noms]) => [`${i}|${k}`, noms]))),
    [niveaux],
  )

  /** Les couleurs des habitats de tout le plan, sous les clés de `numerotes`. */
  const toutesTeintes = useMemo(
    () => new Map(niveaux.flatMap((n, i) => [...(n.teintes ?? [])].map(([k, t]) => [`${i}|${k}`, t]))),
    [niveaux],
  )

  /** Donne une couleur à un habitat du plan (clé « niveau|x,y »), ou la lui retire (null). */
  const teinter = (cleHabitat, teinte) => {
    const [niveau, c] = cleHabitat.split('|')
    const i = Number(niveau)
    modifier({
      niveaux: niveaux.map((n, j) => {
        if (j !== i) return n
        const suivante = new Map(n.teintes ?? [])
        if (teinte) suivante.set(c, teinte)
        else suivante.delete(c)
        return { ...n, teintes: suivante }
      }),
    })
  }

  /** Range une table de tout le plan dans ses niveaux : un seul geste, un seul Ctrl+Z. */
  const changerOccupants = (table) => {
    const parNiveau = niveaux.map(() => new Map())
    for (const [k, noms] of table) {
      const [niveau, c] = k.split('|')
      parNiveau[Number(niveau)]?.set(c, noms)
    }
    modifier({ niveaux: niveaux.map((n, i) => ({ ...n, occupants: parNiveau[i] })) })
  }

  /**
   * Copie les blocs choisis, et les habitats valides entièrement pris dedans. Pas leurs
   * Pokémon : un Pokémon n'occupe qu'un habitat du plan, la copie en est vide.
   */
  const prendre = (blocs) => {
    if (!blocs.size) {
      setAlerte({ ok: false, titre: 'Rien à copier', texte: 'Cliquez sur un bloc, ou entourez des blocs d’un rectangle.' })
      return
    }
    const pts = [...blocs].map(lireCase)
    const [x0, x1] = [Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x))]
    const [y0, y1] = [Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.y))]
    const pris = valides
      .filter((a) => a.x > x0 && a.y > y0 && a.x + a.largeur - 1 < x1 && a.y + a.longueur - 1 < y1)
      .map((a) => ({ x: a.x, y: a.y }))
    const nouvelle = copier(blocs, pris, couleurs)
    setCopie(nouvelle)
    setAlerte({
      ok: true,
      titre: 'Copie',
      texte: `Copié : ${blocs.size} bloc${blocs.size > 1 ? 's' : ''} (${nouvelle.largeur} × ${nouvelle.hauteur})${pris.length ? `, ${pris.length} habitat${pris.length > 1 ? 's' : ''}` : ''}. Cliquez pour coller ; Échap pour copier autre chose.`,
    })
  }

  /** Colle la copie, coin haut-gauche sous le curseur. */
  const coller = (c) => {
    const { blocs, types, habitats: graines } = placerCopie(copie, c, cote)
    if (action === 'effacer') {
      const suivant = new Set(cases)
      blocs.forEach((k) => suivant.delete(k))
      if (suivant.size === cases.size) return
      // Effacer une forme entière, c'est aussi défaire les habitats qu'elle fermait : ceux
      // que ce coup de gomme casse partent avec. Un mur effacé à la main, lui, laisse
      // l'habitat en place et le signale — on veut peut-être seulement y percer une porte.
      const casses = valides.filter((a) => analyserEnclos(suivant, cote, a).statut !== 'ok').map((a) => a.cle)
      const restants = new Set([...habitats].filter((k) => !casses.includes(k)))
      const reste = new Map(couleurs)
      blocs.forEach((k) => reste.delete(k))
      modifier({
        cases: suivant,
        habitats: restants,
        couleurs: reste,
        occupants: rognerA(occupants, restants),
        teintes: rognerA(teintes, restants),
      })
      return
    }
    const suivant = new Set([...cases, ...blocs])
    // Les blocs collés gardent le type qu'ils avaient à la copie.
    const colles = new Map(couleurs)
    types.forEach((t, k) => (t === TYPE_DEFAUT ? colles.delete(k) : colles.set(k, t)))
    // Un habitat collé ne compte que si son enclos tient là où on le pose : coupé par le
    // bord de la grille, ou refermé autrement par des blocs déjà là, il n'est pas repris.
    const tenus = graines.filter((k) => analyserEnclos(suivant, cote, lireCase(k)).statut === 'ok')
    // (Les Pokémon prévus ne se collent pas : voir `prendre`.)
    const dejaLa = (k) => analyses.some((a) => a.zone.has(k))
    const nouveauxHabitats = new Set([...habitats, ...tenus.filter((k) => !dejaLa(k))])
    const retypes = [...types].some(([k, t]) => typeDe(couleurs, k) !== t)
    if (suivant.size === cases.size && nouveauxHabitats.size === habitats.size && !retypes) return
    modifier({ cases: suivant, habitats: nouveauxHabitats, couleurs: colles })
  }

  /**
   * Ce que remplirait le pot de peinture en cette case : la zone de blocs du même type, ou
   * le vide qu'on atteint sans traverser de bloc — jusqu'au bord de la grille s'il n'est pas
   * fermé, comme un pot de peinture versé hors d'un contour.
   */
  const zonePeinture = (c) => {
    if (cases.has(cle(c.x, c.y))) return { blocs: true, zone: zoneMemeType(cases, couleurs, c) }
    const r = analyserEnclos(cases, cote, c)
    return { blocs: false, zone: r.zone, ouvert: r.statut === 'ouvert' }
  }

  const peindre = (c) => {
    const { blocs, zone, ouvert } = zonePeinture(c)
    if (action === 'effacer') {
      if (!blocs) {
        setAlerte({ ok: false, titre: 'Peinture', texte: 'Rien à effacer ici : cliquez sur un bloc pour effacer toute sa zone du même type.' })
        return
      }
      const suivant = new Set(cases)
      const reste = new Map(couleurs)
      zone.forEach((k) => {
        suivant.delete(k)
        reste.delete(k)
      })
      modifier({ cases: suivant, couleurs: reste })
      return
    }
    if (blocs) {
      if (typeDe(couleurs, cle(c.x, c.y)) !== type) modifier({ couleurs: colorier(couleurs, zone, type) })
      return
    }
    modifier({ cases: new Set([...cases, ...zone]), couleurs: colorier(couleurs, zone, type) })
    setAlerte(
      ouvert
        ? { ok: true, titre: 'Peinture', texte: `Zone ouverte : ${zone.size} cases remplies jusqu’au bord de la grille. Ctrl+Z si c’était de trop.` }
        : null,
    )
  }

  /**
   * Déplace ce que contient la sélection : ses blocs, leurs couleurs, et les habitats notés à
   * l'intérieur avec leurs Pokémon. Ce qui sort de la grille est perdu ; ce qui arrive sur un
   * bloc déjà là le recouvre. Un seul Ctrl+Z remet tout.
   */
  const deplacerSelection = (dx, dy) => {
    if (!dx && !dy) return
    const dedans = (k) => dansRect(selection, lireCase(k))
    const vers = (k) => {
      const { x, y } = lireCase(k)
      const [nx, ny] = [x + dx, y + dy]
      return nx >= 0 && ny >= 0 && nx < cote && ny < cote ? cle(nx, ny) : null
    }
    const suivant = new Set([...cases].filter((k) => !dedans(k)))
    const types = new Map([...couleurs].filter(([k]) => !dedans(k)))
    for (const k of cases) {
      if (!dedans(k)) continue
      const n = vers(k)
      if (!n) continue
      suivant.add(n)
      if (couleurs.has(k)) types.set(n, couleurs.get(k))
      else types.delete(n)
    }
    const marques = new Set()
    const loges = new Map()
    const tons = new Map()
    for (const k of habitats) {
      const n = dedans(k) ? vers(k) : k
      if (!n) continue
      marques.add(n)
      if (occupants.has(k)) loges.set(n, occupants.get(k))
      if (teintes.has(k)) tons.set(n, teintes.get(k))
    }
    modifier({ cases: suivant, couleurs: types, habitats: marques, occupants: loges, teintes: tons })
    setSelection({
      x0: Math.max(0, selection.x0 + dx),
      y0: Math.max(0, selection.y0 + dy),
      x1: Math.min(cote - 1, selection.x1 + dx),
      y1: Math.min(cote - 1, selection.y1 + dy),
    })
  }

  /** Efface ce que contient la sélection : blocs, et habitats notés dedans. Vrai s'il y avait une sélection. */
  const effacerSelection = () => {
    if (outil !== 'selection' || !selection) return false
    const dedans = (k) => dansRect(selection, lireCase(k))
    if ([...cases].some(dedans) || [...habitats].some(dedans)) {
      const marques = new Set([...habitats].filter((k) => !dedans(k)))
      modifier({
        cases: new Set([...cases].filter((k) => !dedans(k))),
        couleurs: new Map([...couleurs].filter(([k]) => !dedans(k))),
        habitats: marques,
        occupants: rognerA(occupants, marques),
        teintes: rognerA(teintes, marques),
      })
    }
    return true
  }
  clavierRef.current = { defaire, refaire, effacerSelection }

  const dessin = {
    debut: (c) => {
      // Le curseur ne touche à rien : on survole, on lit la ligne d'info.
      if (outil === 'curseur') return
      if (outil === 'peinture') {
        peindre(c)
        return
      }
      if (outil === 'dupliquer' && copie) {
        coller(c)
        return
      }
      if (outil === 'habitat' && !dessineHabitat) {
        marquer(c)
        return
      }
      setAlerte(null)
      trace.current = {
        depart: c,
        courant: c,
        dernier: c,
        peintes: new Set([cle(c.x, c.y)]),
        // Sélection : appuyer dedans la déplace, appuyer dehors en trace une autre.
        deplace: outil === 'selection' && !!selection && dansRect(selection, c),
      }
      rafraichir((n) => n + 1)
    },
    deplacer: (c) => {
      const t = trace.current
      if (!t || (c.x === t.courant.x && c.y === t.courant.y)) return
      // Case par case, un geste rapide saute des cases entre deux événements : on relie la
      // précédente à la nouvelle, pour que le trait reste continu.
      if (outil === 'case') casesLigne(t.dernier, c).forEach((k) => t.peintes.add(k))
      t.courant = c
      t.dernier = c
      rafraichir((n) => n + 1)
    },
    fin: () => {
      const t = trace.current
      trace.current = null
      rafraichir((n) => n + 1)
      if (!t) return
      if (outil === 'selection') {
        if (t.deplace) {
          deplacerSelection(t.courant.x - t.depart.x, t.courant.y - t.depart.y)
          return
        }
        // Un clic sans glisser, hors de la sélection, la lâche.
        const seul = t.depart.x === t.courant.x && t.depart.y === t.courant.y
        setSelection(seul ? null : rectDe(t.depart, t.courant))
        return
      }
      if (outil === 'dupliquer') {
        // Un clic sans glisser prend la forme entière du bloc ; un rectangle, ce qu'il contient.
        const seul = t.depart.x === t.courant.x && t.depart.y === t.courant.y
        const blocs = seul
          ? composante(cases, t.depart)
          : new Set([...casesDuTrace(t)].filter((k) => cases.has(k)))
        prendre(blocs)
        return
      }
      if (dessineHabitat) {
        const { murs, exterieur, analyse } = habitatDuTrace(t)
        if (analyse.statut !== 'ok') {
          setAlerte({ ok: false, texte: raisonRefus(analyse) })
          return
        }
        // Murs et habitat d'un seul coup : un seul Ctrl+Z défait les deux.
        const neufs = [...murs].filter((k) => !cases.has(k))
        const nouveaux = neufs.length
        modifier({
          cases: new Set([...cases, ...murs]),
          habitats: new Set(habitats).add(cle(analyse.x, analyse.y)),
          couleurs: colorier(couleurs, neufs, type),
        })
        setAlerte({
          ok: true,
          texte: `Habitat de ${analyse.largeur} × ${analyse.longueur} dessiné (${exterieur.largeur} × ${exterieur.longueur} murs compris) : ${nouveaux} bloc${nouveaux > 1 ? 's' : ''} de mur posé${nouveaux > 1 ? 's' : ''}. N’oubliez pas la porte, à la place d’un bloc du mur.`,
        })
        return
      }
      const touchees = casesDuTrace(t)
      if (action === 'poser') {
        // Repasser le crayon sur un bloc déjà posé change son type : c'est ainsi qu'on
        // recolore un mur en chemin.
        const change = [...touchees].some((k) => !cases.has(k) || typeDe(couleurs, k) !== type)
        if (change) modifier({ cases: new Set([...cases, ...touchees]), couleurs: colorier(couleurs, touchees, type) })
        return
      }
      if ([...touchees].some((k) => cases.has(k))) {
        const suivant = new Set(cases)
        const reste = new Map(couleurs)
        touchees.forEach((k) => {
          suivant.delete(k)
          reste.delete(k)
        })
        modifier({ cases: suivant, couleurs: reste })
      }
    },
  }

  const apercu = trace.current ? casesDuTrace(trace.current) : null
  const traceHabitat = trace.current && dessineHabitat ? habitatDuTrace(trace.current) : null

  /**
   * L'outil Habitat, au survol : ce que ferait un clic sur cette case — retirer l'habitat
   * qu'on survole, ou marquer l'enclos, s'il est posable. La zone s'affiche en aperçu : un
   * enclos qui fuit montre ainsi par où, puisqu'il déborde jusqu'au bord de la grille.
   */
  const sonde = useMemo(() => {
    if (outil !== 'habitat' || dessineHabitat || !survol || survol.x == null) return null
    const k = cle(survol.x, survol.y)
    const existant = analyses.find((a) => a.zone.has(k) || a.cle === k)
    if (existant) return { ...existant, retrait: action === 'effacer', deja: action === 'poser' }
    // En effaçant, seul un habitat existant a quelque chose à montrer.
    if (action === 'effacer') return null
    return analyserEnclos(cases, cote, survol)
  }, [outil, dessineHabitat, action, survol, analyses, cases, cote])

  /** L'empreinte du pinceau sous le curseur, avant d'appuyer : on voit ce qu'on va peindre. */
  /** La copie sous le curseur, là où un clic la collerait. */
  const fantome =
    outil === 'dupliquer' && copie && !trace.current && survol?.x != null
      ? placerCopie(copie, survol, cote).blocs
      : null

  const apercuPeinture =
    outil === 'peinture' && !trace.current && survol?.x != null ? zonePeinture(survol) : null

  const empreinte =
    aPinceau && pinceau > 1 && !trace.current && survol?.x != null ? epaissir([cle(survol.x, survol.y)]) : null

  const calques = useMemo(() => {
    const grille = (test) =>
      Array.from({ length: cote }, (_, y) => Array.from({ length: cote }, (_, x) => test(cle(x, y))))
    const dans = (liste) => (k) => liste.some((a) => a.zone.has(k))
    const dessous = niveaux[courant - 1]
    const liste = [
      // L'étage du dessous, en transparence : on bâtit sur ses murs.
      ...(dessous?.cases.size ? [{ classe: 'grille-niveau-dessous', cases: grille((k) => dessous.cases.has(k)) }] : []),
      { classe: 'grille-habitat', cases: grille(dans(valides.filter((a) => !teintes.has(a.cle)))) },
      // Les habitats coloriés : un calque par couleur prise.
      ...[...new Set(teintes.values())].map((t) => ({
        classe: `grille-habitat grille-teinte-${t}`,
        cases: grille(dans(valides.filter((a) => teintes.get(a.cle) === t))),
      })),
      // L'habitat survolé dans la liste des habitats prévus : on voit lequel c'est.
      ...(habitatSurvole
        ? [{ classe: 'grille-habitat-choisi', cases: grille(dans(numerotesIci.filter((a) => a.cle === habitatSurvole))) }]
        : []),
      // Un habitat qui fuit « contient » tout le dehors jusqu'au bord : le peindre noierait
      // la grille en jaune. Le bandeau d'avertissement suffit à le signaler.
      { classe: 'grille-habitat-ko', cases: grille(dans(invalides.filter((a) => a.statut !== 'ouvert'))) },
      ...TYPES_BLOC.map((t) => ({
        classe: `grille-bloc-${t.id}`,
        cases: grille((k) => cases.has(k) && typeDe(couleurs, k) === t.id),
      })),
    ]
    if (traceHabitat?.analyse.zone.size) {
      liste.push({
        classe: traceHabitat.analyse.statut === 'ok' ? 'grille-sonde-ok' : 'grille-sonde-ko',
        cases: grille((k) => traceHabitat.analyse.zone.has(k)),
      })
    }
    if (apercu) {
      liste.push({
        // Les murs d'un habitat tracé se posent toujours : l'aperçu est celui du crayon. Une
        // sélection à copier ne pose ni n'efface : elle a sa propre teinte.
        classe:
          outil === 'dupliquer' || (outil === 'selection' && !trace.current?.deplace)
            ? 'grille-selection'
            : action === 'poser' || dessineHabitat
              ? 'grille-apercu'
              : 'grille-gomme',
        cases: grille((k) => apercu.has(k)),
      })
    }
    if (sonde?.zone.size) {
      liste.push({
        classe: sonde.retrait
          ? 'grille-sonde-retrait'
          : sonde.deja
            ? 'grille-sonde-deja'
            : sonde.statut === 'ok'
              ? 'grille-sonde-ok'
              : 'grille-sonde-ko',
        cases: grille((k) => sonde.zone.has(k)),
      })
    }
    // La sélection posée, suivie pendant qu'on la déplace.
    const t = trace.current
    const cadre =
      outil === 'selection' && selection && !(t && !t.deplace)
        ? t?.deplace
          ? {
              x0: selection.x0 + t.courant.x - t.depart.x,
              y0: selection.y0 + t.courant.y - t.depart.y,
              x1: selection.x1 + t.courant.x - t.depart.x,
              y1: selection.y1 + t.courant.y - t.depart.y,
            }
          : selection
        : null
    if (cadre) liste.push({ classe: 'grille-selection', cases: grille((k) => dansRect(cadre, lireCase(k))) })
    if (apercuPeinture?.zone.size) {
      liste.push({
        classe: action === 'poser' ? 'grille-apercu' : 'grille-gomme',
        cases: grille((k) => apercuPeinture.zone.has(k)),
      })
    }
    if (fantome) {
      liste.push({
        classe: action === 'poser' ? 'grille-apercu' : 'grille-gomme',
        cases: grille((k) => fantome.has(k)),
      })
    }
    if (empreinte) {
      liste.push({
        classe: action === 'poser' ? 'grille-pinceau' : 'grille-pinceau-gomme',
        cases: grille((k) => empreinte.has(k)),
      })
    }
    return liste
    // `apercu` change à chaque mouvement du tracé : il fait partie des dépendances.
  }, [cote, cases, couleurs, apercu, action, analyses, sonde, traceHabitat, dessineHabitat, empreinte, fantome, outil, habitatSurvole, niveaux, courant, numerotesIci, apercuPeinture, selection, teintes])

  /** Le numéro de chaque habitat, au centre de son intérieur, à la taille de son petit côté. */
  /**
   * Le numéro de chaque habitat, au centre de son intérieur, et dessous, en une rangée, les
   * sprites des Pokémon qu'on y prévoit : numéro et sprites se partagent alors la hauteur.
   */
  const etiquettes = numerotesIci.map((a) => {
    const noms = spritesGrille ? (tousOccupants.get(a.cle) ?? []).filter((n) => pokemonParNom.has(n)) : []
    const cx = a.x + a.largeur / 2
    const cy = a.y + a.longueur / 2
    const taille = Math.min(1.6, Math.max(0.7, Math.min(a.largeur, a.longueur) * 0.55))
    if (!noms.length) return { id: a.cle, x: cx, y: cy, texte: a.numero, taille }
    const cote = Math.min(1.5, (a.largeur - 0.3) / noms.length, a.longueur / 2 - 0.15)
    const numero = Math.min(taille, a.longueur / 2 - 0.1)
    // Le bloc numéro + sprites, centré : le numéro au-dessus, les sprites juste dessous.
    const haut = cy - (numero + cote) / 2
    return {
      id: a.cle,
      x: cx,
      y: haut + numero / 2,
      texte: a.numero,
      taille: numero,
      images: noms.map((n, i) => ({
        id: n,
        href: urlSpritePokemon(spritePokemon(n)),
        x: cx - (noms.length * cote) / 2 + i * cote,
        y: haut + numero,
        taille: cote,
      })),
    }
  })

  /**
   * Un quart de tour du plan entier, tous niveaux : blocs et habitats ensemble. Un habitat
   * est noté par une case de son intérieur, qui tourne avec les murs : il reste donc dans
   * son enclos.
   */
  const tourner = (sens) => {
    modifier({
      niveaux: niveaux.map((n) => ({
        cases: pivoter(n.cases, cote, sens),
        habitats: pivoter(n.habitats, cote, sens),
        couleurs: pivoterCouleurs(n.couleurs, cote, sens),
        occupants: pivoterOccupants(n.occupants, cote, sens),
        teintes: pivoterOccupants(n.teintes ?? new Map(), cote, sens),
      })),
    })
    setAlerte(null)
  }

  /** Change d'étage : ce n'est pas une modification, Ctrl+Z ne la défait pas. */
  const choisirNiveau = (i) => {
    setCourant(i)
    setAlerte(null)
  }

  /** Un étage vide au-dessus des autres, où l'on passe aussitôt. */
  const ajouterNiveau = () => {
    modifier({ niveaux: [...niveaux, niveauVide()], courant: niveaux.length })
    setAlerte(null)
  }

  const supprimerNiveau = () => {
    const vide = !cases.size && !habitats.size
    modifier({ niveaux: niveaux.filter((_, i) => i !== courant), courant: Math.max(0, courant - 1) })
    setAlerte({
      ok: true,
      titre: 'Niveau supprimé',
      texte: vide
        ? `Le niveau ${courant + 1}, vide, est retiré.`
        : `Le niveau ${courant + 1} est retiré, avec ses blocs et ses habitats. Ctrl+Z le remet.`,
    })
  }

  /**
   * Le plus petit côté qui garde tout, à tous les niveaux : la grille ne rétrécit pas sous
   * un bloc ou un habitat — ses murs sont des blocs, et sa case notée est à l'intérieur.
   */
  const coteMini = useMemo(() => {
    let n = COTE_MIN
    for (const niveau of niveaux) {
      for (const k of [...niveau.cases, ...niveau.habitats]) {
        const { x, y } = lireCase(k)
        n = Math.max(n, x + 1, y + 1)
      }
    }
    return n
  }, [niveaux])

  const changerCote = (demande) => {
    const v = Math.max(demande, coteMini)
    if (v > demande) {
      setAlerte({
        ok: false,
        titre: 'Grille trop petite',
        texte: `Le dessin va jusqu’à la rangée ou la colonne ${coteMini} : la grille ne descend pas sous ${coteMini} × ${coteMini}. Effacez ce qui dépasse pour la réduire davantage.`,
      })
    }
    if (v === cote) return
    modifier({ cote: v })
  }

  const infoTrace = () => {
    const t = trace.current
    if (!t) return null
    if (outil === 'selection') {
      if (t.deplace) {
        const dx = t.courant.x - t.depart.x
        const dy = t.courant.y - t.depart.y
        return `Déplacer la sélection de ${Math.abs(dx)} colonne${Math.abs(dx) > 1 ? 's' : ''} ${dx < 0 ? 'à gauche' : 'à droite'} et ${Math.abs(dy)} rangée${Math.abs(dy) > 1 ? 's' : ''} ${dy < 0 ? 'vers le haut' : 'vers le bas'} — relâchez.`
      }
      const r = rectDe(t.depart, t.courant)
      const n = blocsSelection(r).length
      return `Sélection de ${r.x1 - r.x0 + 1} × ${r.y1 - r.y0 + 1} — ${n} bloc${n > 1 ? 's' : ''}`
    }
    if (outil === 'dupliquer') {
      const w = Math.abs(t.courant.x - t.depart.x) + 1
      const h = Math.abs(t.courant.y - t.depart.y) + 1
      const n = [...apercu].filter((k) => cases.has(k)).length
      return w === 1 && h === 1
        ? 'Relâchez pour copier toute la forme de ce bloc.'
        : `Sélection de ${w} × ${h} — ${n} bloc${n > 1 ? 's' : ''} à copier`
    }
    if (traceHabitat) {
      const { analyse: a, exterieur: e } = traceHabitat
      return a.statut === 'ok' ? (
        <>
          <b>Autorisé</b> : habitat de <b>{a.largeur} × {a.longueur}</b> ({e.largeur} × {e.longueur} murs compris),{' '}
          {a.largeur * a.longueur} cases — relâchez pour le poser.
        </>
      ) : (
        <>
          <b>Non autorisé</b> : {raisonRefus(a)}
        </>
      )
    }
    const n = apercu.size
    const verbe = action === 'poser' ? 'à poser' : 'à effacer'
    if (outil === 'carre') {
      const w = Math.abs(t.courant.x - t.depart.x) + 1
      const h = Math.abs(t.courant.y - t.depart.y) + 1
      return `Carré de ${w} × ${h} — ${n} case${n > 1 ? 's' : ''} ${verbe}`
    }
    return `${outil === 'ligne' ? 'Ligne' : 'Tracé'} de ${n} case${n > 1 ? 's' : ''} ${verbe}`
  }

  /** Combien de blocs de chaque type : pour le bilan, et à côté de chaque couleur. */
  const parType = useMemo(() => {
    const n = Object.fromEntries(TYPES_BLOC.map((t) => [t.id, 0]))
    cases.forEach((k) => n[typeDe(couleurs, k)]++)
    return n
  }, [cases, couleurs])

  /** Le rectangle qui englobe tous les blocs posés : la place que prendra la construction. */
  const emprise = useMemo(() => {
    if (!cases.size) return [0, 0]
    const xs = []
    const ys = []
    cases.forEach((k) => {
      const [x, y] = k.split(',').map(Number)
      xs.push(x)
      ys.push(y)
    })
    return [Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1]
  }, [cases])

  return (
    <div className="generateur">
      <MesPlans
        cote={cote}
        niveaux={niveaux}
        lieu={lieu}
        setLieu={setLieu}
        actif={actif}
        actionsEnPlus={
          <>
            <button
              type="button"
              className="ghost-btn bouton-icone avec-texte"
              onClick={basculerThemeGrille}
              title={grilleSombre ? 'Grille en mode clair' : 'Grille en mode sombre'}
            >
              {grilleSombre ? <IconeSoleil /> : <IconeLune />}
              <span>{grilleSombre ? 'Grille claire' : 'Grille sombre'}</span>
            </button>
            <button
              type="button"
              className={'ghost-btn bouton-icone avec-texte' + (ajuste ? ' ouvert' : '')}
              aria-pressed={ajuste}
              onClick={() => setAjuste((v) => !v)}
              title="Réduire la grille pour la voir en entier sous les réglages, sans défiler"
            >
              <IconeLoupe />
              <span>Grille entière</span>
            </button>
          </>
        }
        setActif={setActif}
        ouvrir={(plan) => {
          modifier({ niveaux: lireNiveaux(plan, plan.cote), cote: plan.cote, courant: 0 }, true)
          setLieu(plan.lieu ?? null)
          setActif(plan.id)
          setAlerte(null)
        }}
        nouveau={() => {
          modifier({ niveaux: [niveauVide()], courant: 0 }, true)
          setLieu(null)
          setActif(null)
          setAlerte(null)
        }}
      >
        {/* Le bilan du dessin, sur la même ligne que le nom du plan. */}
        <div className="bilan-habitat">
          <Chiffre
            valeur={cases.size}
            unite="bloc"
            libelle={niveaux.length > 1 ? `Blocs posés — niveau ${courant + 1}` : 'Blocs posés'}
            detail={
              TYPES_BLOC.filter((t) => parType[t.id])
                .map((t) => `${parType[t.id]} ${t.nom.toLowerCase()}`)
                .join(' · ') || `sur ${cote * cote} cases`
            }
          />
          <Chiffre
            valeur={emprise[0] * emprise[1]}
            unite="case"
            libelle={niveaux.length > 1 ? `Emprise — niveau ${courant + 1}` : 'Emprise du dessin'}
            detail={cases.size ? `${emprise[0]} × ${emprise[1]}, du premier au dernier bloc` : 'Rien de posé'}
          />
          <Chiffre
            valeur={numerotes.length}
            unite="habitat"
            libelle={niveaux.length > 1 ? `Habitats — ${niveaux.length} niveaux` : 'Habitats'}
            detail={
              numerotes.length
                ? numerotes
                    .map((a) => (tousOccupants.get(a.cle)?.length ? nomHabitat(a, tousOccupants) : `${a.largeur} × ${a.longueur}`))
                    .join(' · ')
                : 'Outil « Habitat » : cliquez dans un enclos'
            }
          />
        </div>
      </MesPlans>

      {/* Messages et ligne d'info au-dessus des deux colonnes : ils changent de hauteur
          au fil des clics, et poussaient la grille sous le haut de la colonne d'outils. */}
      <div className="plan-messages">
        {alerte && (
          <div className={`verdict fermable ${alerte.ok ? 'ok' : 'refus'}`} role="status">
            <strong>{alerte.titre ?? (alerte.ok ? 'Habitat' : 'Pas un habitat')}</strong>
            <span>{alerte.texte}</span>
            <button
              type="button"
              className="verdict-fermer"
              onClick={() => setAlerte(null)}
              title="Fermer"
              aria-label="Fermer ce message"
            >
              <CloseOutlined />
            </button>
          </div>
        )}
        {invalides.length > 0 && (
          <div className="verdict refus" role="status">
            <strong>
              {invalides.length} habitat{invalides.length > 1 ? 's' : ''} à revoir
            </strong>
            <span>
              {invalides.length > 1 ? 'Ils ne respectent' : 'Il ne respecte'} plus les règles depuis les derniers
              tracés : {invalides.map((a) => raisonRefus(a)).join(' ')} Refermez l’enclos, ou retirez l’habitat
              avec l’outil « Habitat ».
            </span>
          </div>
        )}

        <div
          className={
            'bilan-survol escalier-survol' +
            (traceHabitat
              ? traceHabitat.analyse.statut === 'ok'
                ? ' sonde-ok'
                : ' sonde-ko'
              : sonde && !sonde.retrait && !sonde.deja
                ? sonde.statut === 'ok'
                  ? ' sonde-ok'
                  : ' sonde-ko'
                : '')
          }
          aria-live="polite"
        >
          {infoTrace() ??
            (sonde ? (
              sonde.retrait ? (
                <>
                  Habitat de <b>{sonde.largeur} × {sonde.longueur}</b> — cliquez pour le retirer.
                </>
              ) : sonde.deja ? (
                <>
                  Déjà un habitat de <b>{sonde.largeur} × {sonde.longueur}</b> — la gomme pour le retirer.
                </>
              ) : sonde.statut === 'ok' ? (
                <>
                  <b>Posable</b> : habitat de <b>{sonde.largeur} × {sonde.longueur}</b>,{' '}
                  {sonde.largeur * sonde.longueur} cases — cliquez pour le marquer.
                </>
              ) : (
                <>
                  <b>Non posable</b> : {raisonRefus(sonde)}
                </>
              )
            ) : outil === 'selection' && selection ? (
              <>
                Sélection de <b>{selection.x1 - selection.x0 + 1} × {selection.y1 - selection.y0 + 1}</b> —{' '}
                {blocsSelection(selection).length} blocs. Glissez-la pour la déplacer, Suppr pour l’effacer, Échap
                pour la lâcher.
              </>
            ) : apercuPeinture ? (
              <>
                {apercuPeinture.blocs
                  ? action === 'poser'
                    ? `Repeindre ${apercuPeinture.zone.size} bloc${apercuPeinture.zone.size > 1 ? 's' : ''} en ${TYPES_BLOC.find((t) => t.id === type).nom.toLowerCase()}`
                    : `Effacer ${apercuPeinture.zone.size} bloc${apercuPeinture.zone.size > 1 ? 's' : ''}`
                  : action === 'poser'
                    ? `Remplir ${apercuPeinture.zone.size} case${apercuPeinture.zone.size > 1 ? 's' : ''}${apercuPeinture.ouvert ? ', jusqu’au bord de la grille' : ''}`
                    : 'Rien à effacer : cliquez sur un bloc'}{' '}
                — rangée <b>{survol.y + 1}</b>, colonne <b>{survol.x + 1}</b>
              </>
            ) : fantome ? (
              <>
                {action === 'poser' ? 'Coller' : 'Effacer la forme de'} la copie ({copie.largeur} ×{' '}
                {copie.hauteur}) ici, à la rangée <b>{survol.y + 1}</b>, colonne <b>{survol.x + 1}</b> —
                cliquez.
              </>
            ) : survol ? (
              <>
                Rangée <b>{survol.y + 1}</b>, colonne <b>{survol.x + 1}</b>
                {aPinceau && pinceau > 1 ? ` — épaisseur ${pinceau} × ${pinceau}` : ''}
                {cases.has(cle(survol.x, survol.y))
                  ? ` — ${TYPES_BLOC.find((t) => t.id === typeDe(couleurs, cle(survol.x, survol.y))).nom.toLowerCase()}`
                  : (() => {
                      const h = numerotesIci.find((a) => a.zone.has(cle(survol.x, survol.y)))
                      if (!h) return ''
                      return ` — habitat ${h.numero}${tousOccupants.get(h.cle)?.length ? ` : ${nomHabitat(h, tousOccupants)}` : ''}`
                    })()}
              </>
            ) : (
              'Survolez la grille pour repérer une case.'
            ))}
        </div>
      </div>

      {/* La grille à gauche, les outils en colonne à droite (placés en CSS) : sur un grand
          écran, la grille garde toute la hauteur au lieu de passer sous une barre de réglages. */}
      <div className="plan-editeur">
        <section className="reglages outils-colonne" aria-label="Outils du plan">
          {/* En tête, le plan lui-même : la taille de la grille, et l'étage qu'on dessine. */}
          <Dimension petit libelle="Côté de la grille" valeur={cote} min={COTE_MIN} max={COTE_MAX} onChange={changerCote} />
          <div className="reglage">
            <span className="etiquette">Niveau</span>
            {niveaux.length > 1 && (
              <Segmented
                size="small"
                options={niveaux.map((_, i) => ({ value: i, label: `${i + 1}`, title: i ? `Niveau ${i + 1}` : 'Niveau 1 — le sol' }))}
                value={courant}
                onChange={choisirNiveau}
                block
              />
            )}
            <div className="liste-actions">
              <button type="button" className="ghost-btn" onClick={ajouterNiveau} disabled={niveaux.length >= NIVEAUX_MAX}>
                Ajouter un niveau
              </button>
              {niveaux.length > 1 && (
                <button type="button" className="ghost-btn" onClick={supprimerNiveau}>
                  Supprimer ce niveau
                </button>
              )}
            </div>
          </div>
          {/* La boîte à outils, en boutons carrés comme dans un logiciel de dessin, rangés par
              famille : les outils, défaire et refaire, pivoter le plan. */}
          <div className="boite-outils" role="toolbar" aria-label="Outils de dessin">
            {GROUPES_OUTILS.map((g) => (
              <div key={g.nom} className="groupe-outils" role="group" aria-label={g.nom}>
                {g.outils.map((value) => {
                  const { value: _, ...o } = outilParValeur.get(value)
                  return <BoutonOutil key={value} {...o} actif={choix === value} onClick={() => setChoix(value)} />
                })}
              </div>
            ))}
            <div className="groupe-outils" role="group" aria-label="Historique">
              <BoutonOutil Icone={IconeDefaire} label="Défaire" title="Défaire (Ctrl+Z)" onClick={defaire} disabled={!historique.length} />
              <BoutonOutil Icone={IconeRefaire} label="Refaire" title="Refaire (Ctrl+Y)" onClick={refaire} disabled={!avenir.length} />
            </div>
            <div className="groupe-outils" role="group" aria-label="Pivoter le plan">
              <BoutonOutil
                Icone={IconePivoterGauche}
                label="Pivoter ↺"
                title="Pivoter le plan d’un quart de tour vers la gauche"
                onClick={() => tourner('gauche')}
                disabled={!niveaux.some((n) => n.cases.size || n.habitats.size)}
              />
              <BoutonOutil
                Icone={IconePivoterDroite}
                label="Pivoter ↻"
                title="Pivoter le plan d’un quart de tour vers la droite"
                onClick={() => tourner('droite')}
                disabled={!niveaux.some((n) => n.cases.size || n.habitats.size)}
              />
            </div>
          </div>
          {/* Sous les boutons, les réglages propres à l'outil choisi, sur deux colonnes. */}
          <div className="outils-reglages">
            {outil === 'carre' && (
              <div className="reglage">
                <span className="etiquette">Remplissage</span>
                <Segmented size="small" options={REMPLISSAGES} value={remplissage} onChange={setRemplissage} block />
              </div>
            )}
            {outil === 'dupliquer' && copie && (
              <div className="reglage">
                <span className="etiquette">
                  Copie — {copie.largeur} × {copie.hauteur}
                </span>
                <div className="liste-actions">
                  <button
                    type="button"
                    className="ghost-btn bouton-icone"
                    onClick={() => setCopie(pivoterCopie(copie, 'gauche'))}
                    title="Pivoter la copie vers la gauche"
                    aria-label="Pivoter la copie vers la gauche"
                  >
                    <IconePivoterGauche />
                  </button>
                  <button
                    type="button"
                    className="ghost-btn bouton-icone"
                    onClick={() => setCopie(pivoterCopie(copie, 'droite'))}
                    title="Pivoter la copie vers la droite"
                    aria-label="Pivoter la copie vers la droite"
                  >
                    <IconePivoterDroite />
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setCopie(null)
                      setAlerte(null)
                    }}
                  >
                    Autre copie
                  </button>
                </div>
              </div>
            )}
            {outil === 'selection' && selection && (
              <div className="reglage">
                <span className="etiquette">
                  Sélection — {selection.x1 - selection.x0 + 1} × {selection.y1 - selection.y0 + 1}
                </span>
                <div className="liste-actions">
                  <button type="button" className="ghost-btn" onClick={effacerSelection}>
                    Effacer
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => setSelection(null)}>
                    Lâcher
                  </button>
                </div>
              </div>
            )}
            {!MAIN_LEVEE[choix] && choix !== 'selection' && choix !== 'curseur' && (
              <div className="reglage">
                <span className="etiquette">Action</span>
                <Segmented size="small" options={ACTIONS} value={actionForme} onChange={setActionForme} block />
              </div>
            )}
            {aPinceau && (
              <Dimension petit
                libelle="Épaisseur"
                valeur={pinceau}
                max={PINCEAU_MAX}
                onChange={choix === 'ligne' ? setEpaisseurLigne : setEpaisseurTrait}
              />
            )}
            {/* En effaçant, l'outil Habitat retire un marquage d'un clic : pas de méthode à choisir. */}
            {outil === 'habitat' && action === 'poser' && (
              <div className="reglage">
                <span className="etiquette">Méthode</span>
                <Segmented size="small" options={METHODES} value={methode} onChange={setMethode} vertical block />
              </div>
            )}
            {action === 'poser' && (outil === 'case' || outil === 'ligne' || outil === 'carre' || outil === 'peinture' || dessineHabitat) && (
              <div className="reglage">
                <span className="etiquette">Bloc : {TYPES_BLOC.find((t) => t.id === type).nom}</span>
                <div className="palette" role="radiogroup" aria-label="Type de bloc">
                  {TYPES_BLOC.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={type === t.id}
                      className={`pastille-type grille-bloc-${t.id}` + (type === t.id ? ' choisie' : '')}
                      onClick={() => setType(t.id)}
                      title={`${t.nom} — ${parType[t.id]} bloc${parType[t.id] > 1 ? 's' : ''}`}
                      aria-label={t.nom}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Les habitats prévus et leurs Pokémon, avec les outils : on les assigne sans quitter la grille des yeux. */}
        <HabitatsDuPlan
          habitats={numerotes}
          occupants={tousOccupants}
          onChanger={changerOccupants}
          teintes={toutesTeintes}
          onTeinter={teinter}
          spritesGrille={spritesGrille}
          onSpritesGrille={changerSpritesGrille}
          plusieursNiveaux={niveaux.length > 1}
          lieu={lieu}
          survole={habitatSurvole}
          setSurvole={setHabitatSurvole}
        />
        </section>

        <div ref={zoneRef} className={'plan-zone' + (themeGrille ? ` grille-${themeGrille}` : '') + (ajuste ? ' ajuste' : '')}>
          <Grille
            largeur={cote}
            hauteur={cote}
            calques={calques}
            survol={survol}
            setSurvol={setSurvol}
            axes={false}
            dessin={dessin}
            croix={outil !== 'habitat' && outil !== 'peinture'}
            marge="juste"
            etiquettes={etiquettes}
          />
        </div>
      </div>
    </div>
  )
}

/** La table des Pokémon prévus, réduite aux habitats qui restent. */
const rognerA = (occupants, habitats) => new Map([...occupants].filter(([k]) => habitats.has(k)))

/** Un bouton de la boîte à outils : l'icône, le mot dessous. `actif` en fait un bouton à bascule. */
function BoutonOutil({ Icone, label, title, actif, ...reste }) {
  return (
    <button
      type="button"
      className={'bouton-outil' + (actif ? ' actif' : '')}
      title={title ?? label}
      aria-pressed={actif}
      {...reste}
    >
      <Icone />
      <span>{label}</span>
    </button>
  )
}
