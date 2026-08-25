import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input, Select } from 'antd'
import { ICONE_VILLE } from '../components/Icones'
import { VignettePokemon } from '../components/Vignette'
import { comparerParNumero, frPokemon, pokemonParNom } from '../data'
import { VILLES, cleVilleValide, habitatsDeVille, nbOfficielles } from '../data/villes'
import { correspond, normaliser } from '../utils/recherche'
import {
  attribuerVille,
  exporterVilles,
  importerVilles,
  nomVille,
  pokemonParVille,
  reinitialiserVille,
  renommerVille,
  useAttributions,
  useNomsVilles,
  villeDe,
} from '../utils/villesStorage'
import './VillesPage.css'

/**
 * La vue Villes : les 366 Pokémon rangés par région de l'île, et de quoi les déplacer.
 *
 * Deux états, lus dans l'URL :
 *   /villes                 les six villes, chacune avec ses Pokémon
 *   /villes?ville=<cle>     une seule ville
 *
 * La page a deux modes, parce que le même clic ne peut pas vouloir dire deux choses :
 * en consultation, une vignette ouvre la fiche du Pokémon ; en réattribution, elle le
 * sélectionne, et une barre d'actions envoie la sélection ailleurs.
 *
 * Le rattachement affiché n'est pas toujours une donnée du jeu — aucune source ne le
 * publie. La page dit toujours d'où il vient (cf. `FR_SOURCE_VILLE`), et c'est ce qui
 * justifie la réattribution : on corrige une déduction, on ne contredit pas le jeu.
 */
