import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input, Segmented, Select } from 'antd'
import { ICONE_CATEGORIE } from '../components/Icones'
import { VignetteObjet } from '../components/Vignette'
import {
  FR_CATEGORIE,
  frObjet,
  objetParNom,
  objets,
  prefParSlug,
  prefsParObjet,
} from '../data'
import { FR_TYPE_OBJET, TYPES_OBJET, typeObjet } from '../data/categories'
import {
  FR_PERSONNALISATION,
  nbPersonnalisables,
  personnalisationDe,
  repartitionPersonnalisation,
  repeignable,
} from '../data/couleurs'
import { correspond, normaliser } from '../utils/recherche'
import './ObjetsPage.css'

const TRIS = [
  { value: 'nom', label: 'Nom' },
  { value: 'prefs', label: 'Préférences' },
  { value: 'pokemon', label: 'Pokémon' },
]

/** Les quatre catégories de confort, plus le cas — majoritaire — de celles qui n'en ont pas. */
const SANS_CONFORT = 'sans'

/**
 * Les filtres de personnalisation. « Repeignable » réunit les deux états qui acceptent la
 * peinture : c'est la question qu'on se pose, pas la distinction de Serebii entre un meuble
 * qui prend aussi les motifs et un qui n'en prend pas.
 */
const PERSONNALISATIONS = [
  { value: 'repeignable', label: 'Repeignable' },
  { value: 'motif+peinture', label: FR_PERSONNALISATION['motif+peinture'] },
  { value: 'motif', label: FR_PERSONNALISATION.motif },
  { value: 'aucune', label: FR_PERSONNALISATION.aucune },
  { value: 'inconnu', label: 'Non documenté' },
]

/**
 * Le catalogue des objets : les 714 entrées de l'index, filtrables et triables, chacune
 * ouvrant sa fiche.
 *
 * L'index des préférences répond « quels objets pour cette préférence », la vue habitat
 * « quels objets pour ces Pokémon » — il manquait la liste elle-même, celle qu'on parcourt
 * quand on cherche un meuble par son nom ou son type, et désormais quand on veut savoir ce
 * que Smearguru peut repeindre.
 */
