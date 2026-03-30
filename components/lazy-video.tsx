"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

type LazyVideoProps = {
  src: string;
  className?: string;
  style?: CSSProperties;
};

export function LazyVideo({ src, className, style }: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [activeSrc, setActiveSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActiveSrc(src);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      autoPlay
      className={className}
      loop
      muted
      playsInline
      preload="none"
      src={activeSrc ?? undefined}
      style={style}
    />
  );
}
