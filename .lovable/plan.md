## Objectif

Appliquer une échelle typographique unique et fixe au contenu de tous les articles en ligne (et des prochains, articles comme interviews), exprimée en points Word puis convertie en pixels (1 pt = 1,333 px) :

| Niveau | Taille demandée | Taille CSS |
|---|---|---|
| H1 | 20 pt | 27 px |
| H2 | 16 pt | 21 px |
| H3 | 14 pt | 19 px |
| H4 | 14 pt | 19 px |
| Corps de texte | 12 pt | 16 px |

## Ce qui change

**1. `src/styles.css` — bloc `.article-prose`**
- Corps : taille fixe 16 px (au lieu de 17 px mobile / 19 px desktop). Suppression de la variante responsive : une seule taille sur tous les écrans, comme dans Word.
- Titres : 27 / 21 / 19 / 19 px, également fixes, donc suppression du bloc responsive `@media (min-width: 768px)` qui montait les titres à 56/34/26/21 px.
- Les autres règles de la charte restent inchangées : police Bebas Neue en majuscules pour les titres, Inter pour le corps, interligne 1,75, citations à filet jaune, images arrondies avec légende, listes, liens bleus.
- Les marges verticales entre blocs sont réajustées proportionnellement pour que la hiérarchie reste lisible malgré le faible écart entre 27 px et 16 px (espace plus généreux avant un H2 qu'avant un H3).

**2. Portée automatique**
Ces règles portent sur la classe `.article-prose`, déjà utilisée par :
- la page article publique `src/routes/articles.$slug.tsx`
- l'éditeur du back office `src/components/RichTextEditor.tsx` (aperçu identique au rendu final)
- la page de référence `src/routes/admin.charte.tsx`

Les articles existants et tous les futurs contenus, quelle que soit la catégorie (articles, interviews), héritent donc automatiquement de l'échelle, sans modification en base de données.

**3. `src/routes/admin.charte.tsx`**
Mise à jour du tableau de référence pour afficher les nouvelles valeurs (20/16/14/14 pt et 12 pt corps) avec leur équivalent en pixels.

## Point d'attention

Avec 12 pt de corps et 20 pt de H1, l'écart de hiérarchie est nettement plus faible qu'aujourd'hui : les intertitres H3/H4 (19 px) ne feront que 3 px de plus que le texte. Le contraste visuel reposera surtout sur la police Bebas Neue en majuscules et sur les espacements. Si le rendu paraît trop plat après application, on pourra ajuster les seuls espacements sans toucher aux tailles.

## Détails techniques

Toutes les déclarations de taille conservent `!important` afin de continuer à neutraliser les styles en ligne hérités du WYSIWYG et des collages externes (balises `<font>`, `style="font-size:…"`). Aucune migration base de données, aucun changement de composant React.
