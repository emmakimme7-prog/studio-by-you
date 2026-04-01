"use client";

import { useLayoutEffect, useRef } from "react";

type Props = {
  html: string;
};

export function PortfolioDetailHtmlClient({ html }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    root.style.visibility = "hidden";

    const getInitialTransform = (kind: string | null) => {
      if (kind === "scale") {
        return "translateY(32px) scale(0.93)";
      }
      return "translateY(52px)";
    };

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>(
        "h2, h3, h4, p, ul, ol, li, figure, blockquote, .portfolio-block-row, .portfolio-block-cell, .portfolio-block-media"
      )
    ).filter((el) => !el.hasAttribute("data-reveal"));

    let delayIndex = 0;
    for (const el of targets) {
      const tag = el.tagName.toLowerCase();
      const isMedia = tag === "img" || tag === "figure" || el.querySelector("img") !== null;
      const kind = isMedia ? "scale" : "";

      el.setAttribute("data-reveal", kind);
      el.setAttribute("data-delay", String((delayIndex % 5) + 1));

      if (!el.getAttribute("data-visible")) {
        el.style.opacity = "0";
        el.style.transform = getInitialTransform(kind || null);
      }

      delayIndex += 1;
    }

    window.dispatchEvent(new Event("sby:reveal-scan"));
    root.style.visibility = "";
  }, [html]);

  return (
    <div
      className="portfolio-detail-html"
      dangerouslySetInnerHTML={{ __html: html }}
      ref={rootRef}
      style={{ visibility: "hidden" }}
    />
  );
}
