import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Checkbox } from 'antd'
import {
  CAPACITE,
  HAUTEUR_CONSEILLEE,
  HAUTEUR_PORTE,
  INTERIEUR_MAX,
  INTERIEUR_MIN,
  MEUBLES_REQUIS,
  PORTES_MAX,
  evaluerHabitat,
  planHabitat,
} from '../utils/habitatConstruction'
import { Chiffre, Dimension, Grille } from './OutilsConstruction'

const TAILLE_MAX = 10
const HAUTEUR_MAX = 10

const VERDICTS = {
  ok: { titre: 'Habitat acceptable', classe: 'ok' },
  petit: { titre: 'Trop petit', classe: 'refus' },
  grand: { titre: 'Trop grand', classe: 'refus' },
}

const entier = (v, min, max, defaut) => {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut
}

const pluriel = (n, mot) => `${n.toLocaleString('fr-FR')} ${mot}${n > 1 ? 's' : ''}`

/**
 * Le générateur d'habitat : une largeur, une longueur, et le jeu dira-t-il « maison » ?
 *
 * Les dimensions saisies sont celles de l'intérieur, parce que les règles du jeu portent
 * sur lui ; l'emprise murs compris se lit dans le bilan.
 *
 * Réglages dans l'URL : `?sim=habitat&l=7&p=8&hm=3&po=1&dp=1` (`dp` : déduire les portes).
 */
