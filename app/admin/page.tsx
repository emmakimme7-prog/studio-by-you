export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Image from "next/image";
import { ContentForm } from "./content-form";
import { logoutAction } from "./actions";
import { isAuthenticated } from "@/lib/admin-auth";
import { readChatConversations } from "@/lib/chat-inbox";
import { readSiteContent } from "@/lib/site-content";

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const [content, chatInquiries] = await Promise.all([readSiteContent(), readChatConversations()]);

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <a className="brand-mark" href="/">
          <Image alt="Studio by You" className="header-logo" height={34} src={content.brand.logo} width={148} />
          <span>관리자</span>
        </a>
        <div className="topbar-actions">
          <a className="secondary-link" href="/">
            사이트 보기
          </a>
          <form action={logoutAction}>
            <button className="primary-link button-reset" type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <ContentForm chatInquiries={chatInquiries} content={content} />
    </main>
  );
}
