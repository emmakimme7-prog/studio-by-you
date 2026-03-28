import { redirect } from "next/navigation";
import { LoginForm } from "./form";
import { getDefaultPasswordNotice, isAuthenticated } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  if (await isAuthenticated()) {
    redirect("/admin");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="section-label">Admin Access</p>
        <h1>관리자 전용 로그인</h1>
        <p className="hero-text">
          콘텐츠 수정과 운영 데이터 확인은 관리자 계정으로만 접근할 수 있습니다.
        </p>
        <LoginForm defaultPasswordNotice={getDefaultPasswordNotice()} />
      </section>
    </main>
  );
}
