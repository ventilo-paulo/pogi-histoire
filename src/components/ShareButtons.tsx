import { useState, type ReactNode } from "react";
import { Check, Copy, Link as LinkIcon, Mail, Share2 } from "lucide-react";
import { track } from "@/lib/analytics";
import {
  NETWORK_LABEL,
  buildTrackedUrl,
  shareIntentUrl,
  type ShareKind,
  type ShareNetwork,
} from "@/lib/share";

type Props = {
  title: string;
  /** Site path of the content, e.g. "/articles/mon-article". */
  path: string;
  slug: string;
  kind: ShareKind;
  /** Where the buttons are shown (for statistics). */
  placement: string;
  variant?: "light" | "dark";
  /** Show the tracked link in a field with a copy button. */
  showLinkField?: boolean;
};

const svg = (d: string) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);

const ICONS: Partial<Record<ShareNetwork, ReactNode>> = {
  whatsapp: svg(
    "M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a8.2 8.2 0 0 1-4.1-3.6c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.6.7.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4ZM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3Z",
  ),
  facebook: svg(
    "M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6H17V4.3c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v2.1H7v3.2h3v8h3.5Z",
  ),
  x: svg(
    "M18.244 2H21l-6.53 7.463L22 22h-6.828l-4.77-6.03L4.8 22H2l7.02-8.02L2 2h6.914l4.29 5.5L18.244 2Zm-2.393 18h1.79L8.24 4H6.34L15.85 20Z",
  ),
  linkedin: svg(
    "M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5ZM3 9.5h4V21H3V9.5Zm7 0h3.8v1.6h.1c.5-1 1.9-2 3.9-2 4.2 0 5 2.7 5 6.3V21H18v-5c0-1.2 0-2.8-1.7-2.8-1.8 0-2 1.4-2 2.7V21h-4V9.5Z",
  ),
  reddit: svg(
    "M22 12.1a2.2 2.2 0 0 0-3.7-1.6 10.7 10.7 0 0 0-5.7-1.8l1-4.6 3.2.7a1.6 1.6 0 1 0 .2-1l-3.6-.8a.5.5 0 0 0-.6.4l-1.1 5.3a10.8 10.8 0 0 0-5.8 1.8 2.2 2.2 0 1 0-2.4 3.6v.6c0 3.3 3.8 6 8.5 6s8.5-2.7 8.5-6v-.6a2.2 2.2 0 0 0 1.5-2Zm-14.6 1.6a1.6 1.6 0 1 1 1.6 1.6 1.6 1.6 0 0 1-1.6-1.6Zm9 4.2a5.8 5.8 0 0 1-4.4 1.3 5.8 5.8 0 0 1-4.4-1.3.4.4 0 0 1 .6-.6 5 5 0 0 0 3.8 1 5 5 0 0 0 3.8-1 .4.4 0 1 1 .6.6Zm-.3-2.6a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z",
  ),
  telegram: svg(
    "M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-7.9c.4-.3-.1-.5-.6-.2L6.6 13.4 1.9 12c-1-.3-1-1 .2-1.5l18.4-7.1c.9-.3 1.6.2 1.4.9Z",
  ),
  email: <Mail size={16} aria-hidden />,
};

const NETWORKS: ShareNetwork[] = ["whatsapp", "facebook", "x", "linkedin", "reddit", "telegram", "email"];

export function ShareButtons({ title, path, slug, kind, placement, variant = "light", showLinkField = false }: Props) {
  const [copied, setCopied] = useState(false);
  const copyUrl = buildTrackedUrl(path, "lien_copie", slug, kind);

  const btn =
    variant === "dark"
      ? "h-9 w-9 grid place-items-center rounded-full bg-white/10 text-white hover:bg-pogi-yellow hover:text-pogi-dark transition-colors"
      : "h-9 w-9 grid place-items-center rounded-full bg-black/5 text-pogi-dark hover:bg-pogi-yellow transition-colors";

  function log(network: ShareNetwork) {
    track("share_click", { label: NETWORK_LABEL[network], slug, meta: { network, kind, placement } });
  }

  async function copyLink() {
    log("lien_copie");
    try {
      await navigator.clipboard.writeText(copyUrl);
    } catch {
      // Fallback for browsers without clipboard access.
      const ta = document.createElement("textarea");
      ta.value = copyUrl;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* noop */
      }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    const url = buildTrackedUrl(path, "partage_mobile", slug, kind);
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      log("partage_mobile");
      try {
        await nav.share({ title, url });
      } catch {
        /* user cancelled */
      }
      return;
    }
    copyLink();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {NETWORKS.map((n) => {
          const href = shareIntentUrl(n, buildTrackedUrl(path, n, slug, kind), title);
          if (!href) return null;
          return (
            <a
              key={n}
              href={href}
              target={n === "email" ? undefined : "_blank"}
              rel="noopener noreferrer"
              aria-label={`Partager sur ${NETWORK_LABEL[n]}`}
              title={NETWORK_LABEL[n]}
              onClick={() => log(n)}
              className={btn}
            >
              {ICONS[n]}
            </a>
          );
        })}
        {!showLinkField && (
          <button type="button" onClick={copyLink} aria-label="Copier le lien" title="Copier le lien" className={btn}>
            {copied ? <Check size={16} /> : <LinkIcon size={16} />}
          </button>
        )}
        <button type="button" onClick={nativeShare} aria-label="Partager" title="Partager" className={`${btn} sm:hidden`}>
          <Share2 size={16} />
        </button>
      </div>

      {showLinkField && (
        <div
          className={`flex items-stretch rounded-lg overflow-hidden border max-w-full ${
            variant === "dark" ? "border-white/15 bg-white/5" : "border-black/10 bg-white"
          }`}
        >
          <input
            readOnly
            value={copyUrl}
            aria-label="Lien de partage"
            onFocus={(e) => e.currentTarget.select()}
            className={`min-w-0 flex-1 bg-transparent px-3 py-2 text-xs font-mono outline-none ${
              variant === "dark" ? "text-white/70" : "text-gray-600"
            }`}
          />
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 bg-pogi-yellow text-pogi-dark px-3 text-xs font-bold uppercase tracking-wider hover:bg-pogi-yellow/90 shrink-0"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      )}
    </div>
  );
}
