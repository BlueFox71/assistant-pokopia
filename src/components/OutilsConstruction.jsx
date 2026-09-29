import { useMemo, useRef } from 'react'
import { InputNumber, Slider } from 'antd'

/**
 * Les pièces communes aux simulations de la vue Construction : le réglage d'une dimension,
 * un chiffre du bilan, et la grille qui montre le résultat bloc par bloc.
 */

export const LIMITE_TAILLE = 150

/** Pas des repères numérotés sur les bords de la grille, et des lignes appuyées. */
const PAS_REPERE = 5

/** Un curseur et son champ, bornés. Le curseur s'arrête à 64 ; au-delà, on tape. `petit` resserre le champ. */
export function Dimension({ libelle, valeur, onChange, min = 1, max = LIMITE_TAILLE, petit = false }) {
  const changer = (v) => {
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, Math.round(v))))
  }
  return (
    <div className="reglage reglage-dimension">
      <span className="etiquette">{libelle}</span>
      <div className="dimension">
        <Slider min={min} max={Math.min(max, 64)} value={Math.min(valeur, 64)} onChange={changer} />
        <InputNumber min={min} max={max} value={valeur} onChange={changer} aria-label={libelle} size={petit ? 'small' : undefined} />
      </div>
    </div>
  )
}

/** Un chiffre du bilan : libellé, valeur, unité accordée, détail, et une option dessous. */
export function Chiffre({ valeur, unite, libelle, detail, children }) {
  return (
    <div className="chiffre-habitat">
      <span className="etiquette">{libelle}</span>
      <strong>{valeur.toLocaleString('fr-FR')}</strong>
      <span className="chiffre-unite">{unite}{valeur > 1 ? 's' : ''}</span>
      <span className="chiffre-detail" title={typeof detail === 'string' ? detail : undefined}>
        {detail}
      </span>
      {children && <div className="chiffre-option">{children}</div>}
    </div>
  )
}

/**
 * La grille, en SVG : une unité par bloc, et le navigateur met à l'échelle.
 *
 * Ce qu'elle montre arrive en calques — `{ classe, cases }`, une grille de booléens chacun,
 * peints dans l'ordre : les blocs d'une forme, ou le sol, les murs et la porte d'un habitat.
 * Chaque calque forme un seul chemin plutôt qu'un `<rect>` par bloc — un disque plein de
 * 150 de diamètre, ce serait dix-sept mille nœuds.
 *
 * `survol` / `setSurvol` sont facultatifs : sans eux, la grille ne suit pas la souris.
 * `depuisLeBas` numérote les rangées comme des hauteurs, 1 au ras du sol — pour une vue de
 * profil, où la rangée du haut n'est pas la première qu'on pose.
 *
 * `marge` est la place laissée autour pour les numéros, en unités de bloc. `'juste'` la
 * mesure sur eux : de quoi les lire en haut et à gauche, où ils sont, et un filet ailleurs.
 *
 * `croix` à faux retire la rangée et la colonne surlignées au survol, quand un aperçu
 * occupe déjà la place et qu'elles se confondraient avec lui.
 *
 * `dessin` rend la grille éditable : `{ debut(case), deplacer(case), fin() }`, appelés au
 * pointeur — souris, stylet ou doigt. Pendant un tracé, la case suit le pointeur même hors
 * de la grille, ramenée au bord : on peut finir un trait en sortant sans le perdre.
 */
