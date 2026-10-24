# Page « Méthodes » — suivi des méthodes de fabrication connues

## Pourquoi

Depuis plusieurs jours, la boutique du PC ne propose au joueur que des méthodes qu'il
connaît déjà. Il ne sait pas s'il lui en reste à débloquer, ni où les chercher. Le jeu ne
donne pas de vue d'ensemble : il faut une liste complète des méthodes, où **cocher celles
qu'on connaît**, et qui dise pour les autres **où les obtenir**.

Réussite : en filtrant « à trouver », le joueur voit ce qui lui manque et sait quoi faire
(monter tel niveau de zone, surveiller l'offre du jour, pêcher les remous, avancer
l'histoire).

## Ce qui a été décidé avec l'utilisateur

- **Une page à part**, `/methodes`, et non une case dans la page Objets.
- Une **case à cocher** par méthode, « connue ».
- Les **méthodes de l'Expansion Pass** sont affichées comme les autres : l'utilisateur
  prend le pass (sortie le 29 octobre 2026).
- **Toutes les lignes ont une vignette**, y compris les ~470 méthodes sans objet dans le
  catalogue (blocs, murs, sols, constructions) : l'import récupère leur image chez
  Serebii. Pour un bloc, l'image est ce qui permet de reconnaître la méthode en jeu.

## Ce que la page montre (proposé, non contredit)

- Une **liste dense**, une ligne par méthode : case, nom français (recherche aussi sur
  l'anglais, comme ailleurs dans l'app), famille, **où l'obtenir**, et la vignette quand
  l'objet en a une.
- En tête : le compteur **« N / 883 connues »** et le filtre **connues / à trouver / toutes**.
- Un filtre **par source** (boutique d'une zone, offre du jour, remous, histoire,
  Expansion Pass…) et un filtre **par famille**. Combinés à « à trouver », ils répondent à
  « que me reste-t-il à acheter à Grisemer, et à quel niveau ? ».
- La ligne d'un objet qui a déjà une fiche dans l'app (environ 410) mène à cette fiche.
  Les autres (blocs, murs, sols, constructions) n'ont pas de fiche : la ligne est simple.
- Sur la **fiche objet** : « Méthode : connue / à trouver », la case pour la basculer, et
  où l'obtenir.
- Les coches survivent au rechargement (localStorage), avec **exporter / importer** en
  JSON comme les habitats.

## Les données

**Source : Serebii, `pokemonpokopia/crafting.shtml`.** 884 lignes (883 noms uniques) en
7 sections — Furniture 121, Misc. 126, Outdoor 61, Utilities 75, Buildings 163, Blocks 152,
Other 186. Chaque ligne a quatre colonnes : image, nom (lien `items/<slug>.shtml`),
**Locations** (plusieurs sources séparées par `<br />`), **Requirements** (ingrédients ×
quantité).

Les sources relevées, par fréquence : « Daily Shop Special » (~330), « Sparkling Water » /
« Sparkling ripples in water » (~355), « Expansion Pass only » (141), « Shop - <zone>
Lv. N » (~190, dont « Shop (as bundle) … » et des lots nommés « Mountain House Recipe
Set »), histoire (« From Chef Dente… »), « Obtain a Vine rope », « After first getting
paint », « <zone> (Item) », Carte au trésor, Neo Dowsing Machine… Le texte est saisi à la
main par Serebii : orthographes variables (« Sparkly Skylands », « Withered Wasteland »,
« Daily shop special », doubles espaces).

**Noms français : Pokékalos** (`pokekalos.fr/jeux/switch2/pokopia/objets.html`, attributs
`data-name-en` / `data-name-fr`, déjà utilisé par `scripts/importer-pokekalos-noms.mjs`).
Il couvre presque tout ; la trentaine d'échecs du premier essai vient des entités HTML
(`Pok&eacute;`) mal repliées, pas de noms manquants. Le nom français du catalogue
(`objets.json`) prime quand l'objet y est. Ce qui reste sans nom français s'affiche en
anglais.

**Zones**, vers les noms de l'app (`src/data/villes.js`) : Withered Wastelands →
Terrassec, Bleak Beach → Grisemer, Rocky Ridges → Collinangle, Sparkling Skylands →
Flotîles-Millefeux, Palette Town → Ville-Nouvelle, Bubbly Basin → Fonds Bulleux.

**Livrables données**, sur le modèle des autres imports :
- `scripts/importer-serebii-methodes.mjs` : télécharge, compare, n'écrit rien sans
  `--ecrire`, accepte `--local <dossier>` ; imprime ce qui n'est pas apparié (nom
  français, source non reconnue).
- `src/data/methodes.json` avec `_lisezMoi` et `_source`, une entrée par méthode : nom
  anglais (la clé), nom français, famille, sources normalisées (type + zone + niveau
  quand il y en a), et le texte Serebii d'origine pour ne rien perdre.

**Vignettes.** Un objet du catalogue garde son sprite actuel (`src/data/sprites/objets`,
résolu par `src/data/images.js`). Pour les autres, l'import télécharge l'image Serebii
(colonne Picture) dans un dossier à part, `src/data/sprites/methodes/`, au format des
autres sprites (webp, 72 px, comme `importer-aliments.mjs` : il ne télécharge que ce qui
manque et dit ce qui reste à convertir), globé dans `images.js`. `methodes.json` porte la
clé de sprite de chaque ligne. *(Choix du rédacteur : dossier séparé, pour ne pas mêler au
catalogue des clés qui n'y ont pas d'entrée.)*

**Détails réglés par le rédacteur :** le compteur se calcule sur `methodes.json` (pas de
883 en dur) ; la ligne Serebii en double est fusionnée (sources réunies) ; l'appariement
au catalogue se fait sur le nom anglais normalisé (casse, entités HTML, apostrophes) ; le
lien vers une fiche passe par `/objet/:nom` avec le nom anglais du catalogue.

## Stockage

`src/utils/methodesStorage.js`, même schéma que `habitatsStorage.js` / `villesStorage.js` :
store partagé (`useSyncExternalStore`), clé `pokopia:methodes`, qui ne garde que **les
noms anglais des méthodes connues**. Un nom inconnu de `methodes.json` est conservé tel
quel (une mise à jour Serebii peut renommer une ligne ; on ne jette pas la coche du
joueur), mais n'est pas compté. Export au format `{ format: 'pokopia:methodes', version: 1,
connues: [...] }` ; l'import **ajoute** aux coches existantes.

## Hors sujet

- Les **ingrédients** ne sont pas affichés en v1 (la donnée est importée et gardée, pour
  plus tard).
- Pas de détection automatique de ce que le joueur connaît : tout est coché à la main.
- Les recettes de **cuisine** (`cooking.shtml`) ne sont pas des méthodes de fabrication.
- On ne crée pas de fiches pour les ~470 méthodes sans objet dans le catalogue.

## À éviter

- Afficher les textes de source bruts en anglais comme filtre : le filtre doit parler
  français et regrouper les variantes d'orthographe.
- Perdre les coches du joueur à une mise à jour des données.

## Laissé au constructeur

La mise en page exacte (en suivant le style des pages Objets et Villes), l'entrée de menu
et la carte d'accueil éventuelle, la normalisation fine des sources, le tri par défaut
(proposé : par famille puis nom), la mention dans le README et la note de version.
