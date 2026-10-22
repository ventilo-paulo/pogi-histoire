<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules

- AI features call Lovable AI Gateway (OpenAI Responses via the AI SDK) only from `*.server.ts` modules, loaded inside admin-checked server functions; the run-id helper lives in `src/lib/ai/run-id.ts`. Why: keeps the key and prompts server-side.
- Google Search Console data is copied into snapshot tables (`seo_query_ranks`, `seo_search_daily`, `seo_search_pages`) by the daily SEO check or the admin "Actualiser" button; admin pages read only those tables. Why: no live Google call on page views and no quota issues.
- Extra `google-site-verification` tags go as raw `<meta>` in `RootShell` (`src/routes/__root.tsx`), not in `head()`. Why: TanStack de-duplicates head meta by name, so only one would survive.
- Search indicators and audience aggregations are pure functions (`src/lib/search-performance.ts`, `src/lib/editorial-stats.ts`) covered by tests in `tests/`. Why: the numbers shown to the team must stay testable without Google or the database.