export default function VillesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const attributions = useAttributions()
  const noms = useNomsVilles()

  const [saisie, setSaisie] = useState('')
  const [reattribution, setReattribution] = useState(false)
  const [selection, setSelection] = useState(() => new Set())
  const [sauvegarde, setSauvegarde] = useState(null)
  const [message, setMessage] = useState('')
  // Le sélecteur de destination n'a pas de valeur : c'est un ordre, pas un état. Sans
  // contrôler son ouverture, il resterait déplié après un déplacement, par-dessus la grille
  // dont on vient de retirer les Pokémon.
  const [destinationOuverte, setDestinationOuverte] = useState(false)

  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())

  const filtre = params.get('ville')
  const villeActive = cleVilleValide(filtre) ? filtre : null

  const parVille = useMemo(() => pokemonParVille(attributions), [attributions])

  /** Les villes à afficher, chacune avec ses Pokémon triés puis filtrés par la recherche. */
  const sections = useMemo(
    () =>
      VILLES.filter((v) => !villeActive || v.cle === villeActive).map((v) => {
        const tous = [...parVille[v.cle]].sort(comparerParNumero)
        return {
          ...v,
          total: tous.length,
          liste: terme ? tous.filter((n) => correspond(terme, n, frPokemon(n))) : tous,
        }
      }),
    [parVille, villeActive, terme],
  )

  const affiches = sections.reduce((n, s) => n + s.liste.length, 0)

  const choisir = (cle) => {
    setParams(cle ? { ville: cle } : {}, { replace: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const basculer = (nom) =>
    setSelection((precedent) => {
      const suivant = new Set(precedent)
      if (suivant.has(nom)) suivant.delete(nom)
      else suivant.add(nom)
      return suivant
    })

  const deplacer = (cle) => {
    const bouges = attribuerVille([...selection], cle)
    setMessage(
      bouges
        ? `${bouges} Pokémon déplacé${bouges > 1 ? 's' : ''} vers ${nomVille(noms, cle)}.`
        : `Rien à déplacer : cette sélection est déjà à ${nomVille(noms, cle)}.`,
    )
    setSelection(new Set())
    setDestinationOuverte(false)
  }

  const rendreDefaut = () => {
    const effaces = reinitialiserVille([...selection])
    setMessage(
      effaces
        ? `${effaces} réattribution${effaces > 1 ? 's' : ''} annulée${effaces > 1 ? 's' : ''}.`
        : 'Aucun de ces Pokémon n’avait été réattribué.',
    )
    setSelection(new Set())
  }

  const nbReattribues = Object.keys(attributions).length
  /** Combien de Pokémon suivent encore la déduction — le reste à corriger, affiché en tête. */
  const nbDeduits = useMemo(
    () => [...pokemonParNom.keys()].filter((n) => villeDe(attributions, n).source === 'habitat').length,
    [attributions],
  )

  return (
    <>
      <div className="controls">
        <div className="wrap controls-inner">
          <div className="field">
            <Input
              allowClear
              size="large"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Chercher un Pokémon…"
              aria-label="Chercher un Pokémon"
            />
          </div>
          <Select
            allowClear
            size="large"
            value={villeActive}
            onChange={(cle) => choisir(cle || null)}
            placeholder="Ville"
            aria-label="Filtrer par ville"
            style={{ minWidth: 220 }}
            options={VILLES.map((v) => ({
              value: v.cle,
              label: `${nomVille(noms, v.cle)} (${parVille[v.cle].length})`,
            }))}
          />
          <button
            type="button"
            className={'ghost-btn' + (reattribution ? ' primaire' : '')}
            aria-pressed={reattribution}
            onClick={() => {
              setReattribution((v) => !v)
              setSelection(new Set())
              setMessage('')
            }}
          >
            {reattribution ? 'Terminer la réattribution' : 'Réattribuer des Pokémon'}
          </button>
          <span className="statut">
            {affiches} Pokémon{terme ? ` sur ${pokemonParNom.size}` : ''}
          </span>
        </div>
      </div>

      <div className="wrap villes">
        <div className="villes-tete">
          <div>
            <p className="etiquette">Les villes de Pokopia</p>
            <h1>{villeActive ? nomVille(noms, villeActive) : 'Six régions, 366 Pokémon'}</h1>
            <p className="liste-chapeau">
              Où vit chaque Pokémon de l’île. Le rattachement est réattribuable : cliquez sur
              « Réattribuer des Pokémon », sélectionnez-en un ou plusieurs, et envoyez-les
              ailleurs. {nbReattribues > 0 && `${nbReattribues} déjà déplacé${nbReattribues > 1 ? 's' : ''} à la main.`}
            </p>
          </div>
          <div className="liste-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setMessage('')
                setSauvegarde(sauvegarde === null ? exporterVilles() : null)
              }}
            >
              Sauvegarde
            </button>
          </div>
        </div>

        {/* Aucune source ne publie la ville d'origine : dire d'où vient chaque rattachement est
            la seule façon de rendre la page honnête, et c'est ce qui justifie la réattribution. */}
        <p className="note-source">
          {nbOfficielles > 0 ? (
            <>
              <b>{nbOfficielles} rattachements sur {pokemonParNom.size}</b> viennent d’une liste
              relevée en jeu, et les 52 entrées du bassin de leur Pokédex.{' '}
            </>
          ) : null}
          Les {nbDeduits} restants sont <b>déduits de l’habitat idéal</b> — Terrassec est en plein
          soleil, Grisemer est un port humide, Collinangle est minérale, Flotîles-Millefeux porte
          ses mille feux — parce qu’aucune source ne publie la ville d’origine des Pokémon. Ils
          portent la mention « déduit » : c’est eux qu’il reste à corriger.
        </p>

        {sauvegarde !== null && (
          <section className="panneau-sauvegarde">
            <h2 className="etiquette">Exporter / importer les réattributions</h2>
            <p className="indice">
              Vos déplacements et le nom que vous avez donné à votre ville, au format JSON :
              conservez-le quelque part. Un import <b>corrige</b> ce qui est déjà là — la
              réattribution la plus récente gagne, contrairement à l’import d’habitats qui
              n’écrase jamais rien.
            </p>
            <textarea
              className="zone-sauvegarde"
              value={sauvegarde}
              spellCheck={false}
              aria-label="Sauvegarde des réattributions de ville, au format JSON"
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
                  const r = importerVilles(sauvegarde)
                  setMessage(
                    r.erreur ||
                      `${r.attributions} réattribution${r.attributions > 1 ? 's' : ''} appliquée${r.attributions > 1 ? 's' : ''}` +
                        (r.noms ? `, ${r.noms} ville renommée` : '') +
                        '.',
                  )
                }}
              >
                Importer
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setSauvegarde(exporterVilles())
                  setMessage('')
                }}
              >
                Réafficher l’export
              </button>
              {message && <span className="message-sauvegarde">{message}</span>}
            </div>
          </section>
        )}

        <div className="villes-bascules">
          <button
            type="button"
            className="bascule reset"
            aria-pressed={villeActive === null}
            onClick={() => choisir(null)}
          >
            Toute l’île <b>{pokemonParNom.size}</b>
          </button>
          {VILLES.map((v) => {
            const IconeVil = ICONE_VILLE[v.cle]
            return (
              <button
                key={v.cle}
                type="button"
                className="bascule teintee"
                style={{ '--teinte': `var(--v-${v.cle})`, '--teinte-fond': `var(--v-${v.cle}-fond)` }}
                aria-pressed={villeActive === v.cle}
                title={v.resume}
                onClick={() => choisir(villeActive === v.cle ? null : v.cle)}
              >
                {IconeVil && <IconeVil />}
                {nomVille(noms, v.cle)} <b>{parVille[v.cle].length}</b>
              </button>
            )
          })}
        </div>

        {/* La barre ne s'affiche qu'en réattribution : hors de ce mode, elle promettrait une
            action que le clic sur une vignette ne déclenche pas. */}
        {reattribution && (
          <div className="barre-selection">
            <span className="barre-selection-compte">
              {selection.size
                ? `${selection.size} Pokémon sélectionné${selection.size > 1 ? 's' : ''}`
                : 'Cliquez les Pokémon à déplacer'}
            </span>
            <Select
              value={null}
              placeholder="Déplacer vers…"
              aria-label="Ville de destination"
              disabled={!selection.size}
              style={{ minWidth: 210 }}
              open={destinationOuverte}
              onDropdownVisibleChange={setDestinationOuverte}
              onChange={deplacer}
              options={VILLES.map((v) => ({ value: v.cle, label: nomVille(noms, v.cle) }))}
            />
            <button
              type="button"
              className="mini-btn"
              disabled={!affiches}
              onClick={() => setSelection(new Set(sections.flatMap((s) => s.liste)))}
            >
              Tout sélectionner ({affiches})
            </button>
            <button
              type="button"
              className="mini-btn"
              disabled={!selection.size}
              onClick={() => setSelection(new Set())}
            >
              Tout désélectionner
            </button>
            <button
              type="button"
              className="mini-btn"
              disabled={!selection.size}
              onClick={rendreDefaut}
              title="Rend à la sélection sa ville déduite, et efface vos déplacements"
            >
              Rendre la ville par défaut
            </button>
            {message && !sauvegarde && <span className="message-sauvegarde">{message}</span>}
          </div>
        )}

        {sections.map((section) => (
          <SectionVille
            key={section.cle}
            section={section}
            noms={noms}
            attributions={attributions}
            terme={terme}
            reattribution={reattribution}
            selection={selection}
            onBasculer={basculer}
            onOuvrir={(nom) => navigate(`/pokedex/${encodeURIComponent(nom)}`)}
            onSelectionnerTout={(liste) =>
              setSelection((precedent) => new Set([...precedent, ...liste]))
            }
          />
        ))}

        {affiches === 0 && (
          <div className="vide">
            <p>
              Aucun Pokémon ne correspond
              {terme ? ` à « ${saisieDifferee.trim()} »` : ''}. La recherche accepte le français
              et l’anglais.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

/* ============================================================ une ville */

/**
 * Une ville et ses Pokémon. Le nom est modifiable pour Ville-Nouvelle : c'est la ville que
 * le joueur bâtit, elle porte le nom qu'il lui a donné en jeu.
 */
function SectionVille({
  section,
  noms,
  attributions,
  terme,
  reattribution,
  selection,
  onBasculer,
  onOuvrir,
  onSelectionnerTout,
}) {
  const IconeVil = ICONE_VILLE[section.cle]
  const habitats = habitatsDeVille(section.cle)
  const perso = section.liste.filter((n) => villeDe(attributions, n).source === 'perso').length
  const deduits = section.liste.filter((n) => villeDe(attributions, n).source === 'habitat').length

  return (
    <section
      className="ville-section"
      style={{ '--teinte': `var(--v-${section.cle})`, '--teinte-fond': `var(--v-${section.cle}-fond)` }}
    >
      <header className="ville-tete">
        <h2 className="ville-nom">
          {IconeVil && <IconeVil />}
          {section.personnalisable ? (
            <Input
              className="champ-ville"
              defaultValue={noms[section.cle] || ''}
              placeholder={section.nom}
              maxLength={40}
              aria-label="Nom de votre ville"
              onBlur={(e) => renommerVille(section.cle, e.target.value)}
              onPressEnter={(e) => e.target.blur()}
            />
          ) : (
            nomVille(noms, section.cle)
          )}
        </h2>
        <p className="ville-resume">
          {section.resume}
          {habitats.length > 0 && ` Habitat${habitats.length > 1 ? 's' : ''} : ${habitats.join(', ').toLowerCase()}.`}
        </p>
        <p className="ville-compte">
          {terme && section.liste.length !== section.total
            ? `${section.liste.length} sur ${section.total} Pokémon`
            : `${section.total} Pokémon`}
          {deduits > 0 && ` · ${deduits} déduit${deduits > 1 ? 's' : ''}`}
          {perso > 0 && ` · ${perso} réattribué${perso > 1 ? 's' : ''} par vous`}
          {reattribution && section.liste.length > 0 && (
            <>
              {' · '}
              <button
                type="button"
                className="mini-btn"
                onClick={() => onSelectionnerTout(section.liste)}
              >
                sélectionner cette ville
              </button>
            </>
          )}
        </p>
      </header>

      {section.liste.length ? (
        <div className="chips">
          {section.liste.map((nom) => {
            const { source } = villeDe(attributions, nom)
            return (
              <VignettePokemon
                key={nom}
                nom={nom}
                trouve={!!terme}
                selectionne={reattribution && selection.has(nom)}
                note={source === 'perso' ? 'réattribué' : source === 'habitat' ? 'déduit' : ''}
                score={null}
                onClick={() => (reattribution ? onBasculer(nom) : onOuvrir(nom))}
              />
            )
          })}
        </div>
      ) : (
        <p className="ville-vide">
          {terme ? 'Aucune correspondance ici.' : 'Personne pour l’instant.'}
        </p>
      )}
    </section>
  )
}
