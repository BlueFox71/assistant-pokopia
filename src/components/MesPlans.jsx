import { useEffect, useState } from 'react'
import { Input, Popconfirm, Select, Tooltip } from 'antd'
import {
  creerPlan,
  exporterPlans,
  importerPlans,
  modifierPlan,
  supprimerPlan,
  usePlans,
} from '../utils/plansStorage'
import { TYPES_BLOC, TYPE_DEFAUT, analyserEnclos } from '../utils/planPerso'
import { VILLES } from '../data/villes'
import { nomVille, useNomsVilles } from '../utils/villesStorage'
import { IconeEchange, IconeEnregistrer, IconeEnregistrerCopie, IconeNouveau } from './Icones'

const dateCourte = (t) =>
  new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Deux ensembles de cases, l'un enregistré (liste), l'autre en cours (Set), sont-ils égaux ? */
const memes = (liste, ensemble) => liste.length === ensemble.size && liste.every((k) => ensemble.has(k))

/** Une table de couleurs enregistrée (objet) et celle en cours (Map, blocs présents seulement). */
const memesCouleurs = (objet = {}, table, cases) => {
  const enCours = [...table].filter(([k]) => cases.has(k))
  return Object.keys(objet).length === enCours.length && enCours.every(([k, type]) => objet[k] === type)
}

/** Les Pokémon assignés, enregistrés (objet) et en cours (Map, habitats présents seulement). */
const memesOccupants = (objet = {}, table, habitats) => {
  const enCours = [...table].filter(([k, noms]) => habitats.has(k) && noms.length)
  return (
    Object.keys(objet).length === enCours.length &&
    enCours.every(([k, noms]) => objet[k]?.length === noms.length && noms.every((n, i) => objet[k][i] === n))
  )
}

/** Les niveaux d'un plan enregistré : le sol à la racine, les étages à part (cf. planPerso.js). */
const niveauxDe = (plan) => [plan, ...(plan.etages ?? [])]

/** Un niveau enregistré et celui en cours sont-ils les mêmes ? */
const memeNiveau = (n, { cases, habitats, couleurs, occupants, teintes = new Map() }) =>
  memesCouleurs(n.teintes, teintes, habitats) &&
  memes(n.cases, cases) &&
  memes(n.habitats, habitats) &&
  memesCouleurs(n.couleurs, couleurs, cases) &&
  memesOccupants(n.occupants, occupants, habitats)

/** Le brouillon diffère-t-il du plan enregistré qu'il reprend ? */
const differe = (plan, cote, niveaux, lieu) => {
  if (!plan || plan.cote !== cote || (plan.lieu ?? null) !== lieu) return true
  const enregistres = niveauxDe(plan)
  return enregistres.length !== niveaux.length || enregistres.some((n, i) => !memeNiveau(n, niveaux[i]))
}

/**
 * Les plans enregistrés : nommer et garder le plan en cours, en rouvrir un, en supprimer,
 * et les exporter pour les emporter ailleurs.
 *
 * Ouvrir un plan passe par `ouvrir`, qui remplace le brouillon comme un tracé : Ctrl+Z
 * ramène donc ce qu'on avait avant de l'ouvrir, et rien n'est perdu sans confirmation.
 */
