import {
  Youtube
} from "lucide-react";

const socials = [
  { Icon: Youtube, label: "YouTube", href: "https://www.youtube.com/@PogiHistoire" },
];

export function Footer() {
  return (
    <footer className="bg-pogi-darker py-14">
      <div className="mx-auto max-w-md flex flex-col items-center gap-4 px-6">
        <div className="flex gap-4">
          {socials.map(({ Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/70 text-white hover:bg-white hover:text-pogi-darker transition-colors"
            >
              <Icon size={20} />
            </a>
          ))}
        </div>
        <p className="mt-6 text-xs text-white/40">© {new Date().getFullYear()} POGI Histoire</p>
      </div>
    </footer>
  );
}
