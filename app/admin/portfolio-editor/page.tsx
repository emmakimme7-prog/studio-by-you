import Image from "next/image";
import { redirect } from "next/navigation";
import { PortfolioEditorClient } from "@/app/admin/portfolio-editor/portfolio-editor-client";
import { isAuthenticated } from "@/lib/admin-auth";
import { readSiteContent } from "@/lib/site-content";

type PortfolioEditorPageProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

function makeStableEditorId(slug: string, index: number) {
  const safeSlug = slug.trim() || `project-${index + 1}`;
  return `project-${safeSlug}`;
}

function makeUniqueEditorId(baseId: string, usedIds: Set<string>) {
  let nextId = baseId;
  let suffix = 1;

  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`;
  }

  usedIds.add(nextId);
  return nextId;
}

export default async function PortfolioEditorPage({ searchParams }: PortfolioEditorPageProps) {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const { projectId } = await searchParams;
  const content = await readSiteContent();
  const usedIds = new Set<string>();
  const initialDraft = {
    categories: content.portfolioCategories,
    items: content.projects.map((project, index) => ({
      ...project,
      editorId: makeUniqueEditorId(makeStableEditorId(project.slug, index), usedIds),
    })),
  };

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <a className="brand-mark" href="/admin">
          <Image alt="Studio by You" className="header-logo" height={34} src={content.brand.logo} width={148} />
          <span>포트폴리오 편집</span>
        </a>
        <div className="topbar-actions">
          <a className="secondary-link" href="/admin">
            관리자 홈
          </a>
          <a className="secondary-link" href="/">
            사이트 보기
          </a>
          <a className="primary-link" href="/admin">
            저장/로그아웃은 관리자 홈에서
          </a>
        </div>
      </header>

      <PortfolioEditorClient initialDraft={initialDraft} projectId={projectId || ""} />
    </main>
  );
}
