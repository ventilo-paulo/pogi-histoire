## Objectif

Ajouter au back office un tableau de bord "Notion" et une synchronisation bidirectionnelle automatique (toutes les 15 min) entre tes bases Notion (Articles + Vidéos) et la base de données du site.

## 1. Connexion Notion

- Connexion du connecteur Notion Lovable (OAuth). Une fois lié, `NOTION_API_KEY` est dispo côté serveur.
- Dans le back office → nouvelle page **Réglages Notion** (`/admin/notion`) où tu colles :
  - ID de la base Notion **Articles**
  - ID de la base Notion **Vidéos**
- Ces IDs sont stockés dans une table `notion_settings` (une seule ligne, admin only).
- Bouton "Tester la connexion" qui appelle les 2 bases via le gateway Notion et affiche les propriétés détectées.

## 2. Mapping des propriétés Notion attendues

Le back office attend ces propriétés dans chaque base Notion (nommage libre → mapping affiché à l'écran une fois la base connectée) :

**Articles** : Titre (title), Slug (text), Statut (select: brouillon/publié), Catégorie (select), Auteur (text), Extrait (text), Contenu (rich text du corps de page), Image (files/url), Date publication (date), `lovable_id` (text — rempli auto par la sync).

**Vidéos** : Titre, Sous-titre, URL vidéo, Miniature, Format (select court/long), Catégorie, Statut, Date, `lovable_id`.

## 3. Sync bidirectionnelle (toutes les 15 min via pg_cron)

Route serveur `/api/public/hooks/notion-sync` (POST, protégée par `apikey` Supabase) déclenchée par `pg_cron`.

Logique par item, en utilisant `lovable_id` comme clé de liaison :

- **Notion → Site** : pour chaque page Notion modifiée depuis le dernier run (`last_edited_time > last_sync_at`) :
  - si `lovable_id` vide → créer l'article/vidéo côté site, écrire l'`id` retourné dans `lovable_id` sur Notion.
  - sinon → mettre à jour la ligne côté site.
- **Site → Notion** : pour chaque ligne dont `updated_at > last_sync_at` :
  - si pas de `notion_page_id` stocké → créer une page dans la bonne base.
  - sinon → patcher les propriétés.
- Résolution de conflit simple : le côté modifié le plus récemment gagne (comparaison `updated_at` vs `last_edited_time`).
- Un timestamp `last_sync_at` global stocké dans `notion_settings`.

## 4. Tableau de bord "Notion" dans le back office

Nouvelle page `/admin/notion` accessible depuis la sidebar (icône Notion) qui affiche :

- État de la connexion (connectée / non), bases liées, dernière sync (date/heure), prochain run.
- Compteurs : articles synchronisés / vidéos synchronisées / éléments en conflit / erreurs des dernières 24 h.
- Journal des 20 dernières synchros (succès, items créés / mis à jour, erreurs cliquables pour détail).
- Bouton **"Synchroniser maintenant"** qui appelle la même route immédiatement.
- Bouton **Pause / Reprise** de la sync automatique (toggle dans `notion_settings`).

## 5. Détails techniques

- Nouvelles tables : `notion_settings` (bases IDs, mapping, last_sync_at, enabled), `notion_sync_log` (timestamp, direction, entity, action, ok, error).
- Ajout colonnes `notion_page_id text` sur `articles` et `videos` (index unique nullable).
- Server functions (`createServerFn` + `requireSupabaseAuth`) pour : lire réglages, sauver réglages, lister logs, lancer sync manuelle.
- Route publique `/api/public/hooks/notion-sync` : exécute la sync (utilise `supabaseAdmin` en interne, appelle Notion via le gateway Lovable — pas d'appel direct à `api.notion.com`).
- `pg_cron` : job `notion-sync-15min` toutes les 15 min qui POST la route avec `apikey` anon.
- Conversion contenu Notion ↔ HTML de l'éditeur : conversion basique (paragraphes, titres, gras/italique/souligné, listes, liens, images). Les blocs Notion non supportés sont ignorés avec un avertissement dans le log.

## Ce que tu devras faire côté Notion

1. Lancer la connexion Notion depuis Lovable (je te la déclenche).
2. Dans Notion : partager tes 2 bases avec l'intégration "Lovable".
3. Copier les IDs des 2 bases dans `/admin/notion`.