export function Grille({
  largeur: l,
  hauteur: h,
  calques,
  survol = null,
  setSurvol,
  axes = true,
  depuisLeBas = false,
  dessin = null,
  croix = true,
  marge = 2.4,
  // Des textes posés au centre d'une zone : le numéro de chaque habitat, sur le plan. Chacun
  // peut porter des images, en coordonnées de la grille : les sprites de ses Pokémon.
  etiquettes = [],
}) {
  const trace = useRef(false)

  const chemins = useMemo(
    () =>
      calques.map(({ classe, cases }) => {
        let d = ''
        cases.forEach((rangee, y) =>
          rangee.forEach((plein, x) => {
            if (plein) d += `M${x} ${y}h1v1h-1z`
          }),
        )
        return { classe, d }
      }),
    [calques],
  )

  const lignes = useMemo(() => {
    let fines = ''
    let fortes = ''
    for (let x = 0; x <= l; x++) {
      const seg = `M${x} 0V${h}`
      if (x % PAS_REPERE === 0 || x === l) fortes += seg
      else fines += seg
    }
    for (let y = 0; y <= h; y++) {
      const seg = `M0 ${y}H${l}`
      const rang = depuisLeBas ? h - y : y
      if (rang % PAS_REPERE === 0 || y === 0 || y === h) fortes += seg
      else fines += seg
    }
    return { fines, fortes }
  }, [l, h, depuisLeBas])

  const reperesX = []
  for (let x = 1; x <= l; x++) if (x === 1 || x % PAS_REPERE === 0 || (x === l && l % PAS_REPERE > 1)) reperesX.push(x)
  const reperesY = []
  for (let y = 1; y <= h; y++) if (y === 1 || y % PAS_REPERE === 0 || (y === h && h % PAS_REPERE > 1)) reperesY.push(y)

  /** La case sous le pointeur, en coordonnées de grille ; `null` hors de la grille. */
  const caseSous = (e, ramener = false) => {
    const svg = e.currentTarget
    const point = svg.createSVGPoint()
    point.x = e.clientX
    point.y = e.clientY
    const p = point.matrixTransform(svg.getScreenCTM().inverse())
    let x = Math.floor(p.x)
    let y = Math.floor(p.y)
    if (ramener) {
      x = Math.min(l - 1, Math.max(0, x))
      y = Math.min(h - 1, Math.max(0, y))
    }
    return x < 0 || y < 0 || x >= l || y >= h ? null : { x, y }
  }

  const surDeplacement = (e) => {
    if (trace.current) dessin.deplacer(caseSous(e, true))
    if (!setSurvol) return
    const c = caseSous(e)
    if (!c) setSurvol(null)
    else if (!survol || survol.x !== c.x || survol.y !== c.y) setSurvol(c)
  }

  const surAppui = (e) => {
    if (!dessin || e.button !== 0) return
    const c = caseSous(e)
    if (!c) return
    e.preventDefault()
    // Capturer le pointeur : le relâcher hors de la grille termine quand même le tracé.
    e.currentTarget.setPointerCapture(e.pointerId)
    trace.current = true
    dessin.debut(c)
  }

  const surRelache = () => {
    if (!trace.current) return
    trace.current = false
    dessin.fin()
  }

  // Au-delà d'une soixantaine de blocs, une ligne par bloc devient une trame grise : on ne
  // garde que les repères tous les cinq.
  const traitFin = l > 64 || h > 64 ? null : lignes.fines

  // Les numéros sont à 0,7 du bord, dans une police qui grandit avec la grille.
  const police = Math.max(0.5, Math.max(l, h) / 36)
  const [haut, gauche, bas, droite] =
    marge === 'juste'
      ? [0.7 + police, 0.7 + String(h).length * 0.62 * police, 0.3, 0.3]
      : [marge, marge, marge, marge]
  const larg = l + gauche + droite
  const haute = h + haut + bas

  return (
    <div className="grille-cadre">
      <svg
        className={'grille' + (setSurvol || dessin ? ' suivie' : '') + (dessin ? ' dessinable' : '')}
        viewBox={`${-gauche} ${-haut} ${larg} ${haute}`}
        style={{ '--ratio': larg / haute }}
        onPointerMove={surDeplacement}
        onPointerLeave={() => setSurvol?.(null)}
        onPointerDown={surAppui}
        onPointerUp={surRelache}
        onPointerCancel={surRelache}
        role="img"
        aria-label={`Plan de ${l} blocs sur ${h}`}
      >
        <rect className="grille-fond" x="0" y="0" width={l} height={h} />
        {survol && croix && (
          <g className="grille-survol">
            <rect x="0" y={survol.y} width={l} height="1" />
            {survol.x !== null && <rect x={survol.x} y="0" width="1" height={h} />}
          </g>
        )}
        {chemins.map(({ classe, d }) => (
          <path key={classe} className={classe} d={d} />
        ))}
        {traitFin && <path className="grille-ligne" d={traitFin} />}
        <path className="grille-ligne forte" d={lignes.fortes} />
        {axes && (
          <path className="grille-axe" d={`M${l / 2} -0.6V${h + 0.6}M-0.6 ${h / 2}H${l + 0.6}`} />
        )}
        {etiquettes.map(({ id, x, y, texte, taille = 1, images = [] }) => (
          <g key={id}>
            <text
              className="grille-etiquette"
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: taille }}
            >
              {texte}
            </text>
            {images.map((im) => (
              <image
                key={im.id}
                className="grille-etiquette-image"
                href={im.href}
                x={im.x}
                y={im.y}
                width={im.taille}
                height={im.taille}
                preserveAspectRatio="xMidYMid meet"
              />
            ))}
          </g>
        ))}
        {survol?.x != null && (
          <rect className="grille-curseur" x={survol.x} y={survol.y} width="1" height="1" />
        )}
        <g className="grille-reperes" style={{ fontSize: police }}>
          {reperesX.map((x) => (
            <text key={`x${x}`} x={x - 0.5} y={-0.7} textAnchor="middle">
              {x}
            </text>
          ))}
          {reperesY.map((n) => (
            <text
              key={`y${n}`}
              x={-0.7}
              y={depuisLeBas ? h - n + 0.5 : n - 0.5}
              textAnchor="end"
              dominantBaseline="central"
            >
              {n}
            </text>
          ))}
        </g>
      </svg>
    </div>
  )
}
