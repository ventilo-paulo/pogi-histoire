import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HScroll({ children, dark = true }: { children: ReactNode; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const btnBase =
    "absolute top-1/2 -translate-y-1/2 hidden md:grid h-12 w-12 place-items-center rounded-full backdrop-blur-md transition-all duration-200 z-10";
  const enabled = dark
    ? "bg-white/15 text-white hover:bg-pogi-yellow hover:text-pogi-dark hover:scale-110 cursor-pointer opacity-100"
    : "bg-black/15 text-pogi-dark hover:bg-pogi-yellow hover:scale-110 cursor-pointer opacity-100";
  const disabled = "opacity-0 pointer-events-none scale-90";

  // Edge fade indicators
  const fadeColor = dark ? "rgb(26,26,26)" : "rgb(242,242,242)";

  return (
    <div className="relative group">
      <div ref={ref} className="h-scroll">
        {children}
      </div>

      {/* Right fade indicator */}
      <div
        aria-hidden
        className={`pointer-events-none absolute right-0 top-0 bottom-2 w-16 transition-opacity duration-200 ${canRight ? "opacity-100" : "opacity-0"}`}
        style={{ background: `linear-gradient(to left, ${fadeColor}, transparent)` }}
      />
      {/* Left fade indicator */}
      <div
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 bottom-2 w-16 transition-opacity duration-200 ${canLeft ? "opacity-100" : "opacity-0"}`}
        style={{ background: `linear-gradient(to right, ${fadeColor}, transparent)` }}
      />

      <button
        onClick={() => scroll(-1)}
        aria-label="Précédent"
        className={`${btnBase} left-2 ${canLeft ? enabled : disabled}`}
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={() => scroll(1)}
        aria-label="Suivant"
        className={`${btnBase} right-2 ${canRight ? enabled : disabled}`}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