export default function GenerateurHabitat() {
  const [params, setParams] = useSearchParams()

  const largeur = entier(params.get('l'), 1, TAILLE_MAX, 7)
  const longueur = entier(params.get('p'), 1, TAILLE_MAX, 8)
  const hauteurMur = entier(params.get('hm'), 1, HAUTEUR_MAX, HAUTEUR_CONSEILLEE)
  const portes = entier(params.get('po'), 1, PORTES_MAX, 1)
  const deduirePortes = params.get('dp') === '1'

  const regler = (valeurs) =>
    setParams(
      (p) => {
        const suivant = new URLSearchParams(p)
        Object.entries(valeurs).forEach(([cle, v]) => suivant.set(cle, String(v)))
        return suivant
      },
      { replace: true },
    )

  const bilan = evaluerHabitat({ largeur, longueur, hauteurMur, portes, deduirePortes })
  const plan = useMemo(() => planHabitat({ largeur, longueur, portes }), [largeur, longueur, portes])
  const verdict = VERDICTS[bilan.statut]
  const [maxPetit, maxGrand] = INTERIEUR_MAX

  const choisir = (l, p) => regler({ l, p })

  return (
    <div className="generateur">
      <section className="reglages" aria-label="Dimensions de l'habitat">
        <Dimension
          libelle="Largeur"
          valeur={largeur}
          max={TAILLE_MAX}
          onChange={(v) => regler({ l: v })}
        />
        <Dimension
          libelle="Longueur"
          valeur={longueur}
          max={TAILLE_MAX}
          onChange={(v) => regler({ p: v })}
        />
        <Dimension
          libelle="Hauteur des murs"
          valeur={hauteurMur}
          max={HAUTEUR_MAX}
          onChange={(v) => regler({ hm: v })}
        />
        <Dimension
          libelle="Portes"
          valeur={portes}
          max={PORTES_MAX}
          onChange={(v) => regler({ po: v })}
        />
      </section>

      <div className={`verdict ${verdict.classe}`} role="status">
        <strong>{verdict.titre}</strong>
        <span>
          {bilan.statut === 'ok' &&
            `Un intérieur de ${largeur} × ${longueur} est reconnu comme maison : jusqu’à ${CAPACITE} Pokémon, dès ${MEUBLES_REQUIS} meubles posés.`}
          {bilan.statut === 'petit' &&
            `L’intérieur doit faire au moins ${INTERIEUR_MIN} × ${INTERIEUR_MIN} ; il fait ${Math.max(0, largeur)} × ${Math.max(0, longueur)}.`}
          {bilan.statut === 'grand' &&
            `L’intérieur ne doit pas dépasser ${maxPetit} × ${maxGrand}, dans un sens ou dans l’autre ; il fait ${largeur} × ${longueur}. Une cloison avec sa propre porte en ferait deux maisons.`}
        </span>
      </div>

      <div className="bilan-habitat">
        <Chiffre valeur={bilan.surface} unite="case" libelle="Surface intérieure" detail={`${largeur} × ${longueur}`} />
        <Chiffre
          valeur={bilan.horsBordure[0] * bilan.horsBordure[1]}
          unite="case"
          libelle="Intérieur hors bordure"
          detail={`${bilan.horsBordure[0]} × ${bilan.horsBordure[1]}, sans la rangée qui longe les murs`}
        />
        <Chiffre
          valeur={bilan.exterieur[0] * bilan.exterieur[1]}
          unite="case"
          libelle="Emprise au sol"
          detail={`${bilan.exterieur[0]} × ${bilan.exterieur[1]}, murs compris`}
        />
        <Chiffre
          valeur={bilan.blocsMurs}
          unite="bloc"
          libelle="Murs"
          detail={
            `${pluriel(bilan.blocsParRang, 'bloc')} par rang × ${hauteurMur}` +
            (deduirePortes ? ` − ${pluriel(bilan.blocsPortes, 'bloc')} de porte` : '')
          }
        >
          <Checkbox checked={deduirePortes} onChange={(e) => regler({ dp: e.target.checked ? 1 : 0 })}>
            Déduire {portes > 1 ? `les ${portes} portes` : 'la porte'} ({HAUTEUR_PORTE} blocs chacune)
          </Checkbox>
        </Chiffre>
      </div>

      <div className="plan plan-habitat">
        <Grille largeur={plan.largeur} hauteur={plan.hauteur} calques={plan.calques} axes={false} />
        <aside className="rangees tailles">
          <h2 className="etiquette">Toutes les tailles acceptées</h2>
          <p className="indice">
            Intérieur, largeur en colonnes, longueur en rangées. La plus grande : {maxPetit} × {maxGrand},
            soit {maxPetit * maxGrand} cases.
          </p>
          <TableauTailles largeur={largeur} longueur={longueur} choisir={choisir} />
          <ul className="legende">
            <li><i className="pastille-sol" /> Sol hors bordure</li>
            <li><i className="pastille-bordure" /> Bordure : la rangée qui longe les murs</li>
            <li><i className="pastille-mur" /> Mur (bloc ou clôture)</li>
            <li><i className="pastille-porte" /> {portes > 1 ? 'Portes ou portillons' : 'Porte ou portillon'} — n’importe où sur le mur, hors des coins</li>
          </ul>
        </aside>
      </div>

      <p className="note-source">
        Les règles ne sont publiées nulle part par le jeu : elles viennent des guides Game8 et
        Serebii, qui s’accordent sur un intérieur de {INTERIEUR_MIN} × {INTERIEUR_MIN} à{' '}
        {maxPetit} × {maxGrand}. Il faut quatre murs — blocs ou clôtures, un seul bloc de haut
        suffit —, une porte, et {MEUBLES_REQUIS} meubles pour que des Pokémon s’y installent.
        Pour circuler et poser un étage dessus, comptez {HAUTEUR_CONSEILLEE} blocs de mur.
      </p>
    </div>
  )
}

/**
 * Le tableau des tailles, de 2 à 10 sur chaque axe : une case verte par intérieur accepté,
 * qu'un clic applique. La taille en cours est cerclée, même hors des bornes.
 */
function TableauTailles({ largeur, longueur, choisir }) {
  const [maxPetit, maxGrand] = INTERIEUR_MAX
  const axe = Array.from({ length: maxGrand - INTERIEUR_MIN + 1 }, (_, i) => INTERIEUR_MIN + i)
  return (
    <table className="tableau-tailles">
      <thead>
        <tr>
          <th aria-hidden="true" />
          {axe.map((l) => (
            <th key={l} scope="col">{l}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {axe.map((p) => (
          <tr key={p}>
            <th scope="row">{p}</th>
            {axe.map((l) => {
              const ok = Math.min(l, p) <= maxPetit && Math.max(l, p) <= maxGrand
              const actif = l === largeur && p === longueur
              return (
                <td key={l}>
                  <button
                    type="button"
                    className={(ok ? 'ok' : 'refus') + (actif ? ' actif' : '')}
                    aria-pressed={actif}
                    aria-label={`${l} × ${p} : ${l * p} cases${ok ? '' : ', trop grand'}`}
                    title={`${l} × ${p} = ${l * p} cases`}
                    onClick={() => choisir(l, p)}
                  >
                    {l * p}
                  </button>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
