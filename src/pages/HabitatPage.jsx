import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Input, Popconfirm } from 'antd'
import CarteHabitat from '../components/CarteHabitat'
import { ICONE_CATEGORIE } from '../components/Icones'
import { VignetteObjet, VignettePokemon } from '../components/Vignette'
import { urlSpritePokemon } from '../data/images'
import {
  FR_CATEGORIE,
  MAX_COLOCATAIRES,
  amateursDe,
  comparerParNumero,
  compatibilite,
  compatibiliteAvec,
  frObjet,
  frPokemon,
  habitatDe,
  numeroAffiche,
  objetParNom,
  objetsPourGroupe,
  pokemonParNom,
  preferencesCommunes,
  preferencesDuGroupe,
  prefParSlug,
  prefsParPokemon,
  specialitesDe,
  spritePokemon,
} from '../data'
import { FR_TYPE_OBJET, TYPES_OBJET, TYPES_PAR_DEFAUT, typeObjet } from '../data/categories'
import {
  creerHabitat,
  exporterHabitats,
  habitatDuPokemon,
  importerHabitats,
  modifierHabitat,
  supprimerHabitat,
  useHabitats,
} from '../utils/habitatsStorage'
import { correspond, normaliser } from '../utils/recherche'
import './HabitatPage.css'

/** Ordre d'affichage des catégories de confort dans le décompte. */
const CATEGORIES_CONFORT = ['Relaxation', 'Decoration', 'Toy']

const typeDe = (nom) => typeObjet(nom, objetParNom.get(nom)?.categorie)

const listerParam = (params) =>
  (params.get('pokemon') || '')
    .split(',')
    .map((n) => n.trim())
    .filter((n) => pokemonParNom.has(n))
    .sort(comparerParNumero)

const nomPropose = (noms) => noms.map(frPokemon).join(' + ')

/**
 * L'onglet Habitat, en quatre états lus dans l'URL :
 *
 *   /habitat                       la liste des habitats enregistrés
 *   /habitat?nouveau=1             le sélecteur, pour en composer un (1 à 4 Pokémon)
 *   /habitat?habitat=<id>          un habitat enregistré, et les objets à y poser
 *   /habitat?pokemon=A,B           un groupe libre — non enregistré, partageable par lien
 *
 * Les deux derniers acceptent `&choisir=1` : c'est le mode « ajouter un colocataire ».
 * Le groupe libre existe pour les liens venant des fiches (« Composer un habitat »), et
 * s'enregistre en un clic.
 */
