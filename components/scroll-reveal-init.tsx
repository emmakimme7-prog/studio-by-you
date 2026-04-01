"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollRevealInit() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add("force-motion");

    (window as any).__sbyHoverInit = true;
    (window as any).__sbyHoverMoves = 0;

    let lastPlanItem: HTMLElement | null = null;
    let lastPortfolioCard: HTMLElement | null = null;

    const clearHovered = () => {
      if (lastPlanItem) {
        delete lastPlanItem.dataset.hovered;
        lastPlanItem = null;
      }
      if (lastPortfolioCard) {
        delete lastPortfolioCard.dataset.hovered;
        lastPortfolioCard = null;
      }
    };

    const updateHovered = (event: Event) => {
      (window as any).__sbyHoverMoves = ((window as any).__sbyHoverMoves ?? 0) + 1;
      const target = event.target as HTMLElement | null;
      if (!target) {
        clearHovered();
        return;
      }

      const nextPlanItem = target.closest(".contact-plan-item") as HTMLElement | null;
      if (nextPlanItem !== lastPlanItem) {
        if (lastPlanItem) {
          delete lastPlanItem.dataset.hovered;
        }
        if (nextPlanItem) {
          nextPlanItem.dataset.hovered = "true";
        }
        lastPlanItem = nextPlanItem;
      }

      const nextPortfolioCard = target.closest(".portfolio-page-card") as HTMLElement | null;
      if (nextPortfolioCard !== lastPortfolioCard) {
        if (lastPortfolioCard) {
          delete lastPortfolioCard.dataset.hovered;
        }
        if (nextPortfolioCard) {
          nextPortfolioCard.dataset.hovered = "true";
        }
        lastPortfolioCard = nextPortfolioCard;
      }
    };

    const observed = new WeakSet<Element>();
    const animated = new WeakSet<Element>();

    const getInitialTransform = (el: Element) => {
      const kind = el.getAttribute("data-reveal");
      if (kind === "scale") {
        return "translateY(32px) scale(0.93)";
      }
      return "translateY(52px)";
    };

    const getDelayMs = (el: Element) => {
      const raw = el.getAttribute("data-delay");
      if (!raw) return 0;
      const n = Number(raw);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, n) * 90;
    };

    const resetVisible = () => {
      const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
      for (const el of els) {
        el.removeAttribute("data-visible");
        el.style.opacity = "0";
        el.style.transform = getInitialTransform(el);
      }
    };

    const animateOnLoad = () => {
      const els = document.querySelectorAll<HTMLElement>(".reveal-on-load");
      for (const el of els) {
        if ((el as any).__sbyLoadAnimated) {
          continue;
        }
        (el as any).__sbyLoadAnimated = true;

        const rawDelay = el.style.animationDelay;
        const delayMs = rawDelay ? Math.round(parseFloat(rawDelay) * 1000) : 150;

        el.style.opacity = "0";
        el.style.transform = "translateY(36px)";

        const animation = el.animate(
          [
            { opacity: 0, transform: "translateY(36px)" },
            { opacity: 1, transform: "none" }
          ],
          {
            duration: 1000,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            delay: delayMs,
            fill: "both"
          }
        );

        animation.onfinish = () => {
          el.style.opacity = "";
          el.style.transform = "";
        };
      }
    };

    const reveal = (target: Element) => {
      if (animated.has(target)) {
        target.setAttribute("data-visible", "true");
        return;
      }

      animated.add(target);
      const el = target as HTMLElement;
      const fromTransform = getInitialTransform(el);
      const delay = getDelayMs(el);

      el.style.opacity = "0";
      el.style.transform = fromTransform;

      const animation = el.animate(
        [
          { opacity: 0, transform: fromTransform },
          { opacity: 1, transform: "none" }
        ],
        {
          duration: 780,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          delay,
          fill: "both"
        }
      );

      animation.onfinish = () => {
        el.setAttribute("data-visible", "true");
        el.style.opacity = "";
        el.style.transform = "";
      };
    };

    const isInViewport = (el: Element) => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const viewportHeight = window.innerHeight || 0;
      return rect.top < viewportHeight * 0.9 && rect.bottom > 0;
    };

    const revealAll = () => {
      const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
      for (const el of els) {
        el.setAttribute("data-visible", "true");
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target;
            observer.unobserve(target);
            reveal(target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    );

    const observeAll = () => {
      const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
      for (const el of els) {
        if (el.getAttribute("data-visible") === "true") {
          continue;
        }
        if (observed.has(el)) {
          continue;
        }
        observed.add(el);

        if (isInViewport(el)) {
          reveal(el);
          continue;
        }

        observer.observe(el);
      }
    };

    const onRevealScan = () => {
      observeAll();
    };

    animateOnLoad();

    window.addEventListener("pointermove", updateHovered, { passive: true });
    window.addEventListener("mousemove", updateHovered, { passive: true });
    window.addEventListener("blur", clearHovered);
    window.addEventListener("sby:reveal-scan", onRevealScan);
    resetVisible();
    requestAnimationFrame(() => {
      observeAll();
    });

    const fallbackTimer = window.setTimeout(() => {
      const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
      const alreadyVisible = Array.from(els).some((el) => el.getAttribute("data-visible") === "true");
      if (alreadyVisible) {
        return;
      }
      for (const el of els) {
        if (el.getAttribute("data-visible") === "true") {
          continue;
        }
        reveal(el);
      }
    }, 1400);

    const onResize = () => {
      observeAll();
    };

    const onPageShow = () => {
      observeAll();
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("pageshow", onPageShow);

    const mutationObserver = new MutationObserver(() => {
      observeAll();
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("pointermove", updateHovered);
      window.removeEventListener("mousemove", updateHovered);
      window.removeEventListener("blur", clearHovered);
      window.removeEventListener("sby:reveal-scan", onRevealScan);
      clearHovered();
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", onPageShow);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
