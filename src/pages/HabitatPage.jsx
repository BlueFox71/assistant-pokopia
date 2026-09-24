import { Fragment, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Checkbox, Input, Popconfirm, Segmented, Select, Slider, Tooltip } from 'antd'
import CarteHabitat from '../components/CarteHabitat'
import { ICONE_CATEGORIE, ICONE_GOUT, ICONE_VILLE } from '../components/Icones'
import ProgressionVilles from '../components/ProgressionVilles'
import { VignetteObjet, VignettePokemon } from '../components/Vignette'
import { urlSpriteAliment, urlSpritePokemon } from '../data/images'
import {
  FR_CATEGORIE,
  MAX_COLOCATAIRES,
  alimentsDe,
  amateursDe,
  comparerParNumero,
  compatibilite,
  compatibiliteAvec,
  completerLot,
  frAliment,
  frObjet,
  frPokemon,
  goutBrutDe,
  goutDe,
  habitatDe,
  logeable,
  lotMinimal,
  numeroAffiche,
  objetParNom,
  objetsCommuns,
  objetsPourGroupe,
  pokemonParNom,
  preferencesDuGroupe,
  prefParSlug,
  prefsParPokemon,
  specialitesDe,
  spritePokemon,
} from '../data'
import { FR_TYPE_OBJET, TYPES_OBJET, TYPES_PAR_DEFAUT, typeObjet } from '../data/categories'
import { VILLES, cleVilleValide } from '../data/villes'
import {
  cleVilleDe,
  nomVille,
  useAttributions,
  useNomsVilles,
} from '../utils/villesStorage'
import {
  creerHabitat,
  exporterHabitats,
  habitatDuPokemon,
  importerHabitats,
  modifierHabitat,
  nomDeGroupe,
  supprimerHabitat,
  useHabitats,
} from '../utils/habitatsStorage'
import { correspond, normaliser } from '../utils/recherche'
import './HabitatPage.css'

/** Ordre d'affichage des catégories de confort dans le décompte. */
const CATEGORIES_CONFORT = ['Relaxation', 'Decoration', 'Toy']

/** Ce que montre le filtre de catégories quand aucune case n'est cochée. */
const TYPES_VISIBLES_PAR_DEFAUT = new Set(TYPES_PAR_DEFAUT)

/** Profondeur du classement de « Suggestion colocataire » : ce que « Suivant » peut parcourir. */
const MAX_SUGGESTIONS = 8

/**
 * Les trois ordres de la liste d'objets.
 *
 * « Utilité » reste le défaut : ce qui contente le plus de colocataires d'un coup est ce
 * qu'on veut poser en premier. Les deux autres classent sur le seul nombre de préférences
 * cochées — le badge « N préf. » de la vignette —, pour répondre à deux questions
 * différentes : quel objet fait mouche le plus largement, et lequel ne coche qu'une case,
 * quand il reste justement une préférence à satisfaire.
 */
const TRIS_OBJETS = [
  { value: 'utilite', label: 'Utilité' },
  { value: 'prefs-desc', label: 'Préférences ↓' },
  { value: 'prefs-asc', label: 'Préférences ↑' },
]

/**
 * Bornes du curseur de taille, en pixels de sprite.
 *
 * 32 px tient encore le badge « 4 Pokémon » sous l'image, et met huit cents objets à
 * l'écran d'un coup — c'est la vue d'ensemble, où l'on cherche une silhouette. 128 px est
 * le plafond utile : les sprites sont des WebP de 44 px, et au-delà l'agrandissement se
 * voit. 60 px, le défaut, est la taille des autres vues — on y revient d'un double-clic
 * sur le curseur.
 */
const TAILLE_MIN = 32
const TAILLE_MAX = 128
const TAILLE_DEFAUT = 60

/**
 * Bornes du curseur de taille du lot. Le lot minimal d'un groupe de quatre compte de 4 à 8
 * objets, parfois 3 : 6 par défaut le complète le plus souvent d'un ou deux objets de
 * réserve, et 12 laisse de quoi doubler chaque préférence. Le curseur ne descend jamais sous
 * le lot minimal — en dessous, une préférence resterait à découvert.
 */
const LOT_DEFAUT = 6
const LOT_MAX = 12

const typeDe = (nom) => typeObjet(nom, objetParNom.get(nom)?.categorie)

