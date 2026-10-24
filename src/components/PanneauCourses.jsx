import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Checkbox, Drawer, Input, InputNumber, Modal } from 'antd'
import { IconeCroix } from './Icones'
import { articles, FR_RAYON, presenter, RAYONS } from '../data/courses'
import {
  ajouter,
  changerQuantite,
  cleLigne,
  cocher,
  retirer,
  retirerCochees,
} from '../utils/coursesStorage'
import { correspond, normaliser } from '../utils/recherche'

/** Le panneau de la liste de courses, et sa fenêtre d'ajout (cf. ListeCourses.jsx). */
export default function PanneauCourses({ ouvert, onFermer, lignes }) {
  const [ajout, setAjout] = useState(false)

  const cochees = lignes.filter((l) => l.coche).length
  // Ce qui reste à prendre d'abord ; le déjà pris descend, barré, sans perdre son ordre.
  const triees = useMemo(() => [...lignes.filter((l) => !l.coche), ...lignes.filter((l) => l.coche)], [lignes])

  return (
    <>
      <Drawer
        title="Liste de courses"
        open={ouvert}
        onClose={onFermer}
        width={400}
        footer={
          <div className="courses-pied">
            <button type="button" className="ghost-btn primaire" onClick={() => setAjout(true)}>
              Ajouter
            </button>
            {cochees > 0 && (
              <button type="button" className="ghost-btn" onClick={retirerCochees}>
                Retirer les cochés ({cochees})
              </button>
            )}
          </div>
        }
      >
        {triees.length ? (
          <ul className="courses-lignes">
            {triees.map((l) => (
              <LigneCourse key={cleLigne(l.type, l.nom)} ligne={l} onLien={onFermer} />
            ))}
          </ul>
        ) : (
          <p className="courses-vide">
            Rien à aller chercher. Ajoutez ici ce qui manque à votre construction, ou depuis le
            petit panier d’un objet.
          </p>
        )}
        <LigneLibre />
      </Drawer>

      <FenetreAjout ouverte={ajout} onFermer={() => setAjout(false)} lignes={lignes} />
    </>
  )
}

/**
 * Une ligne tapée telle quelle, en fin de liste : « 30 rondins », « voir avec Léo »… Ce
 * que les données ne connaissent pas, sans passer par la recherche.
 */
function LigneLibre() {
  const [texte, setTexte] = useState('')
  const valider = () => {
    if (!texte.trim()) return
    ajouter('texte', texte)
    setTexte('')
  }
  return (
    <form
      className="courses-ligne-libre"
      onSubmit={(e) => {
        e.preventDefault()
        valider()
      }}
    >
      <Input
        placeholder="Ajouter une ligne de texte…"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        maxLength={120}
        aria-label="Ajouter une ligne de texte"
      />
      <button type="submit" className="ghost-btn" disabled={!texte.trim()}>
        Ajouter
      </button>
    </form>
  )
}

function LigneCourse({ ligne, onLien }) {
  const cle = cleLigne(ligne.type, ligne.nom)
  const { fr, en, url, lien } = presenter(ligne)
  return (
    <li className={'courses-ligne' + (ligne.coche ? ' prise' : '')}>
      <Checkbox checked={ligne.coche} onChange={() => cocher(cle)} aria-label={`${fr} : pris`} />
      <span className="courses-image">{url && <img src={url} alt="" width="36" height="36" />}</span>
      <span className="courses-nom">
        {lien ? (
          <Link to={lien} onClick={onLien}>
            {fr}
          </Link>
        ) : (
          fr
        )}
        {en && <span className="courses-en">{en}</span>}
      </span>
      <InputNumber
        className="courses-qte"
        size="small"
        min={1}
        max={9999}
        precision={0}
        placeholder="qté"
        value={ligne.quantite}
        onChange={(v) => changerQuantite(cle, v)}
        aria-label={`Quantité de ${fr}`}
      />
      <button
        type="button"
        className="courses-retirer"
        onClick={() => retirer(cle)}
        aria-label={`Retirer ${fr}`}
        title="Retirer"
      >
        <IconeCroix />
      </button>
    </li>
  )
}

