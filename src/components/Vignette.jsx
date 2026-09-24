import { memo } from 'react'
import { Tooltip } from 'antd'
import { ICONE_HABITAT, ICONE_VILLE, IconePinceau } from './Icones'
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
 * @param nbPrefs        nombre de préférences cochées, affiché dès la première. `null` —
 *                       le défaut — n'affiche rien : l'index range déjà ses objets SOUS une
 *                       préférence, où le compte n'aurait rien à dire.
 * @param nomsPrefs      détail des préférences, pour l'infobulle
 * @param nbPokemon      colocataires satisfaits (vue habitat), affiché dès le premier.
 *                       `0` — le défaut — n'affiche rien, et c'est ce que passe un habitat
 *                       à un seul occupant : « 1 Pokémon » sous chacun des quatre cents
 *                       objets ne dirait rien que le titre ne dise déjà.
 * @param nomsPokemon    détail des colocataires, pour l'infobulle
 * @param badges         les deux compteurs sous l'image — « N Pokémon », « N préf. ». Les
 *                       éteindre ne laisse que le sprite : c'est la grille réduite à des
 *                       silhouettes, pour balayer quatre cents objets d'un regard. Le
 *                       liseré d'accent, lui, reste : il marque les objets qui cochent
 *                       plusieurs préférences sans coûter une ligne de texte.
 * @param pinceau        un pinceau sous le type : Smearguru peut le repeindre. Réservé au
 *                       catalogue des objets — ailleurs, la vignette répond à une autre
 *                       question, et la marque n'y serait qu'un signe de plus à lire.
 * @param bulle          ce qu'une vraie infobulle ajoute à l'objet — la vue habitat y
 *                       détaille son badge « N préf. ». Elle remplace alors le `title`
 *                       natif ; les autres vues gardent l'infobulle du navigateur.
 * @param nue            le sprite et les badges, sans nom ni type : trois lignes de 8 px
 *                       répétées quatre cents fois ne se lisent pas, là où un sprite se
 *                       reconnaît d'un coup d'œil. Ce que la vignette cesse alors de
 *                       montrer, l'infobulle le reprend en tête — les deux vont donc de
 *                       pair, et une vignette nue sans `bulle` serait muette.
 */
export const VignetteObjet = memo(function VignetteObjet({
  nom,
  trouve = false,
  nbPrefs = null,
  nomsPrefs = '',
  nbPokemon = 0,
  nomsPokemon = '',
  pinceau = false,
  bulle = null,
  nue = false,
  badges = true,
  onClick,
}) {
  const fr = frObjet(nom)
  const meuble = typeObjet(nom, objetParNom.get(nom)?.categorie)
  // Les deux compteurs tombent dès la première unité, pour qu'une vignette sans badge veuille
  // dire « aucun », et non « un, qu'on ne vous dit pas ». `multi` et `partage` gardent leur
  // seuil à 2 : ce sont eux qui teintent le badge et posent le liseré d'accent, et un
  // liseré sur toute la grille ne signalerait plus rien.
  const compte = nbPrefs >= 1
  const compteMon = nbPokemon >= 1
  const multi = nbPrefs > 1
  const partage = nbPokemon > 1
  const infobulle =
    nom + (nomsPrefs ? ` — ${nomsPrefs}` : '') + (nomsPokemon ? ` | plaît à : ${nomsPokemon}` : '')

  const vignette = (
    <button
      type="button"
      className={'chip' + (trouve ? ' hit' : '') + (multi || partage ? ' multi' : '') + (nue ? ' nue' : '')}
      title={bulle ? undefined : infobulle}
      // Sans nom écrit, le bouton n'a plus de nom accessible : une image vide et deux
      // badges chiffrés ne disent rien à un lecteur d'écran.
      aria-label={nue ? fr : undefined}
      onClick={onClick}
    >
      <Image src={urlSpriteObjet(spriteObjet(nom))} />
      {!nue && (
        <>
          <span className="chip-name">{fr}</span>
          {fr !== nom && <span className="chip-en">{nom}</span>}
          <span className={'chip-sub meuble-' + meuble}>
            {FR_TYPE_OBJET[meuble]}
            {pinceau && <IconePinceau className="chip-pinceau" />}
          </span>
        </>
      )}
      {badges && compteMon && (
        <span className={'chip-badge shared' + (partage ? '' : ' seule')}>
          {nbPokemon} Pokémon
        </span>
      )}
      {badges && compte && (
        <span className={'chip-badge' + (multi ? '' : ' seule')}>{nbPrefs} préf.</span>
      )}
    </button>
  )

  // L'infobulle reprend ce que la vignette ne montre pas, et rien de plus : l'identité en
  // tête quand la vignette est nue, jamais quand elle porte déjà son nom sous l'image.
  // Le délai, lui, vient de la grille : quatre cents vignettes serrées, et une bulle qui
  // surgit au moindre passage de la souris rendrait le survol illisible.
  return bulle ? (
    <Tooltip
      title={
        <>
          {nue && (
            <span className="bulle-tete">
              <strong>{fr}</strong>
              {fr !== nom && <span className="bulle-en">{nom}</span>}
              <span className={'bulle-type meuble-' + meuble}>{FR_TYPE_OBJET[meuble]}</span>
            </span>
          )}
          {bulle}
        </>
      }
      mouseEnterDelay={0.25}
      placement="top"
      classNames={{ root: 'bulle-objet' }}
    >
      {vignette}
    </Tooltip>
  ) : (
    vignette
  )
})

/**
 * @param nom            nom anglais du Pokémon
 * @param trouve         surligné : correspond à la recherche
 * @param selectionne    déjà présent dans le groupe de colocataires
 * @param note           ligne supplémentaire — sert à nommer l'habitat où il vit déjà
 * @param desactive      non sélectionnable (déjà placé ailleurs, ou groupe complet)
 * @param score          compatibilité en % avec le groupe en cours de composition
 * @param ville          clé de ville, affichée sous le numéro (vue Villes, sélecteur)
 * @param nomVille       son libellé — passé plutôt que résolu ici, à cause du renommage
 * @param suggere        mis en avant : la suggestion de colocataire du moment
 */
export const VignettePokemon = memo(function VignettePokemon({
  nom,
  trouve = false,
  selectionne = false,
  note = '',
  desactive = false,
  score = null,
  ville = '',
  nomVille = '',
  suggere = false,
  onClick,
}) {
  const habitat = habitatDe(nom)
  const brutHabitat = pokemonParNom.get(nom)?.habitat
  const IconeHab = ICONE_HABITAT[brutHabitat]
  const IconeVil = ville ? ICONE_VILLE[ville] : null
  const numero = numeroAffiche(nom)

  return (
    <button
      type="button"
      className={
        'chip mon' +
        (trouve ? ' hit' : '') +
        (selectionne ? ' sel' : '') +
        (desactive ? ' off' : '') +
        (suggere ? ' sug' : '')
      }
      title={
        `${frPokemon(nom)} (${nom})` +
        (nomVille ? ` — ${nomVille}` : '') +
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
      {ville && (
        <span className={'chip-sub chip-ville ville-' + ville}>
          {IconeVil && <IconeVil />}
          {nomVille}
        </span>
      )}
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
