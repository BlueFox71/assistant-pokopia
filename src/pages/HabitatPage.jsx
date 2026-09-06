import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Input, Popconfirm, Select } from 'antd'
import CarteHabitat from '../components/CarteHabitat'
import { ICONE_CATEGORIE, ICONE_VILLE } from '../components/Icones'
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
import { VILLES } from '../data/villes'
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
  const sansHabitat = prefsParPokemon.size - loges.size
  const [sauvegarde, setSauvegarde] = useState(null)
  const [message, setMessage] = useState('')
  const [saisie, setSaisie] = useState('')

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
  const sections = useMemo(() => {
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

  const trouves = sections.reduce((n, s) => n + s.habitats.length, 0)

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

      {habitats.length > 0 && (
        <div className="liste-recherche">
          <Input
            allowClear
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Chercher un Pokémon, ou un habitat par son nom…"
            aria-label="Chercher un Pokémon parmi les habitats"
          />
          {terme && (
            <span className="liste-recherche-compte">
              {trouves} habitat{trouves > 1 ? 's' : ''} sur {habitats.length}
            </span>
          )}
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
          <p>Aucun habitat ne loge « {saisieDifferee.trim()} ».</p>
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
function SelecteurPokemon({ habitats, deja = [], titre, sousTitre, creation = false, onValider, onAnnuler }) {
  const attributions = useAttributions()
  const nomsVilles = useNomsVilles()

  const [choisis, setChoisis] = useState([])
  const [saisie, setSaisie] = useState('')
  const [sansHabitatSeul, setSansHabitatSeul] = useState(() => habitats.length > 0)
  const [villeFiltre, setVilleFiltre] = useState(null)
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
    let noms = [...prefsParPokemon.keys()].filter((n) => !deja.includes(n))
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
      if (deja.includes(n)) continue
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
    return terme ? gardes.filter((o) => correspond(terme, o.nom, frObjet(o.nom))) : gardes
  }, [objets, typesRetenus, terme, commun, groupe.length])

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
        <p className="indice">
          {commun
            ? '« Choses en commun » montre le terrain d’entente du groupe : les catégories ne s’appliquent pas, hors fossiles et ressources qui restent masqués.'
            : 'Aucune catégorie cochée = toutes, sauf les fossiles et les ressources — matériaux, peintures, revêtements, disques —, qui ne meublent rien. Cocher restreint à ce qui est coché.'}
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
        <p className="indice">
          Cumulatif : chaque préférence ajoutée élargit la liste. Aucune sélection = toutes.
          {solo
            ? ''
            : ` Le compteur indique combien des ${groupe.length} colocataires l’apprécient. « Choses en commun » sort du cumul : elle ne garde que les objets appréciés par tout le monde, fossiles et ressources exclus.`}
        </p>
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
