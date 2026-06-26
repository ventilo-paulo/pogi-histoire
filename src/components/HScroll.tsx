import { useRef, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function HScroll({ children, dark = true }: { children: ReactNode; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = () => {
    ref.current?.scrollBy({ left: 400, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div ref={ref} className="h-scroll pr-12">
        {children}
      </div>
      <button
        onClick={scroll}
        aria-label="Faire défiler"
        className={`absolute right-0 top-1/2 -translate-y-1/2 hidden md:grid h-12 w-12 place-items-center rounded-full backdrop-blur-md transition-transform hover:scale-110 ${
          dark ? "bg-white/10 text-white hover:bg-pogi-yellow hover:text-pogi-dark" : "bg-black/10 text-pogi-dark hover:bg-pogi-yellow"
        }`}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
