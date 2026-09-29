import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from 'antd'
import illustration from '../assets/accueil-pokopia.webp'
import BandeDefilante from '../components/BandeDefilante'
import { IconeBriques, IconeCaisse, IconeFeuille, IconeMaison } from '../components/Icones'
import ProgressionVilles from '../components/ProgressionVilles'
import { urlSpriteObjet, urlSpritePokemon } from '../data/images'
import {
  objetParNom,
  objets as tousLesObjets,
  comparerParNumero,
  frObjet,
  frPokemon,
  habitatDe,
  numeroAffiche,
  preferences,
  prefsParObjet,
  prefsParPokemon,
  spriteObjet,
  spritePokemon,
} from '../data'
import { FR_TYPE_OBJET, typeObjet } from '../data/categories'
import { useHabitats } from '../utils/habitatsStorage'
import { correspond, normaliser } from '../utils/recherche'
import { SIMULATIONS } from './simulations'
import './AccueilPage.css'

/** La catégorie de meuble parle plus que celle de confort : « lumière » plutôt que « décoration ». */
const meubleDe = (nom) => FR_TYPE_OBJET[typeObjet(nom, objetParNom.get(nom)?.categorie)]

/** Au-delà, la liste de résultats cesse d'aider : on invite à préciser le terme. */
const MAX_PAR_FAMILLE = 5

/**
 * Le nom anglais, quand c'est lui seul qui a répondu à la saisie : sans lui, « lampe » qui
 * remonte Mélancolux (Lampent) ressemble à une erreur de la recherche.
 */
const parLAnglais = (terme, en, fr) =>
  en !== fr && !normaliser(fr).includes(terme) && normaliser(en).includes(terme)

/**
 * L'accueil : ce qu'on veut faire en ouvrant l'application, dans l'ordre.
 *
 * D'abord chercher — la question la plus fréquente est « où est cet objet, ce Pokémon » —
 * puis reprendre un habitat en cours, et seulement ensuite parcourir. La recherche mène
 * directement à la bonne fiche plutôt qu'à une page de résultats : un objet ouvre sa fiche,
 * un Pokémon la sienne, une préférence ouvre l'index positionné dessus.
 */
