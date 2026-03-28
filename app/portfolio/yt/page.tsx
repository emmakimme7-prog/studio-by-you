"use client";

import { useState } from "react";

export default function YtDemoPage() {
  const [view, setView] = useState<"front" | "admin">("front");

  const src = view === "front" ? "/yt-demo/index.html?v=14" : "/yt-demo/admin.html?v=14";

  return (
    <div className="portfolio-demo-shell">
      <div className="demo-topbar">
        <span className="demo-topbar-brand">TY Portfolio</span>
        <div className="demo-view-toggle">
          <button
            className={`demo-toggle-btn${view === "front" ? " is-active" : ""}`}
            onClick={() => setView("front")}
          >
            프론트
          </button>
          <button
            className={`demo-toggle-btn${view === "admin" ? " is-active" : ""}`}
            onClick={() => setView("admin")}
          >
            어드민
          </button>
        </div>
        <div className="demo-topbar-right">
          <span className="demo-badge">DEMO</span>
        </div>
      </div>
      <iframe
        key={src}
        src={src}
        style={{ flex: 1, border: "none", width: "100%" }}
        title="TY Portfolio Demo"
      />
    </div>
  );
}
