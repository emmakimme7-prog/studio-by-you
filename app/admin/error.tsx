"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-shell">
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <h2 style={{ marginBottom: 12 }}>오류가 발생했습니다</h2>
        <p style={{ color: "#727272", marginBottom: 24 }}>{error.message || "잠시 후 다시 시도해주세요."}</p>
        <button className="primary-link button-reset" onClick={reset} type="button">
          다시 시도
        </button>
      </div>
    </main>
  );
}