export default function ObjetsPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [saisie, setSaisie] = useState(() => params.get('q') || '')
  const [tri, setTri] = useState('nom')
  const [type, setType] = useState(null)
  const [confort, setConfort] = useState(null)
  const [personnalisation, setPersonnalisation] = useState(
    () => params.get('personnalisation') || null,
  )

  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())

  /** Type de meuble et nombre de Pokémon contentés : calculés une fois, pas à chaque frappe. */
  const infos = useMemo(() => {
    const table = new Map()
    for (const objet of objets) {
      const slugs = prefsParObjet.get(objet.en) || []
      const vus = new Set()
      for (const slug of slugs) for (const p of prefParSlug.get(slug)?.pokemon || []) vus.add(p)
      table.set(objet.en, {
        type: typeObjet(objet.en, objet.categorie),
        nbPrefs: slugs.length,
        nbPokemon: vus.size,
      })
    }
    return table
  }, [])

  const parType = useMemo(() => {
    const compte = Object.fromEntries(TYPES_OBJET.map((t) => [t, 0]))
    for (const { type: t } of infos.values()) compte[t] = (compte[t] || 0) + 1
    return compte
  }, [infos])

  const parConfort = useMemo(() => {
    const compte = {}
    for (const objet of objets) {
      const cle = objet.categorie || SANS_CONFORT
      compte[cle] = (compte[cle] || 0) + 1
    }
    return compte
  }, [])

  const liste = useMemo(() => {
    let noms = objets.map((o) => o.en)
    if (type) noms = noms.filter((n) => infos.get(n).type === type)
    if (confort)
      noms = noms.filter((n) =>
        confort === SANS_CONFORT
          ? !objetParNom.get(n)?.categorie
          : objetParNom.get(n)?.categorie === confort,
      )
    if (personnalisation)
      noms = noms.filter((n) => {
        const etat = personnalisationDe(n)
        if (personnalisation === 'repeignable') return repeignable(n)
        if (personnalisation === 'motif') return etat === 'motif'
        if (personnalisation === 'inconnu') return etat === null
        return etat === personnalisation
      })
    if (terme) noms = noms.filter((n) => correspond(terme, n, frObjet(n)))

    if (tri === 'prefs')
      noms.sort(
        (a, b) =>
          infos.get(b).nbPrefs - infos.get(a).nbPrefs ||
          frObjet(a).localeCompare(frObjet(b), 'fr'),
      )
    else if (tri === 'pokemon')
      noms.sort(
        (a, b) =>
          infos.get(b).nbPokemon - infos.get(a).nbPokemon ||
          frObjet(a).localeCompare(frObjet(b), 'fr'),
      )
    else noms.sort((a, b) => frObjet(a).localeCompare(frObjet(b), 'fr'))

    return noms
  }, [terme, tri, type, confort, personnalisation, infos])

  /** Combien d'objets répondent à chaque filtre de personnalisation — mis dans son libellé. */
  const comptePersonnalisation = (valeur) => {
    if (valeur === 'repeignable')
      return (repartitionPersonnalisation.peinture || 0) +
        (repartitionPersonnalisation['motif+peinture'] || 0)
    if (valeur === 'inconnu')
      return objets.length - Object.values(repartitionPersonnalisation).reduce((a, b) => a + b, 0)
    return repartitionPersonnalisation[valeur] || 0
  }

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
              placeholder="Chercher un objet…"
              aria-label="Chercher un objet"
            />
          </div>
          <Select
            allowClear
            size="large"
            value={confort}
            onChange={setConfort}
            placeholder="Confort"
            aria-label="Filtrer par catégorie de confort"
            style={{ minWidth: 170 }}
            options={[
              ...Object.entries(FR_CATEGORIE).map(([valeur, libelle]) => ({
                value: valeur,
                label: `${libelle} (${parConfort[valeur] || 0})`,
              })),
              { value: SANS_CONFORT, label: `Sans catégorie (${parConfort[SANS_CONFORT] || 0})` },
            ]}
          />
          <Select
            allowClear
            size="large"
            value={personnalisation}
            onChange={setPersonnalisation}
            placeholder="Personnalisation"
            aria-label="Filtrer par personnalisation"
            style={{ minWidth: 200 }}
            options={PERSONNALISATIONS.map(({ value, label }) => ({
              value,
              label: `${label} (${comptePersonnalisation(value)})`,
            }))}
          />
          <Segmented options={TRIS} value={tri} onChange={setTri} size="large" />
          <span className="statut">{liste.length} objets</span>
        </div>
      </div>

      <div className="wrap objets">
        <div className="types">
          <button
            type="button"
            className="bascule reset"
            aria-pressed={type === null}
            onClick={() => setType(null)}
          >
            Tous les types <b>{objets.length}</b>
          </button>
          {TYPES_OBJET.map((t) => {
            const IconeCat = ICONE_CATEGORIE[t]
            return (
              <button
                key={t}
                type="button"
                className="bascule teintee"
                style={{ '--teinte': `var(--c-${t})`, '--teinte-fond': `var(--c-${t}-fond)` }}
                aria-pressed={type === t}
                onClick={() => setType(type === t ? null : t)}
              >
                <IconeCat />
                {FR_TYPE_OBJET[t]} <b>{parType[t] || 0}</b>
              </button>
            )
          })}
        </div>

        <p className="note-source">
          Le pinceau marque les objets que Smearguru peut repeindre — les couleurs
          disponibles, identiques pour tous, sont sur la fiche de l’objet. Serebii n’en
          documente que {nbPersonnalisables} sur les {objets.length} : sa colonne « Colour »
          ne couvre que les meubles, pas les matériaux ni les revêtements. Un objet non
          marqué n’est donc pas forcément impossible à peindre.
        </p>

        {liste.length ? (
          <div className="chips">
            {liste.map((nom) => (
              <VignetteObjet
                key={nom}
                nom={nom}
                trouve={!!terme}
                nbPrefs={infos.get(nom).nbPrefs}
                nomsPrefs={
                  tri === 'pokemon' ? `${infos.get(nom).nbPokemon} Pokémon contentés` : ''
                }
                pinceau={repeignable(nom)}
                onClick={() => navigate(`/objet/${encodeURIComponent(nom)}`)}
              />
            ))}
          </div>
        ) : (
          <div className="vide">
            <p>
              Aucun objet ne correspond. La recherche accepte le français et l’anglais — les
              noms français sont une traduction maison, l’anglais est celui des guides.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