export default function HabitatPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const listeHabitats = useHabitats()

  // Filtres de la vue détaillée : conservés d'un habitat à l'autre, volontairement — on
  // compare souvent deux enclos avec le même filtre en tête.
  const [prefsActives, setPrefsActives] = useState(() => new Set())
  const [typesActifs, setTypesActifs] = useState(() => new Set(TYPES_PAR_DEFAUT))
  const [saisie, setSaisie] = useState('')

  const idHabitat = params.get('habitat')
  const habitat = idHabitat ? listeHabitats.find((h) => h.id === idHabitat) : null
  const groupe = habitat ? [...habitat.pokemon].sort(comparerParNumero) : listerParam(params)
  const enChoix = params.get('choisir') === '1'
  const enCreation = params.get('nouveau') === '1'

  const allerVers = useCallback(
    (suivant) => {
      setParams(suivant, { replace: false })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [setParams],
  )

  const ouvrirHabitat = useCallback((h) => allerVers({ habitat: h.id }), [allerVers])
  const ouvrirGroupe = useCallback((noms) => allerVers({ pokemon: noms.join(',') }), [allerVers])

  /* ---------- création ---------- */

  if (enCreation) {
    return (
      <SelecteurPokemon
        habitats={listeHabitats}
        titre="Composer un habitat"
        sousTitre={`Choisissez de 1 à ${MAX_COLOCATAIRES} Pokémon. Ils partageront le même enclos, donc idéalement le même habitat idéal.`}
        avecNom
        onValider={(noms, nom) => {
          const cree = creerHabitat(nom || nomPropose(noms), noms)
          if (cree) allerVers({ habitat: cree.id })
        }}
        onAnnuler={() => allerVers({})}
      />
    )
  }

  /* ---------- ajout d'un colocataire ---------- */

  if (enChoix && groupe.length) {
    const places = MAX_COLOCATAIRES - groupe.length
    return (
      <SelecteurPokemon
        habitats={listeHabitats}
        deja={groupe}
        titre="Ajouter un colocataire"
        sousTitre={`${nomPropose(groupe)} — ${places} place${places > 1 ? 's' : ''} restante${places > 1 ? 's' : ''}.`}
        onValider={(noms) => {
          const complet = [...groupe, ...noms].sort(comparerParNumero)
          if (habitat) {
            modifierHabitat(habitat.id, { pokemon: complet })
            allerVers({ habitat: habitat.id })
          } else {
            ouvrirGroupe(complet)
          }
        }}
        onAnnuler={() => (habitat ? allerVers({ habitat: habitat.id }) : ouvrirGroupe(groupe))}
      />
    )
  }

  /* ---------- liste ---------- */

  if (!groupe.length) {
    return (
      <ListeHabitats
        habitats={listeHabitats}
        onOuvrir={ouvrirHabitat}
        onNouveau={() => allerVers({ nouveau: '1' })}
        onSupprimer={supprimerHabitat}
      />
    )
  }

  /* ---------- détail ---------- */

  return (
    <VueHabitat
      groupe={groupe}
      habitat={habitat}
      saisie={saisie}
      setSaisie={setSaisie}
      prefsActives={prefsActives}
      setPrefsActives={setPrefsActives}
      typesActifs={typesActifs}
      setTypesActifs={setTypesActifs}
      onAjouter={() =>
        allerVers(habitat ? { habitat: habitat.id, choisir: '1' } : { pokemon: groupe.join(','), choisir: '1' })
      }
      onRetirer={(nom) => {
        const suivant = groupe.filter((m) => m !== nom)
        if (habitat) modifierHabitat(habitat.id, { pokemon: suivant })
        else if (suivant.length) ouvrirGroupe(suivant)
        else allerVers({})
      }}
      onRenommer={(nom) => habitat && modifierHabitat(habitat.id, { nom })}
      onSupprimer={() => {
        if (habitat) supprimerHabitat(habitat.id)
        allerVers({})
      }}
      onEnregistrer={() => {
        const cree = creerHabitat(nomPropose(groupe), groupe)
        if (cree) allerVers({ habitat: cree.id })
      }}
      onRetour={() => allerVers({})}
      onPokemon={(nom) => navigate(`/pokedex/${encodeURIComponent(nom)}`)}
      onObjet={(nom) => navigate(`/objet/${encodeURIComponent(nom)}`)}
    />
  )
}

/* ================================================================= liste */

function ListeHabitats({ habitats, onOuvrir, onNouveau, onSupprimer }) {
  const loges = new Set(habitats.flatMap((h) => h.pokemon))
  const sansHabitat = prefsParPokemon.size - loges.size
  const [sauvegarde, setSauvegarde] = useState(null)
  const [message, setMessage] = useState('')

  return (
    <div className="wrap habitat">
      <div className="liste-tete">
        <div>
          <p className="etiquette">Mes habitats</p>
          <h1>{habitats.length ? `${habitats.length} habitat${habitats.length > 1 ? 's' : ''}` : 'Aucun habitat'}</h1>
          <p className="liste-chapeau">
            Un habitat réunit jusqu’à {MAX_COLOCATAIRES} Pokémon et se souvient d’eux : les
            objets à y poser se recalculent à l’ouverture. {sansHabitat} Pokémon sur{' '}
            {prefsParPokemon.size} n’en ont pas encore.
          </p>
        </div>
        <div className="liste-actions">
          <button type="button" className="ghost-btn primaire" onClick={onNouveau}>
            + Nouvel habitat
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setMessage('')
              setSauvegarde(sauvegarde === null ? exporterHabitats() : null)
            }}
          >
            Sauvegarde
          </button>
        </div>
      </div>

      {/* Les habitats vivent dans le stockage du navigateur : cette zone est le seul moyen
          de les emporter ailleurs, et de les retrouver s'ils disparaissent. */}
      {sauvegarde !== null && (
        <section className="panneau-sauvegarde">
          <h2 className="etiquette">Exporter / importer</h2>
          <p className="indice">
            Le texte ci-dessous contient vos {habitats.length} habitat
            {habitats.length > 1 ? 's' : ''} : conservez-le quelque part. Pour les restaurer —
            ici ou dans une autre installation — collez un export à la place et cliquez sur
            « Importer ». Les habitats déjà présents ne sont jamais écrasés.
          </p>
          <textarea
            className="zone-sauvegarde"
            value={sauvegarde}
            spellCheck={false}
            aria-label="Sauvegarde des habitats, au format JSON"
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
                const r = importerHabitats(sauvegarde)
                if (r.erreur) setMessage(r.erreur)
                else
                  setMessage(
                    `${r.ajoutes} habitat${r.ajoutes > 1 ? 's' : ''} ajouté${r.ajoutes > 1 ? 's' : ''}` +
                      (r.ignores ? `, ${r.ignores} déjà présent${r.ignores > 1 ? 's' : ''}` : '') +
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
                setSauvegarde(exporterHabitats())
                setMessage('')
              }}
            >
              Réafficher l’export
            </button>
            {message && <span className="message-sauvegarde">{message}</span>}
          </div>
        </section>
      )}

      {habitats.length ? (
        <div className="grille-habitats">
          {habitats.map((h) => (
            <CarteHabitat key={h.id} habitat={h} onOuvrir={onOuvrir} onSupprimer={onSupprimer} />
          ))}
        </div>
      ) : (
        <div className="vide">
          <p>
            Rien d’enregistré pour l’instant. Composez-en un, ou partez d’une fiche du{' '}
            <Link to="/pokedex">Pokédex</Link>.
          </p>
        </div>
      )}
    </div>
  )
}

