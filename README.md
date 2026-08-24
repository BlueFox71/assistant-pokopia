# Assistant Pokopia

Index des **43 préférences d'aménagement** de *Pokémon Pokopia* : pour chacune, les objets
qui la satisfont et les Pokémon qui l'apprécient — et l'inverse, qui est la question qu'on
se pose vraiment en jeu : « quels objets poser dans l'enclos de ces quatre-là ? »

Tout est embarqué (données et 1 081 vignettes) : l'application ne fait aucune requête
réseau, sur le web comme en version bureau.

## Les vues

| Vue | Ce qu'elle répond |
| --- | --- |
| **Accueil** (`/`) | Le tableau de bord : une **recherche globale** qui mène directement à la bonne fiche — un objet ouvre la sienne, un Pokémon la sienne, une préférence ouvre l'index positionné dessus —, les habitats enregistrés avec leur compatibilité, et les trois vues en accès. |
| **Préférences** (`/preferences`) | Les 43 cartes dépliables. La recherche accepte le français et l'anglais, et remonte au-dessus de la grille la **recherche inversée** : un objet coche souvent plusieurs préférences, c'est ce croisement qui décide de le fabriquer. |
| **Habitat** (`/habitat`) | Des habitats nommés, enregistrés, de un à quatre colocataires. Leurs préférences se cumulent, et chaque objet est classé d'abord par le **nombre de colocataires** qu'il satisfait, ensuite par le nombre de préférences cochées : un objet « 3 Pokémon » vaut mieux que trois objets séparés. Deux filtres — **catégorie d'objet** et préférence — plus le décompte Repos / Décoration / Jouet du confort « exceptionnel ». |
| **Pokédex** (`/pokedex`) | Les 366 Pokémon, filtrables par habitat, **type** et **spécialité**, triables par numéro, nom ou nombre de préférences. Chaque fiche donne ses préférences, ses objets les plus utiles et les Pokémon aux **goûts les plus proches** — le bon réflexe avant de composer un enclos. |

L'index accepte `?q=` comme point d'entrée (`/preferences?q=lampe`), ce dont se sert l'accueil.
Deux fiches complètent l'ensemble : `/pokedex/:nom` et `/objet/:nom` (« j'ai ce plan de
fabrication, à qui sert-il ? »).

### Les habitats enregistrés

L'onglet Habitat a quatre états, tous lisibles dans l'URL :

| URL | Vue |
| --- | --- |
| `/habitat` | la liste des habitats enregistrés |
| `/habitat?nouveau=1` | le sélecteur, pour en composer un (1 à 4 Pokémon) |
| `/habitat?habitat=<id>` | un habitat enregistré, et les objets à y poser |
| `/habitat?pokemon=A,B` | un **groupe libre**, non enregistré mais partageable par lien |

Un habitat est stocké dans le `localStorage` (`pokopia:habitats`) sous la forme minimale
« un nom, un à quatre Pokémon » : tout le reste — préférences, objets, avertissements — se
recalcule à l'ouverture, donc un habitat enregistré aujourd'hui reste juste si les listes
de Serebii bougent demain.

