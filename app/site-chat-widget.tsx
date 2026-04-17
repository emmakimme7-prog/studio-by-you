"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type { ChatWidgetSettings } from "@/lib/site-content";

type SiteChatWidgetProps = {
  config: ChatWidgetSettings;
  privacyPolicy: string;
};

export function SiteChatWidget({ config, privacyPolicy: _privacyPolicy }: SiteChatWidgetProps) {
  const widgetVersion = "20260406-01";
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [intent, setIntent] = useState("");
  const [footerElement, setFooterElement] = useState<HTMLElement | null>(null);
  const [anchorToFooter, setAnchorToFooter] = useState(false);

  const widgetUrl = useMemo(() => {
    const currentUrl =
      typeof window === "undefined"
        ? ""
        : `${window.location.host}${window.location.pathname}${window.location.search}`.toLowerCase();
    const workspaceAliases: Array<{ slug: string; match: string[] }> = [
      { slug: "sejulachim", match: ["sejulachim", "세줄아침", "sejulachim-temp"] },
      { slug: "studio-by-you", match: ["studio-by-you", "studiobyyou"] }
    ];
    const workspace =
      workspaceAliases.find((entry) => entry.match.some((keyword) => currentUrl.includes(keyword)))?.slug ??
      "studio-by-you";
    const source =
      typeof window === "undefined"
        ? "www.studiobyyou.kr"
        : `${window.location.host}${window.location.pathname}${window.location.search}`;
    const widgetOrigin = process.env.NEXT_PUBLIC_CHATHUB_ORIGIN || "https://chathub.studiobyyou.kr";
    const url = new URL("/customer", widgetOrigin);
    url.searchParams.set("workspace", workspace);
    url.searchParams.set("embed", "1");
    url.searchParams.set("source", source);
    url.searchParams.set("v", widgetVersion);
    if (intent) {
      url.searchParams.set("intent", intent);
    }
    return url.toString();
  }, [intent, widgetVersion]);

  useEffect(() => {
    function handleOpenChat(event: Event) {
      const customEvent = event as CustomEvent<{ intent?: string }>;
      const nextIntent = customEvent.detail?.intent?.trim();
      setIsOpen(true);
      if (nextIntent) {
        setIntent(nextIntent);
      }
    }

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "chathub-close-widget") {
        setIsOpen(false);
      }
    }

    window.addEventListener("studio-by-you:open-chat", handleOpenChat);
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("studio-by-you:open-chat", handleOpenChat);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const footer = document.querySelector(".site-footer");
    if (!(footer instanceof HTMLElement)) return;
    setFooterElement(footer);

    const updateAnchorState = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const footerRect = footer.getBoundingClientRect();
      const widgetOffset = window.innerWidth <= 640 ? 88 : 104;
      const shouldAnchor = footerRect.top <= viewportHeight - widgetOffset;
      setAnchorToFooter(shouldAnchor);
    };

    updateAnchorState();
    window.addEventListener("scroll", updateAnchorState, { passive: true });
    window.addEventListener("resize", updateAnchorState);
    window.visualViewport?.addEventListener("resize", updateAnchorState);

    return () => {
      window.removeEventListener("scroll", updateAnchorState);
      window.removeEventListener("resize", updateAnchorState);
      window.visualViewport?.removeEventListener("resize", updateAnchorState);
    };
  }, []);

  if (pathname?.startsWith("/studiobyyou") || pathname?.startsWith("/portfolio/studio")) {
    return null;
  }

  const widget = (
    <div className={`site-chat-widget-root${anchorToFooter ? " is-anchored-to-footer" : ""}`}>
      {isOpen ? (
        <div className="site-chat-panel is-open" role="dialog" aria-label="빠른 상담 위젯">
          <iframe
            id="studio-by-you-chat-frame"
            src={widgetUrl}
            title={config.panelTitle || "Studio by You Chat"}
            style={{ width: "100%", height: "100%", border: 0, display: "block", background: "transparent" }}
          />
        </div>
      ) : null}

      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "상담 위젯 닫기" : "상담 위젯 열기"}
        className={`site-chat-launcher${isOpen ? " is-open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="site-chat-launcher-icon">
          <img alt="" aria-hidden="true" className="site-chat-launcher-logo" src="/home-assets/chahupsymbol.png" />
        </span>
      </button>
    </div>
  );

  if (anchorToFooter && footerElement) {
    return createPortal(widget, footerElement);
  }

  return widget;
}