const listerParam = (params) =>
  (params.get('pokemon') || '')
    .split(',')
    .map((n) => n.trim())
    .filter((n) => pokemonParNom.has(n))
    .sort(comparerParNumero)


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
  // Vide au départ, et vide veut dire « tout sauf fossiles et ressources » : le filtre part
  // d'un état neutre, où cocher une catégorie restreint au lieu d'avoir à décocher les onze
  // autres.
  const [typesActifs, setTypesActifs] = useState(() => new Set())
  // « Choses en commun » : une vue à part, qui court-circuite les deux filtres ci-dessus.
  const [modeCommun, setModeCommun] = useState(false)
  const [triObjets, setTriObjets] = useState('utilite')
  // Taille des vignettes et compteurs sous l'image : deux réglages d'affichage, retenus
  // d'un habitat à l'autre comme les filtres — on n'a pas à les refaire à chaque enclos.
  const [tailleObjets, setTailleObjets] = useState(TAILLE_DEFAUT)
  const [compteursObjets, setCompteursObjets] = useState(true)
  // Le lot minimal est replié par défaut : c'est une réponse qu'on va chercher, pas une
  // grille de plus à faire défiler avant d'arriver aux filtres. Retenu d'un habitat à
  // l'autre, comme les réglages ci-dessus.
  const [lotOuvert, setLotOuvert] = useState(false)
  const [tailleLot, setTailleLot] = useState(LOT_DEFAUT)
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
        creation
        villeInitiale={params.get('ville')}
        onValider={(noms) => {
          const cree = creerHabitat(noms)
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
        sousTitre={`${nomDeGroupe(groupe)} — ${places} place${places > 1 ? 's' : ''} restante${places > 1 ? 's' : ''}.`}
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
      modeCommun={modeCommun}
      setModeCommun={setModeCommun}
      triObjets={triObjets}
      setTriObjets={setTriObjets}
      tailleObjets={tailleObjets}
      setTailleObjets={setTailleObjets}
      compteursObjets={compteursObjets}
      setCompteursObjets={setCompteursObjets}
      lotOuvert={lotOuvert}
      setLotOuvert={setLotOuvert}
      tailleLot={tailleLot}
      setTailleLot={setTailleLot}
      onAjouter={() =>
        allerVers(habitat ? { habitat: habitat.id, choisir: '1' } : { pokemon: groupe.join(','), choisir: '1' })
      }
      onRetirer={(nom) => {
        const suivant = groupe.filter((m) => m !== nom)
        if (habitat) modifierHabitat(habitat.id, { pokemon: suivant })
        else if (suivant.length) ouvrirGroupe(suivant)
        else allerVers({})
      }}
      onSupprimer={() => {
        if (habitat) supprimerHabitat(habitat.id)
        allerVers({})
      }}
      onEnregistrer={() => {
        const cree = creerHabitat(groupe)
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
  const attributions = useAttributions()
  const nomsVilles = useNomsVilles()
  const loges = new Set(habitats.flatMap((h) => h.pokemon))
  // Kyogre ne compte ni d'un côté ni de l'autre : sans quoi le décompte ne tomberait
  // jamais à zéro, et donnerait à chercher une place pour un Pokémon qui n'en a pas.
  const logeables = [...prefsParPokemon.keys()].filter(logeable)
  const sansHabitat = logeables.filter((n) => !loges.has(n)).length
  const [sauvegarde, setSauvegarde] = useState(null)
  const [message, setMessage] = useState('')
  const [saisie, setSaisie] = useState('')
  // Clé de la section affichée seule — une ville, ou 'melees' —, null pour toutes.
  const [villeChoisie, setVilleChoisie] = useState(null)

  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())

  /**
   * Les habitats rangés par ville, dans l'ordre où l'île se découvre.
   *
   * La ville d'un habitat est celle de ses colocataires — quand ils la partagent. Un enclos
   * mixte n'est pas rangé de force sous la ville de son premier occupant : il finit dans une
   * section à part, parce que le ranger ailleurs cacherait justement ce qu'on veut voir.
   * Les sections vides ne s'affichent pas : six titres pour deux habitats se liraient comme
   * une grille de cases à remplir.
   */
  const toutesSections = useMemo(() => {
    const retenus = terme
      ? habitats.filter(
          (h) =>
            correspond(terme, h.nom) ||
            h.pokemon.some((n) => correspond(terme, n, frPokemon(n))),
        )
      : habitats

    const parCle = new Map(VILLES.map((v) => [v.cle, []]))
    const melees = []
    for (const h of retenus) {
      const villes = new Set(h.pokemon.map((n) => cleVilleDe(attributions, n)))
      if (villes.size === 1) parCle.get([...villes][0])?.push(h)
      else melees.push(h)
    }

    const liste = VILLES.filter((v) => parCle.get(v.cle).length).map((v) => ({
      cle: v.cle,
      nom: nomVille(nomsVilles, v.cle),
      habitats: parCle.get(v.cle),
    }))
    if (melees.length)
      liste.push({ cle: null, nom: 'Villes mêlées', habitats: melees })
    return liste
  }, [habitats, attributions, nomsVilles, terme])

  // Le filtre de ville s'applique après la recherche : ses compteurs disent donc ce que
  // chaque bouton montrerait, recherche comprise. Une ville vidée par la recherche garde
  // son bouton allumé plutôt que de disparaître sous le doigt.
  const villesProposees = useMemo(() => {
    const presentes = new Set(
      habitats.map((h) => {
        const villes = new Set(h.pokemon.map((n) => cleVilleDe(attributions, n)))
        return villes.size === 1 ? [...villes][0] : 'melees'
      }),
    )
    const compte = new Map(toutesSections.map((s) => [s.cle || 'melees', s.habitats.length]))
    const liste = VILLES.filter((v) => presentes.has(v.cle)).map((v) => ({
      cle: v.cle,
      nom: nomVille(nomsVilles, v.cle),
      resume: v.resume,
      compte: compte.get(v.cle) || 0,
    }))
    if (presentes.has('melees'))
      liste.push({ cle: 'melees', nom: 'Villes mêlées', compte: compte.get('melees') || 0 })
    return liste
  }, [habitats, attributions, nomsVilles, toutesSections])

  // Le dernier habitat d'une ville supprimé, son bouton disparaît : le filtre tombe avec lui
  // plutôt que de laisser une liste vide sans bouton pour en sortir.
  const villeFiltre = villesProposees.some((v) => v.cle === villeChoisie) ? villeChoisie : null
  const sections = villeFiltre
    ? toutesSections.filter((s) => (s.cle || 'melees') === villeFiltre)
    : toutesSections
  const trouves = sections.reduce((n, s) => n + s.habitats.length, 0)
  const totalRecherche = toutesSections.reduce((n, s) => n + s.habitats.length, 0)

  return (
    <div className="wrap habitat">
      <div className="liste-tete">
        <div>
          <p className="etiquette">Mes habitats</p>
          <h1>{habitats.length ? `${habitats.length} habitat${habitats.length > 1 ? 's' : ''}` : 'Aucun habitat'}</h1>
          <p className="liste-chapeau">
            Un habitat réunit jusqu’à {MAX_COLOCATAIRES} Pokémon et se souvient d’eux : les
            objets à y poser se recalculent à l’ouverture. {sansHabitat} Pokémon sur{' '}
            {logeables.length} n’en ont pas encore.
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

      <ProgressionVilles habitats={habitats} resume={false} />

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

      {habitats.length > 0 && (
        <div className="liste-recherche">
          <Input
            allowClear
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Chercher un Pokémon, ou un habitat par son nom…"
            aria-label="Chercher un Pokémon parmi les habitats"
          />
          {(terme || villeFiltre) && (
            <span className="liste-recherche-compte">
              {trouves} habitat{trouves > 1 ? 's' : ''} sur {habitats.length}
            </span>
          )}
        </div>
      )}

      {villesProposees.length > 1 && (
        <div className="bascules liste-villes" role="group" aria-label="Filtrer les habitats par ville">
          <button
            type="button"
            className="bascule reset"
            aria-pressed={villeFiltre === null}
            onClick={() => setVilleChoisie(null)}
          >
            Toutes <b>{totalRecherche}</b>
          </button>
          {villesProposees.map((v) => {
            const IconeVil = v.cle === 'melees' ? null : ICONE_VILLE[v.cle]
            return (
              <button
                key={v.cle}
                type="button"
                className={'bascule' + (v.cle === 'melees' ? '' : ' teintee')}
                style={
                  v.cle === 'melees'
                    ? undefined
                    : { '--teinte': `var(--v-${v.cle})`, '--teinte-fond': `var(--v-${v.cle}-fond)` }
                }
                aria-pressed={villeFiltre === v.cle}
                title={v.resume}
                onClick={() => setVilleChoisie(villeFiltre === v.cle ? null : v.cle)}
              >
                {IconeVil && <IconeVil />}
                {v.nom} <b>{v.compte}</b>
              </button>
            )
          })}
        </div>
      )}

      {!habitats.length ? (
        <div className="vide">
          <p>
            Rien d’enregistré pour l’instant. Composez-en un, ou partez d’une fiche du{' '}
            <Link to="/pokedex">Pokédex</Link>.
          </p>
        </div>
      ) : sections.length ? (
        sections.map((section) => {
          const IconeVil = section.cle ? ICONE_VILLE[section.cle] : null
          return (
            <section
              key={section.cle || 'melees'}
              className={'groupe-ville' + (section.cle ? '' : ' melees')}
              style={section.cle ? { '--teinte': `var(--v-${section.cle})` } : undefined}
            >
              <header className="groupe-ville-tete">
                <h2 className="groupe-ville-nom">
                  {IconeVil && <IconeVil />}
                  {section.nom}
                </h2>
                <p className="groupe-ville-compte">
                  {section.habitats.length} habitat{section.habitats.length > 1 ? 's' : ''}
                  {section.cle ? '' : ' · colocataires de villes différentes'}
                </p>
              </header>
              <div className="grille-habitats">
                {section.habitats.map((h) => (
                  <CarteHabitat
                    key={h.id}
                    habitat={h}
                    onOuvrir={onOuvrir}
                    onSupprimer={onSupprimer}
                  />
                ))}
              </div>
            </section>
          )
        })
      ) : (
        <div className="vide">
          <p>
            {terme
              ? `Aucun habitat ne loge « ${saisieDifferee.trim()} »${villeFiltre ? ' dans cette ville' : ''}.`
              : 'Aucun habitat dans cette ville.'}
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
function SelecteurPokemon({
  habitats,
  deja = [],
  titre,
  sousTitre,
  creation = false,
  villeInitiale = null,
  onValider,
  onAnnuler,
}) {
  const attributions = useAttributions()
  const nomsVilles = useNomsVilles()

  const [choisis, setChoisis] = useState([])
  const [saisie, setSaisie] = useState('')
  const [sansHabitatSeul, setSansHabitatSeul] = useState(() => habitats.length > 0)
  // La ville d'arrivée n'est qu'un point de départ : la changer ensuite ne réécrit pas
  // l'URL, comme les autres filtres du sélecteur.
  const [villeFiltre, setVilleFiltre] = useState(() =>
    cleVilleValide(villeInitiale) ? villeInitiale : null,
  )
  // Éteint par défaut : trier par compatibilité reclasse la liste à chaque choix, si bien
  // que le Pokémon qu'on vient de cliquer change de place et paraît disparaître. L'ordre du
  // Pokédex ne bouge pas, on voit la vignette passer à l'état sélectionné là où elle est.
  const [triCompat, setTriCompat] = useState(false)
  // La suggestion est un panneau qu'on ouvre, pas un tri : elle désigne UN Pokémon, et
  // « Suivant » descend le classement sans réorganiser les 366 vignettes sous les yeux.
  const [suggestionOuverte, setSuggestionOuverte] = useState(false)
  const [rang, setRang] = useState(0)

  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())
  const places = MAX_COLOCATAIRES - deja.length - choisis.length

  /** Le groupe tel qu'il est à cet instant : les colocataires déjà là, plus les choisis. */
  const groupeEnCours = useMemo(() => [...deja, ...choisis], [deja, choisis])
  const tauxGroupe = compatibilite(groupeEnCours)

  /**
   * Les villes du groupe en cours.
   *
   * Un enclos est posé dans UNE ville : réunir des Pokémon de plusieurs régions demande de
   * les y déplacer d'abord. L'avertissement se lève dès le deuxième choix, pendant qu'on
   * compose — c'est là qu'il sert, pas une fois l'habitat enregistré. Il n'interdit rien :
   * le rattachement reste souvent une déduction (cf. src/data/villes.js), et c'est au
   * joueur de savoir où il a vu ses Pokémon.
   */
  const villesDuGroupe = useMemo(() => {
    const par = new Map()
    for (const n of groupeEnCours) {
      const cle = cleVilleDe(attributions, n)
      par.set(cle, [...(par.get(cle) || []), n])
    }
    return [...par]
  }, [groupeEnCours, attributions])

  const liste = useMemo(() => {
    // Kyogre n'entre dans aucun enclos : il ne figure donc jamais parmi les candidats.
    let noms = [...prefsParPokemon.keys()].filter((n) => logeable(n) && !deja.includes(n))
    if (sansHabitatSeul) noms = noms.filter((n) => choisis.includes(n) || !habitatDuPokemon(habitats, n))
    // Un Pokémon déjà retenu reste visible même si le filtre l'exclut : le voir disparaître
    // du panier au moment où on change de ville laisserait croire qu'il a été retiré.
    if (villeFiltre)
      noms = noms.filter((n) => choisis.includes(n) || cleVilleDe(attributions, n) === villeFiltre)
    if (terme) noms = noms.filter((n) => correspond(terme, n, frPokemon(n)))

    // Sans groupe en cours, il n'y a rien à comparer : on retombe sur l'ordre du Pokédex.
    if (triCompat && groupeEnCours.length)
      return noms.sort(
        (a, b) =>
          (compatibiliteAvec(groupeEnCours, b) ?? -1) - (compatibiliteAvec(groupeEnCours, a) ?? -1) ||
          comparerParNumero(a, b),
      )
    return noms.sort(comparerParNumero)
  }, [terme, sansHabitatSeul, habitats, deja, choisis, triCompat, groupeEnCours, villeFiltre, attributions])

  /** Combien de candidats par ville, à filtre de ville près — affiché dans le sélecteur. */
  const repartitionVilles = useMemo(() => {
    const compte = Object.fromEntries(VILLES.map((v) => [v.cle, 0]))
    for (const n of prefsParPokemon.keys()) {
      if (!logeable(n) || deja.includes(n)) continue
      if (sansHabitatSeul && !choisis.includes(n) && habitatDuPokemon(habitats, n)) continue
      compte[cleVilleDe(attributions, n)] += 1
    }
    return compte
  }, [deja, choisis, habitats, sansHabitatSeul, attributions])

  /**
   * Les colocataires qui iraient le mieux au groupe en cours, du meilleur au moins bon.
   *
   * L'habitat idéal passe avant tout : un enclos n'en satisfait qu'un, donc un Pokémon du
   * mauvais habitat serait un mauvais conseil quelle que soit sa compatibilité. Vient
   * ensuite le taux de compatibilité — le vrai « match » —, puis la ville, qui départage à
   * score égal. Le classement se fait sur la liste AFFICHÉE : les filtres en cours (ville,
   * « sans habitat seulement », recherche) valent aussi pour la suggestion.
   */
  const suggestions = useMemo(() => {
    if (!groupeEnCours.length || places <= 0) return []
    const habitatsGroupe = new Set(
      groupeEnCours.map((n) => pokemonParNom.get(n)?.habitat).filter(Boolean),
    )
    const habitatCible = habitatsGroupe.size === 1 ? [...habitatsGroupe][0] : null
    const villesGroupe = new Set(groupeEnCours.map((n) => cleVilleDe(attributions, n)))

    return liste
      .filter((n) => !choisis.includes(n))
      .map((n) => ({
        nom: n,
        score: compatibiliteAvec(groupeEnCours, n) ?? 0,
        memeHabitat: habitatCible ? pokemonParNom.get(n)?.habitat === habitatCible : false,
        memeVille: villesGroupe.has(cleVilleDe(attributions, n)),
      }))
      .sort(
        (a, b) =>
          Number(b.memeHabitat) - Number(a.memeHabitat) ||
          b.score - a.score ||
          Number(b.memeVille) - Number(a.memeVille) ||
          comparerParNumero(a.nom, b.nom),
      )
      .slice(0, MAX_SUGGESTIONS)
  }, [liste, choisis, groupeEnCours, attributions, places])

  // Le modulo évite de sortir du classement quand il rétrécit — un choix, une frappe ou un
  // changement de ville le raccourcissent sans que « Suivant » ait été touché.
  const suggestion = suggestions.length ? suggestions[rang % suggestions.length] : null
  const suggestionPossible = groupeEnCours.length > 0 && places > 0

  const basculer = (nomPokemon) => {
    // Le classement des suggestions change dès que le groupe change : repartir du meilleur,
    // plutôt que de rester au 3e d'un classement qui n'existe plus.
    setRang(0)
    setChoisis((precedent) =>
      precedent.includes(nomPokemon)
        ? precedent.filter((n) => n !== nomPokemon)
        : precedent.length + deja.length < MAX_COLOCATAIRES
          ? [...precedent, nomPokemon]
          : precedent,
    )
  }

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
            onClick={() => onValider(tries)}
          >
            {creation ? 'Créer l’habitat' : 'Ajouter'}
          </button>
        </div>
      </div>

      {villesDuGroupe.length > 1 && (
        <p className="avertissement">
          Ce groupe mêle {villesDuGroupe.length} villes —{' '}
          {villesDuGroupe
            .map(([cle, noms]) => `${nomVille(nomsVilles, cle)} (${noms.map(frPokemon).join(', ')})`)
            .join(', ')}
          . Un enclos se pose dans une seule ville : il faudra y déplacer les autres, depuis
          leur fiche ou la page Villes.
        </p>
      )}

      <div className="selecteur-filtres">
        <div className="champ-groupe">
          <Input
            allowClear
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value)
              setRang(0)
            }}
            placeholder="Chercher un Pokémon…"
            aria-label="Chercher un Pokémon"
          />
        </div>
        <Select
          allowClear
          value={villeFiltre}
          onChange={(cle) => {
            setVilleFiltre(cle || null)
            setRang(0)
          }}
          placeholder="Ville"
          aria-label="Filtrer les candidats par ville"
          style={{ minWidth: 210 }}
          options={VILLES.map((v) => ({
            value: v.cle,
            label: `${nomVille(nomsVilles, v.cle)} (${repartitionVilles[v.cle]})`,
          }))}
        />
        <button
          type="button"
          className="bascule"
          aria-pressed={sansHabitatSeul}
          onClick={() => {
            setSansHabitatSeul((v) => !v)
            setRang(0)
          }}
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
        <button
          type="button"
          className="bascule"
          aria-pressed={suggestionOuverte}
          disabled={!suggestionPossible}
          title={
            !groupeEnCours.length
              ? 'Choisissez d’abord un Pokémon : la suggestion se compare à lui'
              : places <= 0
                ? 'L’habitat est complet'
                : 'Le Pokémon qui irait le mieux à cet habitat'
          }
          onClick={() => {
            setSuggestionOuverte((v) => !v)
            setRang(0)
          }}
        >
          Suggestion colocataire
        </button>
        <span className="statut">{liste.length} Pokémon</span>
      </div>

      {/* Une suggestion désigne un Pokémon et dit pourquoi : sans le « pourquoi », rien ne
          distingue un bon conseil d'un tirage au sort. */}
      {suggestionOuverte && suggestionPossible && (
        <div className="panneau-suggestion">
          {suggestion ? (
            <>
              <img
                src={urlSpritePokemon(spritePokemon(suggestion.nom))}
                alt=""
                width="56"
                height="56"
              />
              <div className="suggestion-texte">
                <strong>{frPokemon(suggestion.nom)}</strong>
                <span className="suggestion-raison">
                  {suggestion.memeHabitat
                    ? `même habitat idéal (${habitatDe(suggestion.nom).toLowerCase()})`
                    : `habitat ${habitatDe(suggestion.nom).toLowerCase() || 'inconnu'}`}
                  {` · ${suggestion.score} % de compatibilité`}
                  {` · ${nomVille(nomsVilles, cleVilleDe(attributions, suggestion.nom))}`}
                  {suggestion.memeVille ? ' (même ville)' : ''}
                </span>
                <span className="suggestion-rang">
                  proposition {(rang % suggestions.length) + 1} sur {suggestions.length}
                </span>
              </div>
              <div className="suggestion-actions">
                <button
                  type="button"
                  className="ghost-btn primaire"
                  onClick={() => {
                    basculer(suggestion.nom)
                    setRang(0)
                  }}
                >
                  Ajouter {frPokemon(suggestion.nom)}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={suggestions.length < 2}
                  onClick={() => setRang((r) => r + 1)}
                >
                  Suivant
                </button>
              </div>
            </>
          ) : (
            <span className="suggestion-raison">
              Aucun candidat ne reste sous ces filtres : élargissez la ville ou la recherche.
            </span>
          )}
        </div>
      )}

      {liste.length ? (
        <div className="chips">
          {liste.map((n) => {
            const loge = habitatDuPokemon(habitats, n)
            const cleVille = cleVilleDe(attributions, n)
            return (
              <VignettePokemon
                key={n}
                nom={n}
                trouve={!!terme}
                selectionne={choisis.includes(n)}
                note={loge ? loge.nom : ''}
                desactive={places <= 0 && !choisis.includes(n)}
                score={groupeEnCours.length ? compatibiliteAvec(groupeEnCours, n) : null}
                ville={cleVille}
                nomVille={nomVille(nomsVilles, cleVille)}
                suggere={suggestionOuverte && suggestion?.nom === n}
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
  modeCommun,
  setModeCommun,
  triObjets,
  setTriObjets,
  tailleObjets,
  setTailleObjets,
  compteursObjets,
  setCompteursObjets,
  lotOuvert,
  setLotOuvert,
  tailleLot,
  setTailleLot,
  onAjouter,
  onRetirer,
  onSupprimer,
  onEnregistrer,
  onRetour,
  onPokemon,
  onObjet,
}) {
  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())

  const solo = groupe.length === 1
  // Seul, un Pokémon n'a rien « en commun » avec personne : la bascule disparaît, et son
  // état — qui survit d'un habitat à l'autre comme les autres filtres — cesse d'agir.
  const commun = modeCommun && !solo

  const toutesLesPrefs = useMemo(() => preferencesDuGroupe(groupe), [groupe])
  // Le filtre survit à un changement de groupe : les préférences retenues peuvent alors
  // n'appartenir à personne. On retombe sur « toutes » plutôt que d'afficher une liste
  // vide sans bouton coché pour l'expliquer.
  const retenues = toutesLesPrefs.filter((s) => prefsActives.has(s))
  const slugsActifs = commun || !retenues.length ? toutesLesPrefs : retenues

  const objets = useMemo(() => objetsPourGroupe(groupe, slugsActifs), [groupe, slugsActifs])
  // Comme partout ailleurs, fossiles et ressources restent dehors : le terrain d'entente
  // qu'on cherche est ce qu'on va POSER dans l'enclos, et un minerai ne meuble rien.
  const nbCommuns = useMemo(
    () =>
      solo
        ? 0
        : objetsCommuns(groupe).filter((nom) => TYPES_VISIBLES_PAR_DEFAUT.has(typeDe(nom))).length,
    [groupe, solo],
  )

  // Le lot minimal ignore les filtres : il répond à « que fabriquer pour tout le monde ? »,
  // et une préférence décochée n'en reste pas moins une préférence du groupe.
  const lot = useMemo(
    () => lotMinimal(groupe, (nom) => TYPES_VISIBLES_PAR_DEFAUT.has(typeDe(nom))),
    [groupe],
  )
  // Complété jusqu'à la taille demandée. Hors de la grille, la taille demandée survit d'un
  // groupe à l'autre ; un lot minimal plus gros qu'elle l'emporte simplement.
  const complements = useMemo(
    () =>
      completerLot(groupe, lot.objets, tailleLot, {
        admissible: (nom) => TYPES_VISIBLES_PAR_DEFAUT.has(typeDe(nom)),
        categorie: (nom) => objetParNom.get(nom)?.categorie,
        confort: CATEGORIES_CONFORT,
      }),
    [groupe, lot, tailleLot],
  )

  /** Décompte par catégorie de meuble, calculé avant filtrage : les bascules le montrent. */
  const parType = useMemo(() => {
    const compte = Object.fromEntries(TYPES_OBJET.map((t) => [t, 0]))
    for (const o of objets) compte[typeDe(o.nom)] += 1
    return compte
  }, [objets])

  // Aucune catégorie cochée = toutes sauf fossiles et ressources.
  const typesRetenus = typesActifs.size ? typesActifs : TYPES_VISIBLES_PAR_DEFAUT

  const objetsFiltres = useMemo(() => {
    // « Choses en commun » remplace le filtre de catégories, sans lever le tri par défaut :
    // fossiles et ressources en sont exclus comme partout ailleurs.
    const gardes = commun
      ? objets.filter(
          (o) =>
            o.pokemonSatisfaits.length === groupe.length &&
            TYPES_VISIBLES_PAR_DEFAUT.has(typeDe(o.nom)),
        )
      : objets.filter((o) => typesRetenus.has(typeDe(o.nom)))
    const retenus = terme ? gardes.filter((o) => correspond(terme, o.nom, frObjet(o.nom))) : gardes
    if (triObjets === 'utilite') return retenus

    // `objetsPourGroupe` a déjà trié par utilité : on ne reclasse que sur demande, et le
    // nombre de colocataires satisfaits reste le départage — à préférences égales, mieux
    // vaut l'objet qui contente tout le monde.
    const sens = triObjets === 'prefs-asc' ? -1 : 1
    return [...retenus].sort(
      (a, b) =>
        sens * (b.prefs.length - a.prefs.length) ||
        b.pokemonSatisfaits.length - a.pokemonSatisfaits.length ||
        frObjet(a.nom).localeCompare(frObjet(b.nom), 'fr'),
    )
  }, [objets, typesRetenus, terme, commun, groupe.length, triObjets])

  const confort = useMemo(() => {
    const compte = { Relaxation: 0, Decoration: 0, Toy: 0 }
    for (const o of objetsFiltres) {
      const categorie = objetParNom.get(o.nom)?.categorie
      if (categorie in compte) compte[categorie] += 1
    }
    return compte
  }, [objetsFiltres])

  const taux = compatibilite(groupe)
  const zones = [...new Set(groupe.map(habitatDe).filter(Boolean))]
  const portee = commun
    ? `communs aux ${groupe.length} colocataires`
    : retenues.length
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
            <h1 className="nom-habitat">{nomDeGroupe(groupe)}</h1>
          ) : (
            <span className="etiquette">Groupe libre, non enregistré</span>
          )}

          <div className="colocataires">
            {groupe.map((nom) => (
              <div key={nom} className="colocataire">
                <BulleAliments nom={nom}>
                  <button
                    type="button"
                    className="colocataire-lien"
                    aria-label={`Ouvrir la fiche de ${frPokemon(nom)}`}
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
                      {/* Le goût préféré décide des aliments à offrir : c'est l'autre moitié
                          du confort, à côté des objets qu'on pose. Les aliments eux-mêmes
                          sont dans l'infobulle de la fiche. */}
                      {goutDe(nom) && <MarqueGout nom={nom} />}
                      {specialitesDe(nom).length > 0 && (
                        <span className="colocataire-specialite">
                          {specialitesDe(nom).join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                </BulleAliments>
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
          <strong>{taux} % de compatibilité</strong> — recouvrement moyen des objets appréciés,
          paire par paire.{' '}
          {nbCommuns
            ? `${nbCommuns} objet${nbCommuns > 1 ? 's' : ''} content${nbCommuns > 1 ? 'ent' : 'e'} tout le groupe à la fois — la bascule « Choses en commun » ne montre que ceux-là.`
            : 'Aucun objet ne fait l’unanimité : chaque objet posé ne contentera qu’une partie du groupe.'}
        </p>
      )}

      {zones.length > 1 && (
        <p className="avertissement">
          Habitats différents dans ce groupe ({zones.map((h) => h.toLowerCase()).join(', ')}) — un
          même enclos ne peut satisfaire qu’un seul habitat.
        </p>
      )}

      {lot.objets.length > 0 && (
        <LotMinimal
          lot={lot}
          complements={complements}
          cible={tailleLot}
          onCible={setTailleLot}
          groupe={groupe}
          solo={solo}
          nbPrefs={toutesLesPrefs.length}
          taille={tailleObjets}
          badges={compteursObjets}
          ouvert={lotOuvert}
          onBasculer={() => setLotOuvert((precedent) => !precedent)}
          onObjet={onObjet}
        />
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
              disabled={commun || typesActifs.size === 0}
              onClick={() => setTypesActifs(new Set())}
            >
              Réinitialiser
            </button>
            <button
              type="button"
              className="mini-btn"
              disabled={commun || typesActifs.size === TYPES_OBJET.length}
              onClick={() => setTypesActifs(new Set(TYPES_OBJET))}
            >
              Tout sélectionner
            </button>
          </span>
        </div>
        {/* L'explication du filtre neutre ne s'affiche plus : la règle se découvre en
            cochant, et le paragraphe pesait plus lourd que les bascules qu'il décrivait.
            Reste le seul cas où l'état surprend — les catégories éteintes par « Choses en
            commun » —, qu'aucune bascule ne dit d'elle-même. */}
        {commun && (
          <p className="indice">
            « Choses en commun » montre le terrain d’entente du groupe : les catégories ne
            s’appliquent pas, hors fossiles et ressources qui restent masqués.
          </p>
        )}
        <div className="bascules">
          {TYPES_OBJET.map((type) => {
            const IconeCat = ICONE_CATEGORIE[type]
            return (
            <button
              key={type}
              type="button"
              className="bascule teintee"
              style={{ '--teinte': `var(--c-${type})`, '--teinte-fond': `var(--c-${type}-fond)` }}
              aria-pressed={!commun && typesActifs.has(type)}
              disabled={commun}
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
        <div className="bascules">
          <button
            type="button"
            className="bascule reset"
            aria-pressed={!commun && retenues.length === 0}
            disabled={commun}
            onClick={() => setPrefsActives(new Set())}
          >
            Toutes
          </button>
          {!solo && (
            <button
              type="button"
              className="bascule commun"
              aria-pressed={commun}
              title={`Les objets appréciés par les ${groupe.length} colocataires`}
              onClick={() => setModeCommun((precedent) => !precedent)}
            >
              Choses en commun <b>{nbCommuns}</b>
            </button>
          )}
          {toutesLesPrefs.map((slug) => {
            const amateurs = amateursDe(groupe, slug)
            return (
              <button
                key={slug}
                type="button"
                className="bascule"
                aria-pressed={!commun && prefsActives.has(slug)}
                disabled={commun}
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
        <div className="tete-resultats">
          <h3 className="etiquette">
            {objetsFiltres.length} objets · {portee}
            {masques > 0 ? ` · ${masques} masqués par les filtres` : ''}
          </h3>
          <div className="reglages-resultats">
            <Checkbox
              checked={compteursObjets}
              onChange={(e) => setCompteursObjets(e.target.checked)}
              title="Le nombre de colocataires satisfaits et de préférences cochées, sous chaque objet"
            >
              Compteurs sous l’image
            </Checkbox>
            {/* Le double-clic revient au défaut : un curseur qu'on a poussé trop loin se
                recale sans viser les 60 px au pixel près. */}
            <div
              className="reglage-taille"
              onDoubleClick={() => setTailleObjets(TAILLE_DEFAUT)}
              title="Taille des vignettes — double-cliquez pour revenir au défaut"
            >
              <span className="reglage-taille-mini" aria-hidden="true" />
              <Slider
                min={TAILLE_MIN}
                max={TAILLE_MAX}
                step={4}
                value={tailleObjets}
                onChange={setTailleObjets}
                tooltip={{ formatter: (v) => `${v} px` }}
                aria-label="Taille des vignettes d’objet"
              />
              <span className="reglage-taille-maxi" aria-hidden="true" />
            </div>
            <Segmented
              options={TRIS_OBJETS}
              value={triObjets}
              onChange={setTriObjets}
              aria-label="Trier les objets"
            />
          </div>
        </div>
        <p className="confort">
          {CATEGORIES_CONFORT.map((c) => `${FR_CATEGORIE[c]} ${confort[c]}`).join(' · ')} — un
          habitat « exceptionnel » demande au moins un objet de chaque.
        </p>

        {objetsFiltres.length ? (
          <div className="chips" style={{ '--sprite': `${tailleObjets}px` }}>
            {objetsFiltres.map((o) => (
              <VignetteObjet
                key={o.nom}
                nom={o.nom}
                trouve={!!terme}
                nbPrefs={o.prefs.length}
                nomsPrefs={o.prefs.map((s) => prefParSlug.get(s).fr).join(' + ')}
                nbPokemon={solo ? 0 : o.pokemonSatisfaits.length}
                nomsPokemon={solo ? '' : o.pokemonSatisfaits.map(frPokemon).join(', ')}
                bulle={<BullePreferences objet={o} groupe={groupe} solo={solo} />}
                nue
                badges={compteursObjets}
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

/* ========================================================= petits blocs */

/** Le goût préféré d'un colocataire, sur le gabarit des marques d'habitat et de ville. */
function MarqueGout({ nom }) {
  const cle = goutBrutDe(nom)
  const IconeG = ICONE_GOUT[cle]
  return (
    <span className={'colocataire-gout marque-gout gout-' + cle} title="Goût préféré : les aliments de ce goût font monter son confort plus vite">
      {IconeG && <IconeG />}
      goût {goutDe(nom).toLowerCase()}
    </span>
  )
}

/**
 * Au survol d'un colocataire, les aliments de son goût : la réponse à « que lui donner ? ».
 * Dans la fiche elle-même, une douzaine d'images chargeait trop une ligne qui n'en demande
 * qu'une ; l'infobulle les nomme en plus. Sans goût connu, pas d'infobulle du tout.
 */
function BulleAliments({ nom, children }) {
  const liste = alimentsDe(nom)
  if (!liste.length) return children
  return (
    <Tooltip
      title={
        <div className="bulle-aliments">
          <span className="bulle-tete">
            <strong>À offrir à {frPokemon(nom)}</strong>
            <span className="bulle-en">aliments au goût {goutDe(nom).toLowerCase()}</span>
          </span>
          <ul>
            {liste.map((aliment) => (
              <li key={aliment.en}>
                <img src={urlSpriteAliment(aliment.sprite)} alt="" width="22" height="22" />
                {frAliment(aliment)}
              </li>
            ))}
          </ul>
        </div>
      }
      mouseEnterDelay={0.25}
      placement="bottom"
      classNames={{ root: 'bulle-objet bulle-large' }}
    >
      {children}
    </Tooltip>
  )
}

/**
 * Le plus petit lot d'objets qui coche toutes les préférences du groupe — cf. `lotMinimal`.
 *
 * C'est la liste de fabrication : la grille d'en dessous classe tout ce qui peut servir,
 * celle-ci dit ce qui suffit. Elle reprend la taille et les compteurs réglés pour la grille,
 * pour que les deux se lisent de la même façon.
 *
 * Le décompte de confort dit ce qu'il manque au lot pour un habitat « exceptionnel » : le
 * lot minimal ne s'en soucie pas, et c'est le seul endroit où il pourrait tromper.
 */
function LotMinimal({
  lot,
  complements,
  cible,
  onCible,
  groupe,
  solo,
  nbPrefs,
  taille,
  badges,
  ouvert,
  onBasculer,
  onObjet,
}) {
  const tous = [...lot.objets, ...complements]
  const categories = new Set(tous.map((o) => objetParNom.get(o.nom)?.categorie))
  const manquantes = CATEGORIES_CONFORT.filter((c) => !categories.has(c))
  const n = lot.objets.length
  const total = tous.length
  // Les préférences que le lot complété coche au moins deux fois : ce que la réserve protège.
  const doublees = new Set(
    tous.flatMap((o) => o.prefs).filter((slug, i, liste) => liste.indexOf(slug) !== i),
  ).size
  return (
    <section className={'lot-minimal' + (ouvert ? '' : ' replie')}>
      <div className="lot-tete">
        <h3 className="etiquette">Le lot minimal</h3>
        {!ouvert && (
          <p>
            {total} objet{total > 1 ? 's' : ''} pour les {nbPrefs} préférences
          </p>
        )}
        {ouvert && (
          <div
            className="reglage-taille"
            onDoubleClick={() => onCible(LOT_DEFAUT)}
            title="Nombre d’objets du lot — double-cliquez pour revenir au défaut"
          >
            <span className="reglage-lot-borne">{n}</span>
            <Slider
              min={n}
              max={Math.max(n, LOT_MAX)}
              value={Math.max(n, cible)}
              onChange={onCible}
              disabled={n >= LOT_MAX}
              tooltip={{ formatter: (v) => `${v} objets` }}
              aria-label="Nombre d’objets du lot"
            />
            <span className="reglage-lot-borne">{Math.max(n, LOT_MAX)}</span>
          </div>
        )}
        <button type="button" className="mini-btn" aria-expanded={ouvert} onClick={onBasculer}>
          {ouvert ? 'Masquer' : 'Afficher'}
        </button>
      </div>
      {ouvert && (
        <>
          <p className="lot-resume">
            <strong>
              {n} objet{n > 1 ? 's' : ''}
            </strong>{' '}
            suffi{n > 1 ? 'sent' : 't'} à cocher les {nbPrefs} préférences
            {solo ? ` de ${frPokemon(groupe[0])}` : ' du groupe'}
            {lot.orphelines.length
              ? ` — sauf ${lot.orphelines.map((s) => prefParSlug.get(s).fr).join(', ')}, qu’aucun objet ne coche`
              : ''}
            .{' '}
            {complements.length > 0 &&
              `${complements.length} de plus en réserve : ${doublees} préférence${doublees > 1 ? 's sont' : ' est'} cochée${doublees > 1 ? 's' : ''} au moins deux fois, si un plan manque. `}
            {manquantes.length
              ? `Pour un habitat « exceptionnel », il y manque : ${manquantes.map((c) => FR_CATEGORIE[c].toLowerCase()).join(', ')}.`
              : 'Il contient déjà un repos, une décoration et un jouet.'}
          </p>
          <div className="chips" style={{ '--sprite': `${taille}px` }}>
            {tous.map((o, i) => (
              <Fragment key={o.nom}>
                {/* La réserve suit le lot minimal, séparée : le premier bloc suffit, le
                    second protège d'un plan qui manque. */}
                {i === n && <span className="lot-separateur">réserve</span>}
                <VignetteObjet
                  nom={o.nom}
                  nbPrefs={o.prefs.length}
                  nomsPrefs={o.prefs.map((s) => prefParSlug.get(s).fr).join(' + ')}
                  nbPokemon={solo ? 0 : o.pokemonSatisfaits.length}
                  nomsPokemon={solo ? '' : o.pokemonSatisfaits.map(frPokemon).join(', ')}
                  bulle={<BullePreferences objet={o} groupe={groupe} solo={solo} />}
                  nue
                  badges={badges}
                  onClick={() => onObjet(o.nom)}
                />
              </Fragment>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

/**
 * Ce que dit le badge « N préf. » d'une vignette, déplié.
 *
 * Le badge donne un nombre, jamais lesquelles : une bibliothèque « 3 préf. » ne dit pas si
 * elle coche « Choses carrées », « Choses avec du texte » et « Choses en bois », ni lequel
 * des colocataires y tient. Les préférences listées sont exactement celles que compte le
 * badge — donc celles du filtre en cours, pour que les deux ne se contredisent jamais.
 *
 * Le nom et le type ne sont pas répétés ici : la vignette les met elle-même en tête de son
 * infobulle, puisque c'est elle qui les a ôtés de l'écran.
 */
function BullePreferences({ objet, groupe, solo }) {
  return (
    <div className="bulle-prefs">
      <ul>
        {objet.prefs.map((slug) => (
          <li key={slug}>
            {prefParSlug.get(slug).fr}
            {!solo && (
              <span className="bulle-amateurs">
                {amateursDe(groupe, slug).map(frPokemon).join(', ')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
