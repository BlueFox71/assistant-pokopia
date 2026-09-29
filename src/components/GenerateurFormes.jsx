import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Segmented } from 'antd'
import { BRANCHES_MAX, BRANCHES_MIN, FORMES, REMPLISSAGES, decompterRangees, tracerForme } from '../utils/formes'
import { Dimension, Grille, LIMITE_TAILLE } from './OutilsConstruction'

const entier = (v, min, max, defaut) => {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut
}

/**
 * Le générateur de formes : cercle, ellipse, carré, rectangle, losange ou étoile, dessiné
 * bloc par bloc.
 *
 * Les réglages vivent dans l'URL (`?forme=cercle&l=21&mode=fin`) : un lien suffit pour
 * retrouver une forme, ou l'envoyer à quelqu'un qui construit à côté.
 */
export default function GenerateurFormes() {
  const [params, setParams] = useSearchParams()

  const def = FORMES.find((f) => f.value === params.get('forme')) ?? FORMES[0]
  const forme = def.value
  const remplissage = REMPLISSAGES.some((r) => r.value === params.get('mode')) ? params.get('mode') : 'fin'
  const largeur = entier(params.get('l'), 1, LIMITE_TAILLE, 21)
  // Une forme à une seule dimension ignore la hauteur, quoi que dise l'URL. L'étoile en a
  // une quand même, déduite de ses proportions : on la lit sur le tracé, plus bas.
  const hauteur = def.dimensions === 1 ? largeur : entier(params.get('h'), 1, LIMITE_TAILLE, 13)
  const branches = entier(params.get('b'), BRANCHES_MIN, BRANCHES_MAX, 5)
  const epaisseurMax = Math.max(1, Math.ceil(Math.min(largeur, hauteur) / 2))
  const epaisseur = entier(params.get('ep'), 1, epaisseurMax, 1)

  const regler = (cle, valeur) =>
    setParams(
      (p) => {
        const suivant = new URLSearchParams(p)
        suivant.set(cle, String(valeur))
        return suivant
      },
      { replace: true },
    )

  const cases = useMemo(
    () => tracerForme({ forme, largeur, hauteur, remplissage, epaisseur, branches }),
    [forme, largeur, hauteur, remplissage, epaisseur, branches],
  )
  const largeurTracee = cases[0]?.length ?? 0
  const hauteurTracee = cases.length
  const calques = useMemo(() => [{ classe: 'grille-blocs', cases }], [cases])
  const rangees = useMemo(() => decompterRangees(cases), [cases])
  const total = rangees.reduce((n, r) => n + r.total, 0)

  const [survol, setSurvol] = useState(null)

  return (
    <div className="generateur">
      <section className="reglages" aria-label="Réglages de la forme">
        <div className="reglage">
          <span className="etiquette">Forme</span>
          <Segmented options={FORMES} value={forme} onChange={(v) => regler('forme', v)} />
        </div>

        <Dimension libelle={def.libelle} valeur={largeur} onChange={(v) => regler('l', v)} />
        {def.dimensions === 2 && (
          <Dimension libelle="Hauteur" valeur={hauteur} onChange={(v) => regler('h', v)} />
        )}
        {forme === 'etoile' && (
          <Dimension
            libelle="Branches"
            valeur={branches}
            min={BRANCHES_MIN}
            max={BRANCHES_MAX}
            onChange={(v) => regler('b', v)}
          />
        )}

        <div className="reglage">
          <span className="etiquette">Remplissage</span>
          <Segmented options={REMPLISSAGES} value={remplissage} onChange={(v) => regler('mode', v)} />
        </div>

        {remplissage !== 'plein' && (
          <Dimension
            libelle="Épaisseur"
            valeur={epaisseur}
            max={epaisseurMax}
            onChange={(v) => regler('ep', v)}
          />
        )}

        <p className="indice">
          {remplissage === 'fin' &&
            'Contour fin : aux marches, deux blocs ne se touchent que par un coin — plus léger, mais on passe entre eux.'}
          {remplissage === 'continu' &&
            'Contour continu : chaque bloc partage une face avec le suivant, le mur ne laisse rien passer.'}
          {remplissage === 'plein' && 'Plein : toute la surface, pour un sol ou un bassin.'}
          {/* Côtés droits, pas de marche : il n'y a rien à boucher, les deux contours se valent. */}
          {remplissage !== 'plein' &&
            (forme === 'carre' || forme === 'rectangle') &&
            ' Sur un côté droit, il n’y a pas de marche : les deux contours donnent le même tracé.'}
        </p>
      </section>

      <div className="bilan">
        <div className="bilan-chiffre">
          <strong>{total.toLocaleString('fr-FR')}</strong>
          <span className="etiquette">bloc{total > 1 ? 's' : ''}</span>
        </div>
        <div className="bilan-detail">
          {largeurTracee} × {hauteurTracee} · {hauteurTracee} rangée{hauteurTracee > 1 ? 's' : ''}
          <br />
          {largeurTracee % 2 === 0
            ? 'Largeur paire : le centre tombe entre deux blocs.'
            : 'Largeur impaire : le centre est un bloc.'}
        </div>
        <div className="bilan-survol" aria-live="polite">
          {survol && rangees[survol.y] ? (
            <>
              Rangée <b>{survol.y + 1}</b>{survol.x !== null && <>, colonne <b>{survol.x + 1}</b></>} —{' '}
              {rangees[survol.y].total} bloc{rangees[survol.y].total > 1 ? 's' : ''} sur la rangée
            </>
          ) : (
            'Survolez la grille pour repérer une rangée.'
          )}
        </div>
      </div>

      <div className="plan">
        <Grille
          largeur={largeurTracee}
          hauteur={hauteurTracee}
          calques={calques}
          survol={survol}
          setSurvol={setSurvol}
        />
        <TableRangees rangees={rangees} survol={survol} setSurvol={setSurvol} />
      </div>
    </div>
  )
}

/** Le décompte par rangée, en regard de la grille. */
function TableRangees({ rangees, survol, setSurvol }) {
  return (
    <div className="rangees">
      <h2 className="etiquette">Rangée par rangée</h2>
      <div className="rangees-entete etiquette" aria-hidden="true">
        <span>N°</span>
        <span>Blocs</span>
        <span>Colonnes</span>
      </div>
      <ol className="rangees-liste">
        {rangees.map((r, y) => (
          <li
            key={y}
            className={survol?.y === y ? 'actif' : undefined}
            onMouseEnter={() => setSurvol({ x: null, y })}
            onMouseLeave={() => setSurvol(null)}
          >
            <span className="rangee-num">{y + 1}</span>
            <span className="rangee-total">{r.total}</span>
            <span className="rangee-segments">
              {r.segments.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ') || '—'}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
