"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { ChatWidgetSettings } from "@/lib/site-content";

type SiteChatWidgetProps = {
  config: ChatWidgetSettings;
  privacyPolicy: string;
};

export function SiteChatWidget({ config, privacyPolicy: _privacyPolicy }: SiteChatWidgetProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [intent, setIntent] = useState("");
  const widgetUrl = useMemo(() => {
    const workspace = "studio-by-you";
    const source =
      typeof window === "undefined"
        ? "www.studiobyyou.kr"
        : `${window.location.host}${window.location.pathname}${window.location.search}`;
    const widgetOrigin =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3102"
        : "https://chathub.studiobyyou.kr";
    const url = new URL("/customer", widgetOrigin);
    url.searchParams.set("workspace", workspace);
    url.searchParams.set("embed", "1");
    url.searchParams.set("source", source);
    if (intent) {
      url.searchParams.set("intent", intent);
    }
    return url.toString();
  }, [intent]);

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

  if (pathname?.startsWith("/studiobyyou") || pathname?.startsWith("/portfolio/studio")) {
    return null;
  }

  return (
    <div className="site-chat-widget-root">
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
}
