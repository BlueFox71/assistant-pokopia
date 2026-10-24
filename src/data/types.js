/**
 * Le type d'un objet, tel que l'app l'affiche partout : categories.js décide d'après le nom,
 * ici on lui fournit ce que le nom ne dit pas — la catégorie de confort, la liste des CD
 * (cf. scripts/importer-serebii-cds.mjs) et l'onglet du jeu où il se range
 * (cf. scripts/importer-pokekalos-categories.mjs).
 */

import { typeFabrique, typeObjet } from './categories'
import { objetParNom } from './index'
import fichierCds from './cds.json'
import fichierOnglets from './categories-jeu.json'

const cds = new Set(fichierCds.cds)
const ongletDe = (nom) => fichierOnglets.categories[nom.toLowerCase()] || null

/** nom anglais d'un objet du catalogue -> une des clés de TYPES_OBJET */
export const typeDe = (nom) =>
  typeObjet(nom, objetParNom.get(nom)?.categorie, { cd: cds.has(nom), onglet: ongletDe(nom) })

/** Une méthode sans objet au catalogue (cf. data/methodes.js) -> une des clés de TYPES_OBJET */
export const typeDeMethode = (m) => typeFabrique(m.en, m.famille, ongletDe(m.en))