/* ============================================================= sélecteur */

/**
 * Choix de 1 à 4 Pokémon. La bascule « sans habitat » est active d'office dès qu'un
 * habitat existe : on compose en général pour les Pokémon qui n'ont pas encore de place,
 * et les 366 vignettes d'un coup noient les quelques-uns qui restent à loger.
 */
function SelecteurPokemon({ habitats, deja = [], titre, sousTitre, avecNom = false, onValider, onAnnuler }) {
  const [choisis, setChoisis] = useState([])
  const [saisie, setSaisie] = useState('')
  const [nom, setNom] = useState('')
  const [sansHabitatSeul, setSansHabitatSeul] = useState(() => habitats.length > 0)
  // Éteint par défaut : trier par compatibilité reclasse la liste à chaque choix, si bien
  // que le Pokémon qu'on vient de cliquer change de place et paraît disparaître. L'ordre du
  // Pokédex ne bouge pas, on voit la vignette passer à l'état sélectionné là où elle est.
  const [triCompat, setTriCompat] = useState(false)

  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())
  const places = MAX_COLOCATAIRES - deja.length - choisis.length

  /** Le groupe tel qu'il est à cet instant : les colocataires déjà là, plus les choisis. */
  const groupeEnCours = useMemo(() => [...deja, ...choisis], [deja, choisis])
  const tauxGroupe = compatibilite(groupeEnCours)

  const liste = useMemo(() => {
    let noms = [...prefsParPokemon.keys()].filter((n) => !deja.includes(n))
    if (sansHabitatSeul) noms = noms.filter((n) => choisis.includes(n) || !habitatDuPokemon(habitats, n))
    if (terme) noms = noms.filter((n) => correspond(terme, n, frPokemon(n)))

    // Sans groupe en cours, il n'y a rien à comparer : on retombe sur l'ordre du Pokédex.
    if (triCompat && groupeEnCours.length)
      return noms.sort(
        (a, b) =>
          (compatibiliteAvec(groupeEnCours, b) ?? -1) - (compatibiliteAvec(groupeEnCours, a) ?? -1) ||
          comparerParNumero(a, b),
      )
    return noms.sort(comparerParNumero)
  }, [terme, sansHabitatSeul, habitats, deja, choisis, triCompat, groupeEnCours])

  const basculer = (nomPokemon) =>
    setChoisis((precedent) =>
      precedent.includes(nomPokemon)
        ? precedent.filter((n) => n !== nomPokemon)
        : precedent.length + deja.length < MAX_COLOCATAIRES
          ? [...precedent, nomPokemon]
          : precedent,
    )

  const tries = [...choisis].sort(comparerParNumero)

  return (
    <div className="wrap selecteur">
      <div className="selecteur-tete">
        <div>
          <p className="etiquette">{titre}</p>
          <p className="liste-chapeau">{sousTitre}</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onAnnuler}>
          Annuler
        </button>
      </div>

      <div className="panier">
        <div className="panier-choix">
          {tries.length ? (
            tries.map((n) => (
              <button
                key={n}
                type="button"
                className="jeton"
                title={`Retirer ${frPokemon(n)}`}
                onClick={() => basculer(n)}
              >
                <img src={urlSpritePokemon(spritePokemon(n))} alt="" width="34" height="34" />
                {frPokemon(n)} <span aria-hidden="true">×</span>
              </button>
            ))
          ) : (
            <span className="panier-vide">Aucun Pokémon choisi pour l’instant.</span>
          )}
        </div>

        <div className="panier-actions">
          {avecNom && (
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder={tries.length ? nomPropose(tries) : 'Nom de l’habitat'}
              aria-label="Nom de l’habitat"
              maxLength={40}
              style={{ width: 240 }}
            />
          )}
          {tauxGroupe !== null && (
            <span
              className={'jauge-compat ' + (tauxGroupe >= 40 ? 'fort' : tauxGroupe >= 15 ? 'moyen' : 'faible')}
              title="Recouvrement moyen des préférences, paire par paire"
            >
              <b>{tauxGroupe} %</b> compatibles
            </span>
          )}
          <span className="panier-compte">
            {deja.length + choisis.length}/{MAX_COLOCATAIRES}
          </span>
          <button
            type="button"
            className="ghost-btn primaire"
            disabled={!choisis.length}
            onClick={() => onValider(tries, nom.trim())}
          >
            {avecNom ? 'Créer l’habitat' : 'Ajouter'}
          </button>
        </div>
      </div>

      <div className="selecteur-filtres">
        <div className="champ-groupe">
          <Input
            allowClear
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Chercher un Pokémon…"
            aria-label="Chercher un Pokémon"
          />
        </div>
        <button
          type="button"
          className="bascule"
          aria-pressed={sansHabitatSeul}
          onClick={() => setSansHabitatSeul((v) => !v)}
        >
          Sans habitat seulement
        </button>
        <button
          type="button"
          className="bascule"
          aria-pressed={triCompat}
          disabled={!groupeEnCours.length}
          title={
            groupeEnCours.length
              ? 'Les Pokémon dont les goûts recoupent le plus le groupe en premier'
              : 'Choisissez d’abord un Pokémon : il n’y a rien à comparer'
          }
          onClick={() => setTriCompat((v) => !v)}
        >
          Trier par compatibilité
        </button>
        <span className="statut">{liste.length} Pokémon</span>
      </div>

      {liste.length ? (
        <div className="chips">
          {liste.map((n) => {
            const loge = habitatDuPokemon(habitats, n)
            return (
              <VignettePokemon
                key={n}
                nom={n}
                trouve={!!terme}
                selectionne={choisis.includes(n)}
                note={loge ? loge.nom : ''}
                desactive={places <= 0 && !choisis.includes(n)}
                score={groupeEnCours.length ? compatibiliteAvec(groupeEnCours, n) : null}
                onClick={() => basculer(n)}
              />
            )
          })}
        </div>
      ) : (
        <div className="vide">
          <p>
            Aucun Pokémon ne correspond
            {sansHabitatSeul ? ' — tous ceux qui restent vivent déjà quelque part' : ''}.
          </p>
        </div>
      )}
    </div>
  )
}