export default function AccueilPage() {
  const navigate = useNavigate()
  const habitats = useHabitats()
  const [saisie, setSaisie] = useState('')

  const saisieDifferee = useDeferredValue(saisie)
  const terme = normaliser(saisieDifferee.trim())

  // L'accueil occupe au moins un écran : le viewport moins l'en-tête, dont la taille dépend
  // du texte et du repli des onglets. On la mesure plutôt que de la figer.
  useEffect(() => {
    const entete = document.querySelector('.app-header')
    if (!entete) return
    const mesurer = () =>
      document.documentElement.style.setProperty('--hauteur-entete', `${entete.offsetHeight}px`)
    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(entete)
    return () => observateur.disconnect()
  }, [])

  const resultats = useMemo(() => {
    if (!terme) return null

    const objets = [...prefsParObjet.keys()]
      .filter((nom) => correspond(terme, nom, frObjet(nom)))
      .sort(
        (a, b) =>
          prefsParObjet.get(b).length - prefsParObjet.get(a).length ||
          frObjet(a).localeCompare(frObjet(b), 'fr'),
      )

    const pokemon = [...prefsParPokemon.keys()]
      .filter((nom) => correspond(terme, nom, frPokemon(nom)))
      .sort(comparerParNumero)

    const prefs = preferences.filter((p) => correspond(terme, p.en, p.fr))

    return { objets, pokemon, prefs, total: objets.length + pokemon.length + prefs.length }
  }, [terme])

  return (
    <div className="accueil-ecran">
      <BandeDefilante sens="gauche" nombre={60} duree={190} />

      <div className="wrap accueil">
      <div className="accueil-hero">
        <div className="accueil-hero-texte">
      <header className="accueil-tete">
        <p className="etiquette marque-ligne">
          <IconeFeuille />
          Pokémon Pokopia · aménagement
        </p>
        <h1>Qu’est-ce qu’on pose, et pour qui ?</h1>
        <p className="accueil-chapeau">
          Les {preferences.length} préférences du jeu, les {prefsParObjet.size} objets qui les
          satisfont et les {prefsParPokemon.size} Pokémon qui les apprécient. Cherchez un objet
          pour voir tout ce qu’il coche, ou un Pokémon pour ouvrir sa fiche.
        </p>
      </header>

      <div className="accueil-recherche">
        <Input
          allowClear
          size="large"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="Chercher un objet, un Pokémon ou une préférence…"
          aria-label="Recherche"
        />
      </div>
        </div>

        {/* Visuel du jeu, embarqué comme le reste : aucune requête réseau. */}
        <figure className="accueil-illustration">
          <img
            src={illustration}
            alt="Des Pokémon de Pokopia réunis autour du personnage joueur"
            width="1000"
            height="720"
            loading="eager"
          />
        </figure>
      </div>

      {resultats && (
        <section className="resultats-globaux">
          {resultats.total === 0 ? (
            <p className="accueil-vide">
              Aucune correspondance. La recherche accepte le français et l’anglais.
            </p>
          ) : (
            <>
              {resultats.pokemon.length > 0 && (
                <div className="famille">
                  <h2 className="etiquette">
                    {resultats.pokemon.length} Pokémon
                    {resultats.pokemon.length > MAX_PAR_FAMILLE && (
                      <>
                        {' · '}
                        <Link to={`/pokedex?q=${encodeURIComponent(saisieDifferee.trim())}`}>
                          voir les {resultats.pokemon.length} dans le Pokédex →
                        </Link>
                      </>
                    )}
                  </h2>
                  <div className="lignes">
                    {resultats.pokemon.slice(0, MAX_PAR_FAMILLE).map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        className="ligne-resultat"
                        onClick={() => navigate(`/pokedex/${encodeURIComponent(nom)}`)}
                      >
                        <img src={urlSpritePokemon(spritePokemon(nom))} alt="" width="34" height="34" />
                        <span className="ligne-nom">{frPokemon(nom)}</span>
                        <span className="ligne-note">
                          {numeroAffiche(nom)}
                          {habitatDe(nom) ? ` · ${habitatDe(nom).toLowerCase()}` : ''} ·{' '}
                          {(prefsParPokemon.get(nom) || []).length} préf.
                          {parLAnglais(terme, nom, frPokemon(nom)) ? ` · ${nom}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {resultats.objets.length > 0 && (
                <div className="famille">
                  <h2 className="etiquette">
                    {resultats.objets.length} objet{resultats.objets.length > 1 ? 's' : ''}
                    {resultats.objets.length > MAX_PAR_FAMILLE && (
                      <>
                        {' · '}
                        <Link to={`/objets?q=${encodeURIComponent(saisieDifferee.trim())}`}>
                          voir les {resultats.objets.length} dans le catalogue →
                        </Link>
                      </>
                    )}
                  </h2>
                  <div className="lignes">
                    {resultats.objets.slice(0, MAX_PAR_FAMILLE).map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        className="ligne-resultat"
                        onClick={() => navigate(`/objet/${encodeURIComponent(nom)}`)}
                      >
                        <img src={urlSpriteObjet(spriteObjet(nom))} alt="" width="34" height="34" />
                        <span className="ligne-nom">{frObjet(nom)}</span>
                        <span className="ligne-note">
                          {prefsParObjet.get(nom).length} préférence
                          {prefsParObjet.get(nom).length > 1 ? 's' : ''}
                          {` · ${meubleDe(nom).toLowerCase()}`}
                          {frObjet(nom) === nom ? '' : ` · ${nom}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {resultats.prefs.length > 0 && (
                <div className="famille">
                  <h2 className="etiquette">{resultats.prefs.length} préférences</h2>
                  <div className="lignes-tags">
                    {resultats.prefs.map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        className="chip-tag"
                        onClick={() => navigate(`/preferences?q=${encodeURIComponent(p.fr)}`)}
                      >
                        {p.fr} <b>{p.objets.length} obj.</b>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="accueil-note">
                <Link to={`/preferences?q=${encodeURIComponent(saisieDifferee.trim())}`}>
                  Voir « {saisieDifferee.trim()} » dans l’index des préférences →
                </Link>
              </p>
            </>
          )}
        </section>
      )}

      <ProgressionVilles habitats={habitats} />

      {/* Les trois choses qu'on vient faire ici, chacune avec ce qu'elle couvre : les
          chiffres de l'application servent de preuve, pas de décor. */}
      <nav className="accueil-entrees" aria-label="Par où commencer">
        <Link
          to={habitats.length ? '/habitat' : '/habitat?nouveau=1'}
          className="entree"
          style={{ '--teinte': 'var(--second)' }}
        >
          <IconeMaison />
          <strong>{habitats.length ? 'Reprendre mes habitats' : 'Composer un habitat'}</strong>
          <span>
            {habitats.length
              ? `${habitats.length} habitat${habitats.length > 1 ? 's' : ''} enregistré${habitats.length > 1 ? 's' : ''}`
              : 'Jusqu’à 4 Pokémon, et le plus petit lot d’objets qui les contente tous.'}
          </span>
          <small>{prefsParPokemon.size} Pokémon · {preferences.length} préférences</small>
        </Link>
        <Link to="/objets" className="entree" style={{ '--teinte': 'var(--c-table)' }}>
          <IconeCaisse />
          <strong>À qui sert cet objet ?</strong>
          <span>Le catalogue, filtrable par catégorie, confort et personnalisation.</span>
          <small>
            {tousLesObjets.length} objets, dont {prefsParObjet.size} utiles à une préférence
          </small>
        </Link>
        <Link to="/construction" className="entree" style={{ '--teinte': 'var(--accent-ink)' }}>
          <IconeBriques />
          <strong>Préparer une construction</strong>
          <span>Taille d’une maison, formes, escaliers, et un plan à dessiner case par case.</span>
          <small>{SIMULATIONS.length} simulations</small>
        </Link>
      </nav>
      </div>
    </div>
  )
}
