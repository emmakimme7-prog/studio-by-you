"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { SiteContent } from "@/lib/site-content";
import { DemoAdmin } from "./demo-admin";
import { StudioDemoFront } from "./studio-demo-front";
import type { StudioDemoFrontPage } from "./studio-demo-front";

export function StudioDemoShell({
  initialContent,
  initialFrontPage: _initialFrontPage,
}: {
  initialContent: SiteContent;
  initialFrontPage?: StudioDemoFrontPage;
}) {
  const [view, setView] = useState<"front" | "admin">("front");
  const [content, setContent] = useState(initialContent);
  const [hasLoadedDemoInquiries, setHasLoadedDemoInquiries] = useState(false);
  const isDynamicLogo = content.brand.logo.startsWith("data:");

  useEffect(() => {
    setContent(initialContent);
    setHasLoadedDemoInquiries(false);
  }, [initialContent]);

  async function handleViewChange(newView: "front" | "admin") {
    setView(newView);

    if (newView === "admin" && !hasLoadedDemoInquiries) {
      try {
        const res = await fetch("/api/demo-inquiries");
        if (res.ok) {
          const inquiries = await res.json();
          setContent((prev) => ({
            ...prev,
            contact: { ...prev.contact, inquiries },
          }));
          setHasLoadedDemoInquiries(true);
        }
      } catch {}
    }
  }

  function handleSave(updated: SiteContent) {
    setContent(updated);
  }

  function handleReset() {
    setContent(initialContent);
    setHasLoadedDemoInquiries(false);
  }

  return (
    <div className="portfolio-demo-shell">
      <div className="demo-topbar">
        <span className="demo-topbar-brand">Studio by You</span>
        <div className="demo-view-toggle">
          <button
            className={`demo-toggle-btn${view === "front" ? " is-active" : ""}`}
            onClick={() => handleViewChange("front")}
            type="button"
          >
            프론트
          </button>
          <button
            className={`demo-toggle-btn${view === "admin" ? " is-active" : ""}`}
            onClick={() => handleViewChange("admin")}
            type="button"
          >
            어드민
          </button>
        </div>
        <div className="demo-topbar-right">
          <button className="demo-reset-btn" onClick={handleReset} type="button">
            초기화
          </button>
          <span className="demo-badge">데모</span>
        </div>
      </div>
      {view === "front" ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <StudioDemoFront content={content} page={_initialFrontPage} />
        </div>
      ) : (
        <main className="admin-shell" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <header className="admin-topbar">
            <div className="brand-mark" role="presentation">
              {isDynamicLogo ? (
                <img alt="Studio by You" className="header-logo" src={content.brand.logo} />
              ) : (
                <Image alt="Studio by You" className="header-logo" height={34} src={content.brand.logo} width={148} />
              )}
              <span>관리자</span>
            </div>
            <div className="topbar-actions">
              <a className="secondary-link" href="/" target="_blank" rel="noreferrer">
                사이트 보기
              </a>
            </div>
          </header>
          <DemoAdmin content={content} onSave={handleSave} />
        </main>
      )}
    </div>
  );
}
