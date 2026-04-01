"use client";

import { useEffect, useRef } from "react";

type Props = {
  html: string;
};

export function PortfolioDetailHtmlClient({ html }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>(
        "h2, h3, h4, p, ul, ol, li, figure, blockquote, .portfolio-block-row, .portfolio-block-cell, .portfolio-block-media"
      )
    ).filter((el) => !el.hasAttribute("data-reveal"));

    let delayIndex = 0;
    for (const el of targets) {
      el.setAttribute("data-reveal", el.tagName === "FIGURE" ? "scale" : "");
      el.setAttribute("data-delay", String((delayIndex % 5) + 1));
      delayIndex += 1;
    }

    window.dispatchEvent(new Event("sby:reveal-scan"));
  }, [html]);

  return <div className="portfolio-detail-html" dangerouslySetInnerHTML={{ __html: html }} ref={rootRef} />;
}
