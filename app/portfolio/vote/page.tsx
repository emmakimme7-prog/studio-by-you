"use client";

import { useState } from "react";

const ROLE_OPTIONS = [
  { label: "선생님", value: "school" },
  { label: "학생", value: "student" },
] as const;

export default function VoteDemoPage() {
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]["value"]>("school");
  const [key, setKey] = useState(0);

  function reload() {
    setKey((k) => k + 1);
  }

  return (
    <div className="portfolio-demo-shell">
      <div className="demo-topbar" style={{ flexWrap: "wrap", gap: "8px", height: "auto", minHeight: 48, paddingBlock: "6px" }}>
        <span className="demo-topbar-brand">투표 시스템</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setRole(option.value);
                setKey((k) => k + 1);
              }}
              style={{
                fontSize: "0.78rem",
                color: role === option.value ? "#111" : "rgba(255,255,255,0.8)",
                background: role === option.value ? "#fff" : "rgba(255,255,255,0.08)",
                border: "none",
                padding: "8px 12px",
                borderRadius: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="demo-topbar-right">
          <button className="demo-reset-btn" onClick={reload}>새로고침</button>
          <span className="demo-badge">DEMO</span>
        </div>
      </div>
      <iframe
        key={`${role}-${key}`}
        src={`/vote-demo/index.html?v=7&demoRole=${role}`}
        style={{ flex: 1, border: "none", width: "100%" }}
        title="투표 시스템 데모"
      />
    </div>
  );
}
