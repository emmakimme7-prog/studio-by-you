"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    ChannelIO?: ((...args: unknown[]) => void) & {
      q?: unknown[];
      c?: (args: unknown[]) => void;
    };
    ChannelIOInitialized?: boolean;
  }
}

const pluginKey = "8abc20e4-ef46-4af3-9bba-c758b581b8b3";

function bootChannelTalk() {
  if (!window.ChannelIO) {
    return;
  }

  window.ChannelIO("boot", {
    pluginKey,
  });
}

export function ChannelTalk() {
  const pathname = usePathname();

  useEffect(() => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const isSharedHost = hostname.startsWith("studiobyyou-");
    const isSharedPath = pathname?.startsWith("/studiobyyou");

    if (isSharedHost || isSharedPath) {
      if (window.ChannelIO) {
        window.ChannelIO("shutdown");
      }
      return;
    }

    if (!window.ChannelIO) {
      const channel: NonNullable<Window["ChannelIO"]> = (...args: unknown[]) => {
        channel.q?.push(args);
      };

      channel.q = [] as unknown[];
      channel.c = (args: unknown[]) => {
        channel.q?.push(args);
      };

      window.ChannelIO = channel;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://cdn.channel.io/plugin/ch-plugin-web.js"]',
    );

    if (existingScript) {
      bootChannelTalk();
      return;
    }

    if (window.ChannelIOInitialized) {
      bootChannelTalk();
      return;
    }

    window.ChannelIOInitialized = true;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://cdn.channel.io/plugin/ch-plugin-web.js";
    script.onload = () => {
      bootChannelTalk();
    };

    document.head.appendChild(script);

    return () => {
      if (window.ChannelIO) {
        window.ChannelIO("shutdown");
      }
    };
  }, [pathname]);

  return null;
}
