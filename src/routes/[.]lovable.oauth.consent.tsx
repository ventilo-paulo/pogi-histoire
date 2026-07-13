import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Local typed wrapper for the beta auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; client_id?: string; redirect_uris?: string[] } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };
const oauth = () =>
  (supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails(id: string): Promise<OAuthResult>;
      approveAuthorization(id: string): Promise<OAuthResult>;
      denyAuthorization(id: string): Promise<OAuthResult>;
    };
  }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen bg-pogi-darker flex items-center justify-center px-4">
      <div className="max-w-md text-white/80 text-center">
        <h1 className="font-display text-2xl text-white uppercase mb-2">Autorisation impossible</h1>
        <p className="text-sm">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Aucune redirection retournée par le serveur d'autorisation.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "cette application";

  return (
    <main className="min-h-screen bg-pogi-darker flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-black/40 border border-white/10 rounded-2xl p-8 text-white">
        <h1 className="font-display text-2xl uppercase mb-2">Connecter {clientName} à POGI</h1>
        <p className="text-white/70 text-sm mb-6">
          {clientName} pourra utiliser les outils POGI activés en votre nom, tant que vous êtes connecté.
        </p>
        <p className="text-white/50 text-xs mb-6">
          Cela ne contourne pas les autorisations ou les règles de sécurité de POGI.
        </p>
        {error && (
          <p role="alert" className="text-red-400 text-sm mb-4">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 bg-pogi-yellow text-pogi-dark font-bold uppercase tracking-wider py-2.5 rounded-md hover:bg-pogi-yellow/90 disabled:opacity-50"
          >
            Autoriser
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 border border-white/20 text-white/80 font-bold uppercase tracking-wider py-2.5 rounded-md hover:bg-white/5 disabled:opacity-50"
          >
            Refuser
          </button>
        </div>
      </div>
    </main>
  );
}
