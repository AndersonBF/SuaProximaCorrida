"use client";

import { useEffect, useRef } from "react";

/**
 * Brilho suave (accent) que acompanha o cursor. A transição em `transform`
 * com duração faz o brilho "perseguir" o mouse de leve (trailing), sem peso.
 * É puramente decorativo: fixo, atrás do conteúdo e sem capturar cliques.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // respeita quem prefere menos animação
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const SIZE = 520;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = `translate3d(${e.clientX - SIZE / 2}px, ${
          e.clientY - SIZE / 2
        }px, 0)`;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 h-[520px] w-[520px] rounded-full opacity-0 blur-[150px] transition-[opacity,transform] duration-500 ease-out"
      style={{
        background:
          "radial-gradient(circle, rgba(249,115,22,0.16), rgba(249,115,22,0.05) 45%, transparent 70%)",
      }}
    />
  );
}
