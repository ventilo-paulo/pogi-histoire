import {
  Facebook, Instagram, Twitter, Youtube, Linkedin, Send, MessageCircle, Music2
} from "lucide-react";

const row1 = [
  { icon: Facebook, label: "Facebook" },
  { icon: Instagram, label: "Instagram" },
  { icon: Twitter, label: "X" },
  { icon: Music2, label: "TikTok" },
];
const row2 = [
  { icon: Youtube, label: "YouTube" },
  { icon: Send, label: "Telegram" },
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: Linkedin, label: "LinkedIn" },
];

function IconBtn({ Icon, label }: { Icon: typeof Facebook; label: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-xl border border-white/70 text-white hover:bg-white hover:text-pogi-darker transition-colors"
    >
      <Icon size={20} />
    </a>
  );
}

export function Footer() {
  return (
    <footer className="bg-pogi-darker py-14">
      <div className="mx-auto max-w-md flex flex-col items-center gap-4 px-6">
        <div className="flex gap-4">
          {row1.map(({ icon, label }) => <IconBtn key={label} Icon={icon} label={label} />)}
        </div>
        <div className="flex gap-4">
          {row2.map(({ icon, label }) => <IconBtn key={label} Icon={icon} label={label} />)}
        </div>
        <p className="mt-6 text-xs text-white/40">© {new Date().getFullYear()} POGI Histoire</p>
      </div>
    </footer>
  );
}
