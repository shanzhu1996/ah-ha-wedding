"use client";

import { Children, useRef, useState, type ReactNode } from "react";

export function PreviewCarousel({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const count = Children.count(children);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = (el.scrollWidth - el.clientWidth) / Math.max(count - 1, 1);
    setActive(Math.round(el.scrollLeft / Math.max(step, 1)));
  };

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (!child) return;
    const containerRect = el.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    const relativeLeft = childRect.left - containerRect.left + el.scrollLeft;
    const target = relativeLeft - 16;

    el.scrollTo({ left: target, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex md:grid md:grid-cols-3 gap-4 md:gap-10 md:max-w-5xl -mx-4 md:mx-auto overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-pl-4 md:scroll-pl-0 pl-4 pr-[18vw] md:px-0 pb-4 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className="flex justify-center gap-2 mt-4 md:hidden">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              active === i ? "w-6 bg-primary" : "w-1.5 bg-primary/25"
            }`}
          />
        ))}
      </div>
    </>
  );
}
