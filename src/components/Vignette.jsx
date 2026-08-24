import { memo } from 'react'
import { ICONE_HABITAT } from './Icones'
import { FR_TYPE_OBJET, typeObjet } from '../data/categories'
import { urlSpriteObjet, urlSpritePokemon } from '../data/images'
import {
  frObjet,
  frPokemon,
  habitatDe,
  numeroAffiche,
  objetParNom,
  pokemonParNom,
  specialitesDe,
  spriteObjet,
  spritePokemon,
} from '../data'

/**
 * Les deux vignettes de l'app : un objet (fond lavande) et un Pokémon (fond vert).
 *
 * Elles sont mémoïsées parce que l'index en affiche jusqu'à 3 000 d'un coup quand tout
 * est déplié, et qu'une frappe dans la recherche ne change l'état que de quelques-unes.
 * Les images sont en `loading="lazy"` pour la même raison.
 */

function Image({ src }) {
  if (!src) return null
  return <img src={src} alt="" width="60" height="60" loading="lazy" />
}

/**
 * @param nom            nom anglais de l'objet (la clé de toutes les tables)
 * @param trouve         surligné en jaune : correspond à la recherche en cours
 * @param nbPrefs        nombre de préférences cochées, affiché au-delà de 1
 * @param nomsPrefs      détail des préférences, pour l'infobulle
 * @param nbPokemon      colocataires satisfaits (vue habitat), affiché au-delà de 1
 * @param nomsPokemon    détail des colocataires, pour l'infobulle
 */
export const VignetteObjet = memo(function VignetteObjet({
  nom,
  trouve = false,
  nbPrefs = 1,
  nomsPrefs = '',
  nbPokemon = 0,
  nomsPokemon = '',
  onClick,
}) {
  const fr = frObjet(nom)
  const meuble = typeObjet(nom, objetParNom.get(nom)?.categorie)
  const multi = nbPrefs > 1
  const partage = nbPokemon > 1
  const infobulle =
    nom + (nomsPrefs ? ` — ${nomsPrefs}` : '') + (nomsPokemon ? ` | plaît à : ${nomsPokemon}` : '')

  return (
    <button
      type="button"
      className={'chip' + (trouve ? ' hit' : '') + (multi || partage ? ' multi' : '')}
      title={infobulle}
      onClick={onClick}
    >
      <Image src={urlSpriteObjet(spriteObjet(nom))} />
      <span className="chip-name">{fr}</span>
      {fr !== nom && <span className="chip-en">{nom}</span>}
      <span className={'chip-sub meuble-' + meuble}>{FR_TYPE_OBJET[meuble]}</span>
      {partage && <span className="chip-badge shared">{nbPokemon} Pokémon</span>}
      {multi && <span className="chip-badge">{nbPrefs} préf.</span>}
    </button>
  )
})

/**
 * @param nom            nom anglais du Pokémon
 * @param trouve         surligné : correspond à la recherche
 * @param selectionne    déjà présent dans le groupe de colocataires
 * @param note           ligne supplémentaire — sert à nommer l'habitat où il vit déjà
 * @param desactive      non sélectionnable (déjà placé ailleurs, ou groupe complet)
 * @param score          compatibilité en % avec le groupe en cours de composition
 */
export const VignettePokemon = memo(function VignettePokemon({
  nom,
  trouve = false,
  selectionne = false,
  note = '',
  desactive = false,
  score = null,
  onClick,
}) {
  const habitat = habitatDe(nom)
  const brutHabitat = pokemonParNom.get(nom)?.habitat
  const IconeHab = ICONE_HABITAT[brutHabitat]
  const numero = numeroAffiche(nom)

  return (
    <button
      type="button"
      className={
        'chip mon' + (trouve ? ' hit' : '') + (selectionne ? ' sel' : '') + (desactive ? ' off' : '')
      }
      title={
        `${frPokemon(nom)} (${nom})` +
        (specialitesDe(nom).length ? ` — ${specialitesDe(nom).join(', ')}` : '') +
        (note ? ` — ${note}` : '')
      }
      disabled={desactive}
      onClick={onClick}
    >
      <Image src={urlSpritePokemon(spritePokemon(nom))} />
      <span className="chip-name">{frPokemon(nom)}</span>
      <span className="chip-sub">
        {numero}
        {habitat && (
          <>
            {' '}
            <span className={'marque-habitat hab-' + brutHabitat}>
              {IconeHab && <IconeHab />}
              {habitat}
            </span>
          </>
        )}
      </span>
      {/* Trois paliers plutôt qu'un dégradé : on choisit un colocataire, pas une nuance. */}
      {score !== null && (
        <span className={'chip-badge compat ' + (score >= 40 ? 'fort' : score >= 15 ? 'moyen' : 'faible')}>
          {score} % compat.
        </span>
      )}
      {note && <span className="chip-badge loge">{note}</span>}
    </button>
  )
})
