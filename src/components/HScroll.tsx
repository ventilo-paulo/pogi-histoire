import { useEffect, useRef, useState, type ReactNode } from "react";

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

  // Step = width of one card + gap, snapped to the next card boundary
  const stepScroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const styles = getComputedStyle(el);
    const gap = parseFloat(styles.columnGap || styles.gap || "16") || 16;
    const cardW = first ? first.getBoundingClientRect().width + gap : Math.max(200, el.clientWidth * 0.6);
    // Snap target to nearest card boundary so motion stays aligned
    const current = el.scrollLeft;
    const next = dir === 1
      ? Math.floor(current / cardW + 1) * cardW
      : Math.ceil(current / cardW - 1) * cardW;
    el.scrollTo({ left: next, behavior: "smooth" });
  };

  const chevronColor = dark ? "text-white" : "text-pogi-dark";
  const fadeColor = dark ? "rgb(26,26,26)" : "rgb(242,242,242)";

  return (
    <div className="relative group">
      <div ref={ref} className="h-scroll">
        {children}
      </div>

      {/* Edge fades */}
      <div
        aria-hidden
        className={`pointer-events-none absolute right-0 top-0 bottom-2 w-16 transition-opacity duration-200 ${canRight ? "opacity-100" : "opacity-0"}`}
        style={{ background: `linear-gradient(to left, ${fadeColor}, transparent)` }}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 bottom-2 w-12 transition-opacity duration-200 ${canLeft ? "opacity-100" : "opacity-0"}`}
        style={{ background: `linear-gradient(to right, ${fadeColor}, transparent)` }}
      />

      {/* Left chevron — clickable, advances by one card */}
      <button
        type="button"
        onClick={() => stepScroll(-1)}
        aria-label="Précédent"
        tabIndex={canLeft ? 0 : -1}
        className={`absolute left-1 top-1/2 -translate-y-1/2 z-10 p-2 transition-opacity duration-300 ${chevronColor} ${canLeft ? "opacity-0 group-hover:opacity-70 hover:!opacity-100 cursor-pointer" : "opacity-0 pointer-events-none"}`}
      >
        <span className="text-4xl font-light leading-none select-none">‹</span>
      </button>

      {/* Right chevron — clickable, advances by one card */}
      <button
        type="button"
        onClick={() => stepScroll(1)}
        aria-label="Suivant"
        tabIndex={canRight ? 0 : -1}
        className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 p-2 transition-opacity duration-300 ${chevronColor} ${canRight ? "opacity-0 group-hover:opacity-70 hover:!opacity-100 cursor-pointer" : "opacity-0 pointer-events-none"}`}
      >
        <span className="text-4xl font-light leading-none select-none">›</span>
      </button>
    </div>
  );
}
