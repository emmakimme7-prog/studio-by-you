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

    const applyOverflowFix = () => {
      root.style.removeProperty("overflow");
      root.style.setProperty("overflow-x", "visible", "important");
      root.style.setProperty("overflow-y", "visible", "important");
      root.style.setProperty("height", "auto", "important");
      root.style.setProperty("max-height", "none", "important");
    };

    root.style.visibility = "hidden";
    applyOverflowFix();

    const getInitialTransform = (kind: string | null) => {
      if (kind === "media") {
        return "translateY(32px)";
      }
      return "translateY(52px)";
    };

    const allCandidates = Array.from(
      root.querySelectorAll<HTMLElement>(
        "h2, h3, h4, p, ul, ol, li, figure, img, blockquote, .portfolio-block-row, .portfolio-block-cell, .portfolio-block-media"
      )
    );

    const targets = allCandidates.filter((el) => !el.hasAttribute("data-reveal"));

    let delayIndex = 0;
    for (const el of targets) {
      const tag = el.tagName.toLowerCase();
      const isMedia = tag === "img" || tag === "figure" || el.querySelector("img") !== null;
      const kind = isMedia ? "media" : "";

      el.setAttribute("data-reveal", kind);
      el.setAttribute("data-delay", String((delayIndex % 5) + 1));

      if (!el.getAttribute("data-visible")) {
        el.style.opacity = "0";
        el.style.transform = getInitialTransform(kind || null);
      }

      delayIndex += 1;
    }

    for (const el of allCandidates) {
      if (!el.hasAttribute("data-reveal")) {
        continue;
      }
      if (el.getAttribute("data-visible") === "true") {
        continue;
      }
      const kind = el.getAttribute("data-reveal");
      el.style.opacity = "0";
      el.style.transform = getInitialTransform(kind);
    }

    root.style.visibility = "";
    requestAnimationFrame(() => {
      applyOverflowFix();
      window.dispatchEvent(new Event("sby:reveal-scan"));
    });

    const timer = window.setTimeout(() => {
      applyOverflowFix();
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
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
