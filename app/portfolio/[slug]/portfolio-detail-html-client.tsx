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

    const getInitialTransform = (kind: string | null) => {
      if (kind === "text") {
        return "translateY(28px)";
      }
      if (kind === "media") {
        return "translateY(32px) scale(0.97)";
      }
      return "translateY(52px)";
    };

    const targets: HTMLElement[] = [];

    const registerTarget = (element: Element | null, kind: "text" | "media" | "") => {
      if (!(element instanceof HTMLElement) || element.hasAttribute("data-reveal")) {
        return;
      }

      targets.push(element);
      element.setAttribute("data-reveal", kind);
    };

    for (const child of Array.from(root.children)) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }

      if (child.classList.contains("pbe-row")) {
        registerTarget(child, "");

        for (const cell of Array.from(child.children)) {
          if (!(cell instanceof HTMLElement)) {
            continue;
          }

          const media = cell.querySelector(".portfolio-block-media, figure, img, video, .portfolio-editor-divider");
          if (media) {
            registerTarget(media, "media");
            continue;
          }

          registerTarget(cell.firstElementChild ?? cell, "text");
        }

        continue;
      }

      const media = child.querySelector?.(".portfolio-block-media, figure, img, video");
      if (media) {
        registerTarget(media, "media");
        continue;
      }

      registerTarget(child, "text");
    }

    let delayIndex = 0;
    for (const el of targets) {
      const kind = el.getAttribute("data-reveal") || "";

      el.setAttribute("data-delay", String((delayIndex % 5) + 1));

      if (!el.getAttribute("data-visible")) {
        el.style.opacity = "0";
        el.style.transform = getInitialTransform(kind || null);
      }

      delayIndex += 1;
    }

    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("video"));
    const cleanupFns: Array<() => void> = [];

    for (const video of videos) {
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.defaultMuted = true;
      video.setAttribute("autoplay", "");
      video.setAttribute("muted", "");
      video.setAttribute("loop", "");
      video.setAttribute("playsinline", "");

      const tryPlay = () => {
        const result = video.play();
        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
      };

      tryPlay();
      video.addEventListener("loadedmetadata", tryPlay);
      cleanupFns.push(() => video.removeEventListener("loadedmetadata", tryPlay));
    }

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("sby:reveal-scan"));
    });

    return () => {
      for (const cleanup of cleanupFns) {
        cleanup();
      }
    };
  }, [html]);

  return <div className="portfolio-detail-html" dangerouslySetInnerHTML={{ __html: html }} ref={rootRef} />;
}