/* ================================================================ détail */

function VueHabitat({
  groupe,
  habitat,
  saisie,
  setSaisie,
  prefsActives,
  setPrefsActives,
  typesActifs,
  setTypesActifs,
  onAjouter,
  onRetirer,
  onRenommer,
  onSupprimer,
  onEnregistrer,
  onRetour,
  onPokemon,
  onObjet,
}) {
  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())

  const toutesLesPrefs = useMemo(() => preferencesDuGroupe(groupe), [groupe])
  // Le filtre survit à un changement de groupe : les préférences retenues peuvent alors
  // n'appartenir à personne. On retombe sur « toutes » plutôt que d'afficher une liste
  // vide sans bouton coché pour l'expliquer.
  const retenues = toutesLesPrefs.filter((s) => prefsActives.has(s))
  const slugsActifs = retenues.length ? retenues : toutesLesPrefs

  const objets = useMemo(() => objetsPourGroupe(groupe, slugsActifs), [groupe, slugsActifs])

  /** Décompte par catégorie de meuble, calculé avant filtrage : les bascules le montrent. */
  const parType = useMemo(() => {
    const compte = Object.fromEntries(TYPES_OBJET.map((t) => [t, 0]))
    for (const o of objets) compte[typeDe(o.nom)] += 1
    return compte
  }, [objets])

  const objetsFiltres = useMemo(() => {
    const gardes = objets.filter((o) => typesActifs.has(typeDe(o.nom)))
    return terme ? gardes.filter((o) => correspond(terme, o.nom, frObjet(o.nom))) : gardes
  }, [objets, typesActifs, terme])

  const confort = useMemo(() => {
    const compte = { Relaxation: 0, Decoration: 0, Toy: 0 }
    for (const o of objetsFiltres) {
      const categorie = objetParNom.get(o.nom)?.categorie
      if (categorie in compte) compte[categorie] += 1
    }
    return compte
  }, [objetsFiltres])

  const solo = groupe.length === 1
  const taux = compatibilite(groupe)
  const communes = preferencesCommunes(groupe)
  const zones = [...new Set(groupe.map(habitatDe).filter(Boolean))]
  const portee = retenues.length
    ? `${slugsActifs.length} préférence${slugsActifs.length > 1 ? 's' : ''} sur ${toutesLesPrefs.length}`
    : `${toutesLesPrefs.length} préférences${solo ? '' : ' cumulées'}`
  const masques = objets.length - objetsFiltres.length

  return (
    <div className="wrap habitat">
      <button type="button" className="retour" onClick={onRetour}>
        ← Mes habitats
      </button>

      <div className="entete-groupe">
        <div className="entete-identite">
          {habitat ? (
            <Input
              key={habitat.id}
              className="champ-nom"
              defaultValue={habitat.nom}
              maxLength={40}
              aria-label="Nom de l’habitat"
              onBlur={(e) => onRenommer(e.target.value.trim() || habitat.nom)}
              onPressEnter={(e) => e.target.blur()}
            />
          ) : (
            <span className="etiquette">Groupe libre, non enregistré</span>
          )}

          <div className="colocataires">
            {groupe.map((nom) => (
              <div key={nom} className="colocataire">
                <button
                  type="button"
                  className="colocataire-lien"
                  title={`Ouvrir la fiche de ${frPokemon(nom)}`}
                  onClick={() => onPokemon(nom)}
                >
                  <img src={urlSpritePokemon(spritePokemon(nom))} alt="" width="56" height="56" />
                  <span className="colocataire-id">
                    <strong>{frPokemon(nom)}</strong>
                    <span>
                      {numeroAffiche(nom)}
                      {habitatDe(nom) ? ` · ${habitatDe(nom).toLowerCase()}` : ''} ·{' '}
                      {(prefsParPokemon.get(nom) || []).length} préf.
                    </span>
                    {specialitesDe(nom).length > 0 && (
                      <span className="colocataire-specialite">
                        {specialitesDe(nom).join(' · ')}
                      </span>
                    )}
                  </span>
                </button>
                {groupe.length > 1 && (
                  <button
                    type="button"
                    className="retirer"
                    aria-label={`Retirer ${frPokemon(nom)}`}
                    onClick={() => onRetirer(nom)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="entete-actions">
          {groupe.length < MAX_COLOCATAIRES ? (
            <button type="button" className="ghost-btn" onClick={onAjouter}>
              + Ajouter un colocataire
            </button>
          ) : (
            <span className="note-max">{MAX_COLOCATAIRES} colocataires maximum</span>
          )}
          {habitat ? (
            <Popconfirm
              title={`Supprimer « ${habitat.nom} » ?`}
              description="Les Pokémon redeviennent disponibles pour un autre habitat."
              okText="Supprimer"
              cancelText="Annuler"
              okButtonProps={{ danger: true }}
              onConfirm={onSupprimer}
            >
              <button type="button" className="ghost-btn">
                Supprimer
              </button>
            </Popconfirm>
          ) : (
            <button type="button" className="ghost-btn primaire" onClick={onEnregistrer}>
              Enregistrer cet habitat
            </button>
          )}
        </div>
      </div>

      {taux !== null && (
        <p className={'bandeau-compat ' + (taux >= 40 ? 'fort' : taux >= 15 ? 'moyen' : 'faible')}>
          <strong>{taux} % de compatibilité</strong> — recouvrement moyen des préférences, paire
          par paire.{' '}
          {communes.length
            ? `${communes.length} préférence${communes.length > 1 ? 's' : ''} appréciée${communes.length > 1 ? 's' : ''} par tout le groupe : ${communes.map((s) => prefParSlug.get(s).fr).join(', ')}.`
            : 'Aucune préférence ne fait l’unanimité : chaque objet ne contentera qu’une partie du groupe.'}
        </p>
      )}

      {zones.length > 1 && (
        <p className="avertissement">
          Habitats différents dans ce groupe ({zones.map((h) => h.toLowerCase()).join(', ')}) — un
          même enclos ne peut satisfaire qu’un seul habitat.
        </p>
      )}

      <div className="barre-filtres">
        <div className="champ-groupe">
          <Input
            allowClear
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={`Chercher parmi les objets de ${solo ? frPokemon(groupe[0]) : 'ce groupe'}…`}
            aria-label="Chercher parmi les objets de ce groupe"
          />
        </div>

        <div className="titre-filtre">
          <h3 className="etiquette">Catégorie d’objet</h3>
          <span className="actions-filtre">
            <button
              type="button"
              className="mini-btn"
              disabled={typesActifs.size === TYPES_OBJET.length}
              onClick={() => setTypesActifs(new Set(TYPES_OBJET))}
            >
              Tout sélectionner
            </button>
            <button
              type="button"
              className="mini-btn"
              disabled={typesActifs.size === 0}
              onClick={() => setTypesActifs(new Set())}
            >
              Tout désélectionner
            </button>
          </span>
        </div>
        <p className="indice">
          Les fossiles et les ressources — matériaux, peintures, revêtements, disques — sont
          masqués par défaut : ils ne meublent rien.
        </p>
        <div className="bascules">
          {TYPES_OBJET.map((type) => {
            const IconeCat = ICONE_CATEGORIE[type]
            return (
            <button
              key={type}
              type="button"
              className="bascule teintee"
              style={{ '--teinte': `var(--c-${type})`, '--teinte-fond': `var(--c-${type}-fond)` }}
              aria-pressed={typesActifs.has(type)}
              onClick={() =>
                setTypesActifs((precedent) => {
                  const suivant = new Set(precedent)
                  if (suivant.has(type)) suivant.delete(type)
                  else suivant.add(type)
                  return suivant
                })
              }
            >
              <IconeCat />
              {FR_TYPE_OBJET[type]} <b>{parType[type]}</b>
            </button>
          )})}
        </div>

        <h3 className="etiquette second">Filtrer par préférence</h3>
        <p className="indice">
          Cumulatif : chaque préférence ajoutée élargit la liste. Aucune sélection = toutes.
          {solo ? '' : ` Le compteur indique combien des ${groupe.length} colocataires l’apprécient.`}
        </p>
        <div className="bascules">
          <button
            type="button"
            className="bascule reset"
            aria-pressed={retenues.length === 0}
            onClick={() => setPrefsActives(new Set())}
          >
            Toutes
          </button>
          {toutesLesPrefs.map((slug) => {
            const amateurs = amateursDe(groupe, slug)
            return (
              <button
                key={slug}
                type="button"
                className="bascule"
                aria-pressed={prefsActives.has(slug)}
                title={amateurs.map(frPokemon).join(', ')}
                onClick={() =>
                  setPrefsActives((precedent) => {
                    const suivant = new Set(precedent)
                    if (suivant.has(slug)) suivant.delete(slug)
                    else suivant.add(slug)
                    return suivant
                  })
                }
              >
                {prefParSlug.get(slug).fr}{' '}
                <b>
                  {prefParSlug.get(slug).objets.length}
                  {solo ? '' : ` · ${amateurs.length}/${groupe.length}`}
                </b>
              </button>
            )
          })}
        </div>
      </div>

      <div className="resultats">
        <h3 className="etiquette">
          {objetsFiltres.length} objets · {portee}
          {masques > 0 ? ` · ${masques} masqués par les filtres` : ''}
        </h3>
        <p className="confort">
          {CATEGORIES_CONFORT.map((c) => `${FR_CATEGORIE[c]} ${confort[c]}`).join(' · ')} — un
          habitat « exceptionnel » demande au moins un objet de chaque.
        </p>

        {objetsFiltres.length ? (
          <div className="chips">
            {objetsFiltres.map((o) => (
              <VignetteObjet
                key={o.nom}
                nom={o.nom}
                trouve={!!terme}
                nbPrefs={o.prefs.length}
                nomsPrefs={o.prefs.map((s) => prefParSlug.get(s).fr).join(' + ')}
                nbPokemon={solo ? 0 : o.pokemonSatisfaits.length}
                nomsPokemon={solo ? '' : o.pokemonSatisfaits.map(frPokemon).join(', ')}
                onClick={() => onObjet(o.nom)}
              />
            ))}
          </div>
        ) : (
          <p className="vide">
            Aucun objet ne correspond{terme ? ` à « ${saisieDifferee.trim()} »` : ' à ces filtres'}.
          </p>
        )}
      </div>
    </div>
  )
}