/**
 * La recherche d'ajout : objets et blocs mélangés, avec leur image, et un filtre par rayon.
 * Elle reste ouverte pour en ajouter plusieurs d'affilée ; un second clic retire ce qu'on
 * vient d'ajouter.
 */
function FenetreAjout({ ouverte, onFermer, lignes }) {
  const [saisie, setSaisie] = useState('')
  const [rayon, setRayon] = useState(null)
  const champ = useRef(null)
  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())

  const presentes = useMemo(
    () => new Set(lignes.filter((l) => !l.coche).map((l) => cleLigne(l.type, l.nom))),
    [lignes],
  )
  // Les compteurs des rayons suivent la recherche : « porte » tapé, on voit d'un coup
  // d'œil où sont les résultats.
  const cherches = useMemo(
    () => (terme ? articles.filter((a) => correspond(terme, a.nom, a.fr)) : articles),
    [terme],
  )
  const parRayon = useMemo(() => {
    const compte = {}
    for (const a of cherches) compte[a.rayon] = (compte[a.rayon] || 0) + 1
    return compte
  }, [cherches])
  const trouves = useMemo(
    () => (rayon ? cherches.filter((a) => a.rayon === rayon) : cherches),
    [cherches, rayon],
  )

  const basculer = (type, nom) => {
    const cle = cleLigne(type, nom)
    if (presentes.has(cle)) retirer(cle)
    else ajouter(type, nom)
  }

  // `autoFocus` ne tient pas, ni `afterOpenChange` à la première ouverture : le panneau
  // en dessous reprend le focus. On le pose donc un peu après, l'animation passée.
  useEffect(() => {
    if (!ouverte) return undefined
    const minuterie = setTimeout(() => champ.current?.focus(), 350)
    return () => clearTimeout(minuterie)
  }, [ouverte])

  const libre = saisie.trim()

  return (
    <Modal
      title="Ajouter aux courses"
      open={ouverte}
      onCancel={onFermer}
      footer={null}
      width={760}
      afterOpenChange={(o) => !o && setSaisie('')}
    >
      <Input
        ref={champ}
        allowClear
        placeholder="Rechercher un objet ou un bloc, en français ou en anglais"
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
      />
      <div className="courses-rayons">
        <button type="button" className="courses-rayon" aria-pressed={rayon === null} onClick={() => setRayon(null)}>
          Tout <b>{cherches.length}</b>
        </button>
        {RAYONS.map((r) => (
          <button
            key={r.cle}
            type="button"
            className="courses-rayon"
            aria-pressed={rayon === r.cle}
            onClick={() => setRayon(rayon === r.cle ? null : r.cle)}
          >
            {r.libelle} <b>{parRayon[r.cle] || 0}</b>
          </button>
        ))}
      </div>
      {trouves.length > 0 && (
        <div className="courses-choix">
          {trouves.map((a) => {
            const dedans = presentes.has(cleLigne(a.type, a.nom))
            return (
              <button
                key={a.type + ':' + a.nom}
                type="button"
                className={'courses-article' + (dedans ? ' dedans' : '')}
                onClick={() => basculer(a.type, a.nom)}
                title={a.fr !== a.nom ? `${a.fr} (${a.nom})` : a.fr}
                aria-pressed={dedans}
              >
                {a.url ? (
                  <img src={a.url} alt="" width="48" height="48" loading="lazy" />
                ) : (
                  <span className="courses-sans-image" />
                )}
                <span className="courses-article-nom">{a.fr}</span>
                <span className="courses-article-famille">{FR_RAYON[a.rayon]}</span>
              </button>
            )
          })}
        </div>
      )}
      {!trouves.length && !libre && <p className="courses-libre">Rien dans ce rayon.</p>}
      {!trouves.length && libre && (
        <div className="courses-libre">
          <p>
            Rien ne correspond à « {libre} »{rayon ? ` parmi les ${FR_RAYON[rayon].toLowerCase()}` : ' dans les données'}.
          </p>
          {presentes.has(cleLigne('texte', libre)) ? (
            <p>« {libre} » est déjà dans la liste.</p>
          ) : (
            <button type="button" className="ghost-btn primaire" onClick={() => ajouter('texte', libre)}>
              Ajouter « {libre} » tel quel
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