export default function MesPlans({ cote, niveaux, lieu, setLieu, actif, setActif, ouvrir, nouveau, actionsEnPlus, children }) {
  const nomsVilles = useNomsVilles()
  const liste = usePlans()
  const planActif = liste.find((p) => p.id === actif) ?? null
  const [nom, setNom] = useState(planActif?.nom ?? '')
  const [message, setMessage] = useState('')
  const [sauvegarde, setSauvegarde] = useState(null)

  // Le plan actif change — ouverture, nouveau plan, suppression : le champ reprend son nom.
  // Sur `actif` seulement : un enregistrement renomme le plan, et le champ dit déjà ce nom.
  const nomActif = planActif?.nom ?? ''
  useEffect(() => setNom(nomActif), [actif])

  const modifie = differe(planActif, cote, niveaux, lieu) || (planActif && nom.trim() && nom.trim() !== planActif.nom)
  const nomParDefaut = () => `Plan ${liste.length + 1}`

  const enregistrer = () => {
    if (planActif) {
      modifierPlan(planActif.id, { nom: nom || planActif.nom, cote, niveaux, lieu })
      setMessage(`« ${nom || planActif.nom} » mis à jour.`)
    } else {
      const plan = creerPlan(nom || nomParDefaut(), cote, niveaux, lieu)
      if (!plan) return
      setActif(plan.id)
      setMessage(`« ${plan.nom} » enregistré.`)
    }
  }

  const enregistrerCopie = () => {
    const base = nom || planActif?.nom || nomParDefaut()
    const plan = creerPlan(planActif && base === planActif.nom ? `${base} (copie)` : base, cote, niveaux, lieu)
    if (!plan) return
    setActif(plan.id)
    setMessage(`Copie enregistrée : « ${plan.nom} ».`)
  }

  const supprimer = (plan) => {
    supprimerPlan(plan.id)
    // Le dessin reste à l'écran : on supprime la sauvegarde, pas le travail en cours.
    if (plan.id === actif) setActif(null)
    setMessage(`« ${plan.nom} » supprimé.`)
  }

  return (
    <section className="mes-plans" aria-label="Plans enregistrés">
      <div className="mes-plans-tete">
        <div className="reglage mes-plans-nom">
          <span className="etiquette">
            {planActif ? (modifie ? 'Plan ouvert — modifications non enregistrées' : 'Plan ouvert — à jour') : 'Nouveau plan'}
          </span>
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onPressEnter={enregistrer}
            placeholder={planActif?.nom ?? nomParDefaut()}
            maxLength={60}
            aria-label="Nom du plan"
          />
        </div>
        <div className="reglage mes-plans-lieu">
          <span className="etiquette">Lieu</span>
          <Select
            value={lieu ?? ''}
            onChange={(v) => setLieu(v || null)}
            options={[
              { value: '', label: 'Toutes les villes' },
              ...VILLES.map((v) => ({ value: v.cle, label: nomVille(nomsVilles, v.cle) })),
            ]}
            aria-label="Ville où ce plan sera bâti"
            title="La ville où ce plan sera bâti : seuls ses Pokémon sont proposés dans les habitats"
          />
        </div>
        <div className="liste-actions">
          <button
            type="button"
            className="ghost-btn primaire bouton-icone avec-texte"
            onClick={enregistrer}
            disabled={planActif ? !modifie : !niveaux.some((n) => n.cases.size)}
            title="Enregistrer"
            aria-label="Enregistrer"
          >
            <IconeEnregistrer />
            <span>Enregistrer</span>
          </button>
          {planActif && (
            <button
              type="button"
              className="ghost-btn bouton-icone avec-texte"
              onClick={enregistrerCopie}
              title="Enregistrer une copie"
              aria-label="Enregistrer une copie"
            >
              <IconeEnregistrerCopie />
              <span>Copie</span>
            </button>
          )}
          <button
            type="button"
            className="ghost-btn bouton-icone avec-texte"
            title="Créer un nouveau plan"
            aria-label="Créer un nouveau plan"
            onClick={() => {
              nouveau()
              // Vidé ici, pas seulement par l'effet sur `actif` : un plan jamais enregistré
              // n'a pas d'actif à perdre, et son nom saisi resterait sinon dans le champ.
              setNom('')
              setMessage('')
            }}
          >
            <IconeNouveau />
            <span>Nouveau</span>
          </button>
          <button
            type="button"
            className={'ghost-btn bouton-icone avec-texte' + (sauvegarde !== null ? ' ouvert' : '')}
            title="Exporter / importer les plans"
            aria-label="Exporter / importer les plans"
            aria-expanded={sauvegarde !== null}
            onClick={() => {
              setMessage('')
              setSauvegarde(sauvegarde === null ? exporterPlans() : null)
            }}
          >
            <IconeEchange />
            <span>Exporter / importer</span>
          </button>
          {/* Les boutons que la page ajoute à la suite : le thème de la grille. */}
          {actionsEnPlus}
        </div>
        {message && <span className="message-sauvegarde">{message}</span>}
        {/* Ce que la page veut voir à côté : le bilan du plan en cours. */}
        {children}
      </div>

      {sauvegarde !== null && (
        <div className="panneau-sauvegarde">
          <h2 className="etiquette">Exporter / importer les plans</h2>
          <p className="indice">
            Tous vos plans enregistrés, au format JSON : conservez-le quelque part, ou collez ici
            celui d’un autre navigateur. Un import <b>ajoute</b> les plans qui manquent et ne
            remplace jamais un plan déjà là.
          </p>
          <textarea
            className="zone-sauvegarde"
            value={sauvegarde}
            spellCheck={false}
            aria-label="Sauvegarde des plans, au format JSON"
            onChange={(e) => setSauvegarde(e.target.value)}
          />
          <div className="actions-sauvegarde">
            <button
              type="button"
              className="ghost-btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(sauvegarde)
                  setMessage('Copié dans le presse-papier.')
                } catch {
                  setMessage('Copie impossible : sélectionnez le texte et copiez-le à la main.')
                }
              }}
            >
              Copier
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                const r = importerPlans(sauvegarde)
                setMessage(
                  r.erreur ??
                    `${r.ajoutes} plan${r.ajoutes > 1 ? 's' : ''} importé${r.ajoutes > 1 ? 's' : ''}` +
                      (r.ignores ? `, ${r.ignores} déjà présent${r.ignores > 1 ? 's' : ''}.` : '.'),
                )
              }}
            >
              Importer
            </button>
          </div>
        </div>
      )}

      {liste.length > 0 && (
        <ul className="plans-liste">
          {liste.map((p) => {
            const etages = niveauxDe(p)
            const blocs = etages.reduce((n, e) => n + e.cases.length, 0)
            const habitats = etages.reduce((n, e) => n + e.habitats.length, 0)
            return (
              <li key={p.id} className={p.id === actif ? 'actif' : undefined}>
                {/* Le nom seul dans la liste ; le plan lui-même, au survol. */}
                <Tooltip
                  title={
                    <span className="bulle-plan">
                      <Apercu cote={p.cote} cases={p.cases} habitats={p.habitats} couleurs={p.couleurs} />
                      <span>
                        {blocs} bloc{blocs > 1 ? 's' : ''} · {p.cote} × {p.cote}
                        {etages.length > 1 ? ` · ${etages.length} niveaux (vignette : le sol)` : ''}
                      </span>
                      {habitats > 0 && (
                        <span>
                          {habitats} habitat{habitats > 1 ? 's' : ''}
                          {(() => {
                            const n = etages.flatMap((e) => Object.values(e.occupants ?? {}).flat()).length
                            return n ? ` · ${n} Pokémon` : ''
                          })()}
                        </span>
                      )}
                      <span>{dateCourte(p.modifieLe)}</span>
                    </span>
                  }
                  mouseEnterDelay={0.2}
                >
                  <button
                    type="button"
                    className="plan-ouvrir"
                    onClick={() => {
                      ouvrir(p)
                      setMessage(`« ${p.nom} » ouvert. Ctrl+Z ramène le plan précédent.`)
                    }}
                    aria-label={`Ouvrir ${p.nom}, ${blocs} blocs`}
                  >
                    {p.nom}
                  </button>
                </Tooltip>
                <Popconfirm
                  title={`Supprimer « ${p.nom} » ?`}
                  description="Le plan enregistré disparaît ; le dessin à l’écran reste."
                  okText="Supprimer"
                  cancelText="Garder"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => supprimer(p)}
                >
                  <button type="button" className="mini-btn plan-supprimer">
                    Supprimer
                  </button>
                </Popconfirm>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** La vignette d'un plan : ses blocs dans leurs couleurs, et l'intérieur de ses habitats valides. */
function Apercu({ cote, cases, habitats, couleurs = {} }) {
  const blocs = new Set(cases)
  const chemin = (liste) => {
    let d = ''
    for (const k of liste) {
      const [x, y] = k.split(',')
      d += `M${x} ${y}h1v1h-1z`
    }
    return d
  }
  const interieurs = habitats.flatMap((k) => {
    const [x, y] = k.split(',').map(Number)
    const r = analyserEnclos(blocs, cote, { x, y })
    return r.statut === 'ok' ? [...r.zone] : []
  })
  return (
    <svg className="plan-apercu" viewBox={`0 0 ${cote} ${cote}`} aria-hidden="true">
      <rect width={cote} height={cote} className="grille-fond" />
      <path d={chemin(interieurs)} className="grille-habitat" />
      {TYPES_BLOC.map((t) => (
        <path
          key={t.id}
          d={chemin(cases.filter((k) => (couleurs[k] ?? TYPE_DEFAUT) === t.id))}
          className={`grille-bloc-${t.id}`}
        />
      ))}
    </svg>
  )
}
