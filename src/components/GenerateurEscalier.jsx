import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Segmented } from 'antd'
import { REMPLISSAGES_ESCALIER, tracerEscalier } from '../utils/escalier'
import { Chiffre, Dimension, Grille } from './OutilsConstruction'

const DENIVELE_MAX = 30
const PROFONDEUR_MAX = 4
const PALIER_MAX = 5

const entier = (v, min, max, defaut) => {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut
}

const pluriel = (n, mot) => `${n.toLocaleString('fr-FR')} ${mot}${n > 1 ? 's' : ''}`

/**
 * Le générateur d'escalier : un dénivelé à franchir, et ce qu'il en coûte en blocs et en
 * place au sol.
 *
 * La grille montre le profil — l'escalier vu de côté, d'un bloc de large.
 *
 * Réglages dans l'URL : `?sim=escalier&d=6&pm=1&pa=1&mode=plein`.
 */
export default function GenerateurEscalier() {
  const [params, setParams] = useSearchParams()

  const denivele = entier(params.get('d'), 1, DENIVELE_MAX, 6)
  const profondeur = entier(params.get('pm'), 1, PROFONDEUR_MAX, 1)
  const palier = entier(params.get('pa'), 0, PALIER_MAX, 0)
  const remplissage = REMPLISSAGES_ESCALIER.some((r) => r.value === params.get('mode'))
    ? params.get('mode')
    : 'plein'

  const regler = (cle, valeur) =>
    setParams(
      (p) => {
        const suivant = new URLSearchParams(p)
        suivant.set(cle, String(valeur))
        return suivant
      },
      { replace: true },
    )

  const trace = useMemo(
    () => tracerEscalier({ hauteur: denivele, profondeur, palier, remplissage }),
    [denivele, profondeur, palier, remplissage],
  )
  const calques = useMemo(
    () => [
      { classe: 'grille-dessous', cases: trace.dessous },
      { classe: 'grille-blocs', cases: trace.marches },
    ],
    [trace],
  )
  const total = trace.colonnes.reduce((n, c) => n + c.blocs, 0)

  const [survol, setSurvol] = useState(null)
  const colonne = survol?.x != null ? trace.colonnes[survol.x] : null

  return (
    <div className="generateur">
      <section className="reglages" aria-label="Réglages de l'escalier">
        <Dimension
          libelle="Dénivelé"
          valeur={denivele}
          max={DENIVELE_MAX}
          onChange={(v) => regler('d', v)}
        />
        <Dimension
          libelle="Profondeur de marche"
          valeur={profondeur}
          max={PROFONDEUR_MAX}
          onChange={(v) => regler('pm', v)}
        />
        <Dimension
          libelle="Palier en haut"
          valeur={palier}
          min={0}
          max={PALIER_MAX}
          onChange={(v) => regler('pa', v)}
        />
        <div className="reglage">
          <span className="etiquette">Remplissage</span>
          <Segmented
            options={REMPLISSAGES_ESCALIER}
            value={remplissage}
            onChange={(v) => regler('mode', v)}
          />
        </div>
        <p className="indice">
          {remplissage === 'plein'
            ? 'Plein : chaque colonne descend jusqu’au sol, comme une butte taillée en marches.'
            : 'Marches seules : un bloc par colonne, rien dessous — le moins de blocs possible, et un passage libre sous l’escalier.'}{' '}
          Chaque marche monte d’un bloc.
        </p>
      </section>

      <div className="bilan-habitat">
        <Chiffre valeur={denivele} unite="marche" detail={`d’un bloc de haut, ${pluriel(profondeur, 'bloc')} de long`} libelle="Marches" />
        <Chiffre
          valeur={trace.largeur}
          unite="bloc"
          libelle="Longueur au sol"
          detail={
            palier
              ? `${denivele} × ${profondeur} de marches, + ${palier} de palier`
              : `${denivele} marche${denivele > 1 ? 's' : ''} × ${profondeur}`
          }
        />
        <Chiffre
          valeur={total}
          unite="bloc"
          libelle="Blocs au total"
          detail={remplissage === 'plein' ? 'Marches et remplissage dessous' : 'Un bloc par colonne'}
        />
      </div>

      <div className="bilan-survol escalier-survol" aria-live="polite">
        {colonne ? (
          <>
            Colonne <b>{survol.x + 1}</b> —{' '}
            {colonne.marche ? <>marche <b>{colonne.marche}</b></> : 'palier'}, dessus à{' '}
            <b>{colonne.haut}</b> de haut, {pluriel(colonne.blocs, 'bloc')}
          </>
        ) : (
          'Survolez le profil pour repérer une marche.'
        )}
      </div>

      <Grille
        largeur={trace.largeur}
        hauteur={trace.hauteur}
        calques={calques}
        survol={survol}
        setSurvol={setSurvol}
        axes={false}
        depuisLeBas
      />

      <p className="note-source">
        Vue de profil : on monte de gauche à droite, la rangée du bas est posée au sol. Aucune
        source ne donne la hauteur que le personnage franchit d’un pas ; l’escalier suppose un
        bloc par marche, la règle des jeux de blocs. Pour un habitat « en hauteur », un seul
        bloc de dénivelé suffit.
      </p>
    </div>
  )
}
