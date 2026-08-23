import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { NotFound as NotFoundComponent } from "@/components/NotFound";


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "google-site-verification",
        content: "xw8vmqswLrApsyD7fSPSslfAEWjEL2aHBIQBRWyYqu4",
      },
      { title: "POGI Histoire — Récits d'histoire documentés" },
      { name: "description", content: "POGI Histoire, média indépendant : des récits d'histoire documentés, sourcés et vérifiés, en articles et en vidéo." },
      { property: "og:title", content: "POGI Histoire — Récits d'histoire documentés" },
      { property: "og:description", content: "POGI Histoire, média indépendant : des récits d'histoire documentés, sourcés et vérifiés, en articles et en vidéo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "POGI Histoire — Récits d'histoire documentés" },
      { name: "twitter:description", content: "POGI Histoire, média indépendant : des récits d'histoire documentés, sourcés et vérifiés, en articles et en vidéo." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/1rGdQKYDEjVNWYNMP9uQjFYlP4p1/social-images/social-1783127523863-POGI.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/1rGdQKYDEjVNWYNMP9uQjFYlP4p1/social-images/social-1783127523863-POGI.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/inter-latin.woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/bebas-neue-400-latin.woff2",
        crossOrigin: "anonymous",
      },
      { rel: "preconnect", href: "https://wjexjgjyfglvrpktbpvz.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://wjexjgjyfglvrpktbpvz.supabase.co" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://pogi-histoire.com/#organization",
              name: "POGI Histoire",
              url: "https://pogi-histoire.com",
              logo: "https://pogi-histoire.com/assets/pogi-logo.webp",
              description:
                "Média indépendant consacré à l'histoire, porté par Guillaume Guest et Paul Lesaulnier.",
              sameAs: ["https://www.youtube.com/@PogiHistoire"],
            },
            {
              "@type": "WebSite",
              "@id": "https://pogi-histoire.com/#website",
              name: "POGI Histoire",
              url: "https://pogi-histoire.com",
              inLanguage: "fr-FR",
              publisher: { "@id": "https://pogi-histoire.com/#organization" },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { location } = useRouterState();

  return (
    <QueryClientProvider client={queryClient}>
      {/* key on pathname triggers a soft fade between pages */}
      <div key={location.pathname} className="page-enter">
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}

