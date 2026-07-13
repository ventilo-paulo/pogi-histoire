## Plan de correction

Corriger uniquement le bug Realtime de `/articles`, sans modifier l’identité visuelle ni les fonctionnalités de la page.

### Cause identifiée

Dans `src/routes/articles.tsx`, `useCategories()` est utilisé par plusieurs composants de la même page (`ArticlesFilterBar` et `ArticlesByCategory`). Chaque montage recrée un channel Realtime nommé `cats-live`, puis tente d’ajouter un listener `.on()` alors qu’un channel du même nom peut déjà être abonné. C’est ce qui déclenche :

```text
cannot add postgres_changes callbacks for realtime:cats-live after subscribe()
```

Le même risque existe pour `articles-live` si plusieurs composants s’abonnent en même temps.

### Correction prévue

1. Créer un module partagé `src/lib/realtime-stores.ts` avec deux stores singletons :
   - un store pour `categories` / channel `cats-live`
   - un store pour `articles` / channel `articles-live`

2. Dans chaque store :
   - créer le channel une seule fois ;
   - attacher tous les listeners `.on()` avant `.subscribe()` ;
   - charger les données au premier abonné ;
   - notifier tous les composants abonnés quand les données changent ;
   - nettoyer avec `supabase.removeChannel(channel)` quand le dernier abonné se démonte ;
   - éviter les doubles abonnements en React StrictMode et lors de la navigation.

3. Modifier uniquement `src/routes/articles.tsx` :
   - remplacer les hooks actuels `useCategories()` et `usePublishedArticles()` par des hooks basés sur `useSyncExternalStore` ;
   - supprimer les créations directes de channels Realtime dans ce fichier ;
   - conserver le rendu, les filtres, les cartes, les titres et les styles existants.

### Vérification prévue

- Ouvrir `/articles` et confirmer que la page charge sans “This page didn’t load”.
- Vérifier l’absence de l’erreur console `cannot add postgres_changes callbacks...`.
- Vérifier que les catégories, les titres et les cartes d’articles s’affichent toujours.
- Tester une navigation `/` → `/articles` → `/` → `/articles` pour confirmer qu’il n’y a pas de double abonnement.