Le sélecteur masque par défaut les Pokémon **qui vivent déjà quelque part** (bascule
« Sans habitat seulement », active dès qu'un habitat existe), et affiche sous les autres le
nom de leur habitat. Un Pokémon n'appartient qu'à un seul habitat à la fois.

Le groupe libre existe pour les liens venant des fiches (« Composer un habitat ») et
s'enregistre en un clic.

**Sauvegarde.** Le bouton du même nom, dans la liste, affiche les habitats au format JSON :
à copier quelque part, et à recoller pour les restaurer — ici, ou dans une autre
installation. L'import **ajoute** sans jamais écraser : un identifiant déjà présent est
ignoré. C'est le seul moyen d'emporter ses habitats, puisqu'ils vivent dans le
`localStorage` d'une origine précise et ne suivent ni un vidage des données du site, ni un
changement de navigateur, ni le passage de la version web à l'exe.

**Compatibilité.** Un groupe affiche un taux de 0 à 100 %, calculé comme la **moyenne du
recouvrement des préférences paire par paire** (communes ÷ réunies). L'intersection de tout
le groupe serait un mauvais indicateur — à quatre elle est presque toujours vide, et le
score resterait à zéro sans rien distinguer. Le taux apparaît là où il sert :

- pendant la composition, sur **chaque vignette candidate** — ce que deviendrait le taux si
  on l'ajoutait — et sur le panier pour le groupe en cours ; une bascule trie les 366
  Pokémon par compatibilité ;
- en tête de l'habitat, avec les préférences que **tout** le groupe apprécie ;
- sur les cartes de la liste.

Le taux ne dit rien de l'habitat idéal : deux Pokémon à 90 % peuvent être l'un Chaud et
l'autre Froid, ce qu'un enclos ne peut pas satisfaire. C'est l'avertissement d'habitat,
séparé, qui s'en charge.

### Les catégories d'objet

Le jeu ne fournit qu'une catégorie de confort (Repos, Décoration, Jouet, Route), qui ne dit
pas si un « Repos » est un lit ou une chaise. `src/data/categories.js` déduit donc du nom
anglais douze catégories de meuble :

| Catégorie | Objets | Notes |
| --- | --- | --- |
| Lit | 22 | |
| Chaise | 37 | chaises, tabourets, bancs, sièges |
| Canapé | 11 | |
| Table | 18 | tables et bureaux |
| Commode | 46 | tout ce qui range : armoires, étagères, coffres, caisses |
| Lumière | 46 | lampes, lampadaires, lanternes, bougies |
| Écran | 12 | |
| Meuble divers | 31 | mobilier utilitaire : sanitaire, cuisine, électroménager, cheminées, fontaines, miroirs |
| Plante | 12 | plantes en pot, jardinières, couronnes |
| Décoration | 213 | le reste des objets meublants |
| Fossile | 22 | **décochée par défaut** |
| Ressource | 244 | matériaux, peintures, revêtements, disques — **décochée par défaut** |

Deux catégories ne viennent pas d'un mot-clé mais d'une absence : `ressource` regroupe ce
qui n'a **pas** de catégorie de confort et n'a été reconnu comme aucun meuble. L'ordre des
règles compte donc — une quinzaine de tables et de bureaux n'ont pas de catégorie de
confort et seraient devenus des « ressources » sur ce seul critère.

Une règle par mot-clé se trompe en silence : `node scripts/auditer-categories.mjs --tout`
imprime le classement complet, à relire quand les données changent.

### Les trois Pokédex, et pourquoi le numéro seul ne suffit pas

Pokopia tient **trois Pokédex, chacun numéroté à partir de #001** :

| Pokédex | Entrées | Source |
| --- | --- | --- |
| principal | 307 (300 espèces + formes) | `availablepokemon.shtml` |
| bassin — DLC Bubbly Basin | 52 | `basinpokedex.shtml` |
| événement | 7 | `eventpokedex.shtml` |

Un numéro seul est donc ambigu : **Onix est #030 du principal, Mamanbo #030 du bassin**. Les
données d'origine fusionnaient les trois en une table unique, ce qui produisait 56 numéros
portés par deux Pokémon sans rapport, et un tri qui intercalait les uns entre les autres.

`scripts/importer-serebii-dex.mjs` rétablit le champ `dex` et fait autorité sur les
numéros ; l'affichage préfixe ceux qui ne sont pas du principal (« Bassin #030 »,
« Événement #001 ») et le tri passe par le Pokédex avant le numéro.

```sh
node scripts/importer-serebii-dex.mjs            # télécharge, compare, n'écrit rien
node scripts/importer-serebii-dex.mjs --ecrire   # applique
```

Il signale les numéros partagés qui subsistent : neuf, tous légitimes — ce sont des formes
d'une même espèce (Sancoki et Sancoki Mer Est, les trois Nigirigon…). Le seul trou du
Pokédex principal est **#047, Métamorph**, qui n'a aucune préférence chez Serebii puisqu'il
est le personnage joueur.

### Types et spécialités

`scripts/importer-pokebip.mjs` complète `pokemon.json` avec le numéro Pokopia, les types et
la **spécialité** — le travail que le Pokémon accomplit sur l'île (Fertilisation,
Combustion, Coupe de bois…), depuis le
[Pokédex Pokopia de Pokébip](https://www.pokebip.com/page/jeux-video/pokemon-pokopia/pokedex).

```sh
node scripts/importer-pokebip.mjs            # télécharge, compare, n'écrit rien
node scripts/importer-pokebip.mjs --ecrire   # applique
```

L'appariement se fait sur le nom français, et les formes héritent de leur espèce
(« Sancoki (Mer Est) » suit « Sancoki »).

**Pokébip ne couvre que le Pokédex principal**, soit 288 de nos 366 entrées : les 52 du
bassin, les 7 événementiels et 19 formes ou surnoms (Professeur Bouldeneu, Motisma Enceinte,
Ronflex moussu…) restent sans type ni spécialité, et l'affichage saute la ligne. Le script
imprime la liste des non-appariés.

**Ce script ne fait pas autorité sur les numéros** — `importer-serebii-dex.mjs` s'en charge,
et doit passer après lui. Pokébip porte d'ailleurs une coquille sur ce point : Riolu et
Lucario y sont tous deux en #180, puis la liste saute à #182 ; Serebii donne #180 et #181,
sans trou.

## La charte

Lavande pour la marque et les objets, vert pour les Pokémon. Par-dessus, **trente-six
couleurs sémantiques** portent le sens là où il y en a un :

| Famille | Où | Exemple |
| --- | --- | --- |
| 18 types | pastilles de la fiche Pokémon | Feu orangé, Eau bleu, Plante vert |
| 6 habitats idéaux | sous chaque Pokémon, filtres du Pokédex, liseré des cartes d'habitat | Lumineux ambre, Humide bleu, Chaud rouge |
| 12 catégories de meuble | sous chaque objet, bascules de la vue habitat, fiche objet | Lumière ambre, Lit violet, Plante vert |

Elles sont écrites **une seule fois**, en HSL, et empruntent leur luminosité à deux
variables — `--lum` pour l'encre, `--lum-fond` pour l'aplat. Le thème sombre ne redéfinit
que ces deux-là et les trente-six teintes suivent : deux jeux complets écrits à la main
auraient divergé à la première retouche.

L'illustration de l'accueil (`src/assets/accueil-pokopia.webp`) est un visuel du jeu,
recadré sur les personnages et converti en WebP. Elle est **embarquée**, pas liée : le CSP
de la coquille Tauri n'autorise que `img-src 'self' data: blob:`, donc une URL distante
n'afficherait rien dans l'exe — et l'application ne fait aucune requête réseau.

Deux frises de **60 Pokémon** tirés au sort traversent l'accueil (`components/BandeDefilante.jsx`) :
l'une sous l'en-tête, vers la gauche, l'autre en pied de page, vers la droite. La boucle est
sans couture parce que la piste contient **deux fois** le même tirage et se déplace
d'exactement la moitié de sa largeur. Elle ne s'arrête pas au survol — seule la vignette
visée se détache — mais se fige sous `prefers-reduced-motion`.

L'accueil **tient dans un écran** : `.accueil-ecran` fait la hauteur du viewport moins
l'en-tête, mesuré par un `ResizeObserver` plutôt que figé, et la frise du bas est poussée en
pied par une marge automatique. Dès qu'une recherche affiche des résultats, la page reprend
sa hauteur naturelle et défile.

Les frises sont des enfants directs de cette colonne pleine largeur, **jamais du `.wrap`
centré** : c'est ce qui leur évite la ruse du `100vw`, laquelle ignore la barre de
défilement verticale et finit par provoquer une barre horizontale dès que la page s'allonge.

Les icônes sont dans `src/components/Icones.jsx`, dessinées à la main en SVG inline —
Poké Ball, feuille, maison, soleil, lune, goutte, dune, flamme, flocon, lit, chaise,
canapé, table, commode, lampe, écran, robinet, plante, étoile, os, rondin. Ni police
d'icônes ni bibliothèque : tout doit rester embarqué, exe compris. Chacune hérite de
`currentColor` et se dimensionne en `em`, donc elle prend la couleur et la taille de son
texte — c'est ce qui fait que l'onglet actif, une bascule allumée ou une pastille de type
colorent leur icône sans une règle de plus.

## Développement

```sh
npm install
npm run dev            # http://localhost:5191
npm run build          # build web (base /assistant-pokopia/ pour GitHub Pages)
npm run desktop:dev    # coquille Tauri
npm run desktop:build  # exe autonome (--no-bundle)
```

> **Tester sans détruire ses habitats.** Le serveur écoute aussi sur
> **http://127.0.0.1:5191** — pour le navigateur, c'est une **autre origine**, donc un autre
> `localStorage`. On y crée et supprime des habitats de test sans toucher à ceux enregistrés
> sur `localhost`. À utiliser systématiquement pour essayer la création, l'import ou la
> suppression.

## Les données

`src/data/` contient trois fichiers plats et les vignettes :

| Fichier | Contenu |
| --- | --- |
| `preferences.json` | les 43 préférences : `slug`, nom anglais, nom français, objets, Pokémon |
| `objets.json` | 714 objets : nom anglais, traduction, catégorie en jeu, clé de sprite |
| `pokemon.json` | 366 Pokémon : nom anglais, nom français, numéro Pokopia, habitat, clé de sprite, types et spécialités (cf. « Types et spécialités ») |
| `sprites/objets/`, `sprites/pokemon/` | 1 081 vignettes WebP de 44 px |

Ils sont **extraits** de l'artifact d'origine (« Pokopia — Index des préférences ») par
`scripts/extraire-artifact.mjs`, qui vérifie au passage qu'aucune entrée ne manque d'image,
de traduction, de numéro ni d'habitat :

```sh
node scripts/extraire-artifact.mjs <artifact.html>              # audit seul
node scripts/extraire-artifact.mjs <artifact.html> src/data     # audit + réécriture
```

`src/data/index.js` inverse les relations une fois à l'import (objet → préférences,
Pokémon → préférences) : l'index affiche jusqu'à 3 000 vignettes déplié, et la vue habitat
recroise quatre Pokémon à chaque frappe.

### Ce qui est officiel, et ce qui ne l'est pas

Les noms de préférences et de Pokémon sont les libellés officiels français. **Les noms
d'objets en français sont une traduction maison** : aucune source ne les publie. Le nom
anglais est conservé sous chaque vignette — c'est lui qui permet de retrouver l'objet sur
les guides communautaires.

Sources : [Serebii](https://www.serebii.net/pokemonpokopia/favorites.shtml) pour les listes,
icônes, catégories et habitats (section signalée comme en cours de complétion) ;
[Joenesteam](https://www.joenesteam.fr/pokopia-preferences-exceptionnel/) pour les noms
français des préférences ;
[Pokébip](https://www.pokebip.com/page/jeux-video/pokemon-pokopia/pokedex) pour les numéros,
les types et les spécialités.

## Distribution

- **Web** : GitHub Pages, via `.github/workflows/deploy.yml` à chaque push sur `main`.
- **Bureau** : `git tag v1.0.1 && git push --tags` déclenche `release.yml`, qui publie
  `Assistant-Pokopia-<version>.exe` — un exécutable autonome, tel que
  [Le Grenier](https://github.com/BlueFox71/le-grenier) l'attend.
