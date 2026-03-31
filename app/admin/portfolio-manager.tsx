"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteProject } from "@/lib/site-content";

const PORTFOLIO_DRAFT_STORAGE_KEY = "studiobyyou-portfolio-admin-draft-v2";

type PortfolioManagerProps = {
  projects: SiteProject[];
  categories: string[];
  isActive: boolean;
};

type EditableProject = SiteProject & {
  editorId: string;
};

type PortfolioDraft = {
  categories: string[];
  items: EditableProject[];
};

function readStoredDraft(): PortfolioDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(PORTFOLIO_DRAFT_STORAGE_KEY);
  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved) as PortfolioDraft;
    if (Array.isArray(parsed.items) && Array.isArray(parsed.categories)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function makeDraftId() {
  return `draft-${Math.random().toString(36).slice(2, 9)}`;
}

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

function createEditableProjects(projects: SiteProject[]) {
  const usedIds = new Set<string>();

  return projects.map((project, index) => ({
    ...project,
    editorId: makeUniqueEditorId(makeStableEditorId(project.slug, index), usedIds),
  }));
}

function createEmptyProject(category: string): EditableProject {
  const timestamp = Date.now();

  return {
    editorId: makeDraftId(),
    title: "",
    slug: `project-${timestamp}`,
    category,
    summary: "",
    thumbnailImage: "",
    siteUrl: "",
    adminUrl: "",
    detailHtml: "",
    detailImages: [],
  };
}

function goToEditorPage(projectId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.assign(`/admin/portfolio-editor?projectId=${projectId}`);
}

export function PortfolioManager({ projects, categories, isActive }: PortfolioManagerProps) {
  const serverItems = useMemo(() => createEditableProjects(projects), [projects]);
  const serverCategories = useMemo(() => (categories.length ? categories : ["기본 카테고리"]), [categories]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [titleQuery, setTitleQuery] = useState("");
  const [summaryQuery, setSummaryQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("전체");
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(serverCategories);
  const [items, setItems] = useState<EditableProject[]>(serverItems);

  function persistDraft(nextItems: EditableProject[], nextCategories: string[]) {
    if (typeof window === "undefined") {
      return;
    }

    const payload: PortfolioDraft = { items: nextItems, categories: nextCategories };
    window.localStorage.setItem(PORTFOLIO_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  }

  async function persistDraftToServer(nextItems: EditableProject[], nextCategories: string[]) {
    const response = await fetch("/api/admin/portfolio-save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        categories: nextCategories,
        projects: nextItems.map(({ editorId, ...item }) => item),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "포트폴리오 저장에 실패했습니다.");
    }
  }


  useEffect(() => {
    persistDraft(items, categoryOptions);
  }, [items, categoryOptions]);

  useEffect(() => {
    const stored = readStoredDraft();

    if (stored) {
      setCategoryOptions(stored.categories.length ? stored.categories : ["기본 카테고리"]);
      setItems(stored.items);
      return;
    }

    setCategoryOptions(serverCategories);
    setItems(serverItems);
    persistDraft(serverItems, serverCategories);
  }, [serverCategories, serverItems]);

  const categoryPayload = useMemo(
    () => JSON.stringify(categoryOptions.map((item) => item.trim()).filter(Boolean)),
    [categoryOptions],
  );
  const projectsPayload = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          title: item.title,
          slug: item.slug,
          category: item.category,
          summary: item.summary,
          thumbnailImage: item.thumbnailImage,
          siteUrl: item.siteUrl || "",
          adminUrl: item.adminUrl || "",
          detailHtml: item.detailHtml,
          detailImages: item.detailImages || [],
        })),
      ),
    [items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = categoryQuery === "전체" || item.category === categoryQuery;
      const matchesTitle =
        !titleQuery.trim() || item.title.toLowerCase().includes(titleQuery.trim().toLowerCase());
      const matchesSummary =
        !summaryQuery.trim() || item.summary.toLowerCase().includes(summaryQuery.trim().toLowerCase());

      return matchesCategory && matchesTitle && matchesSummary;
    });
  }, [categoryQuery, items, summaryQuery, titleQuery]);

  function updateCategory(index: number, value: string) {
    setCategoryOptions((current) => {
      const next = [...current];
      const previous = next[index];
      next[index] = value;

      setItems((itemsState) =>
        itemsState.map((item) => (item.category === previous ? { ...item, category: value } : item)),
      );

      return next;
    });
  }

  function removeCategory(index: number) {
    if (categoryOptions.length === 1) {
      return;
    }

    const removed = categoryOptions[index];
    const nextOptions = categoryOptions.filter((_, optionIndex) => optionIndex !== index);
    const fallback = nextOptions[0] || "기본 카테고리";

    setCategoryOptions(nextOptions);
    setItems((current) => current.map((item) => (item.category === removed ? { ...item, category: fallback } : item)));
    setCategoryQuery((current) => (current === removed ? "전체" : current));
  }

  function addCategory() {
    setCategoryOptions((current) => [...current, `새 카테고리 ${current.length + 1}`]);
  }

  function moveItem(fromId: string, toId: string) {
    if (fromId === toId) {
      return;
    }

    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.editorId === fromId);
      const toIndex = current.findIndex((item) => item.editorId === toId);

      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function addProject() {
    const nextProject = createEmptyProject(categoryOptions[0] || "기본 카테고리");
    const nextItems = [nextProject, ...items];
    setItems(nextItems);
    persistDraft(nextItems, categoryOptions);
    goToEditorPage(nextProject.editorId);
  }

  async function removeProject(projectId: string) {
    const project = items.find((item) => item.editorId === projectId);
    if (!project) {
      return;
    }

    const shouldDelete = typeof window === "undefined"
      ? true
      : window.confirm(`"${project.title || "제목 없음"}" 프로젝트를 삭제할까요?`);

    if (!shouldDelete) {
      return;
    }

    const nextItems = items.filter((item) => item.editorId !== projectId);

    try {
      setDeletingId(projectId);
      setStatus("");
      setItems(nextItems);
      persistDraft(nextItems, categoryOptions);
      await persistDraftToServer(nextItems, categoryOptions);
      setStatus("프로젝트를 삭제했습니다.");
    } catch (error) {
      setItems(items);
      persistDraft(items, categoryOptions);
      setStatus(error instanceof Error ? error.message : "프로젝트 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <input disabled={!isActive} name="portfolioCategoriesPayload" readOnly type="hidden" value={categoryPayload} />
      <input disabled={!isActive} name="portfolioProjectsPayload" readOnly type="hidden" value={projectsPayload} />

      <div className="faq-manager-topbar">
        <div className="faq-manager-summary">
          <strong>프로젝트 {items.length}개</strong>
          <span className="topbar-sub">카테고리 {categoryOptions.length}개</span>
        </div>
        <div className="faq-manager-actions">
          <button className="secondary-link button-reset" onClick={addProject} type="button">
            프로젝트 추가
          </button>
          <button className="secondary-link button-reset" onClick={() => setIsCategoryModalOpen(true)} type="button">
            카테고리 관리
          </button>
        </div>
      </div>

      <div className="mini-card admin-filter-card">
        <div className="portfolio-filter-grid">
          <label>
            <span>카테고리</span>
            <select className="faq-category-select" onChange={(event) => setCategoryQuery(event.target.value)} value={categoryQuery}>
              <option value="전체">전체</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>프로젝트명</span>
            <input onChange={(event) => setTitleQuery(event.target.value)} placeholder="프로젝트명 검색" value={titleQuery} />
          </label>
          <label>
            <span>설명</span>
            <input onChange={(event) => setSummaryQuery(event.target.value)} placeholder="설명 검색" value={summaryQuery} />
          </label>
        </div>
      </div>

      <p className="section-label">프로젝트를 클릭하면 같은 페이지에서 편집 화면으로 이동합니다.</p>
      {status ? <p className="section-label">{status}</p> : null}

      <div className="portfolio-admin-list">
        {filteredItems.map((project) => (
          <div
            className={`portfolio-admin-row button-reset${draggingId === project.editorId ? " is-dragging" : ""}`}
            draggable
            key={project.editorId}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggingId(project.editorId)}
            onDrop={() => {
              if (draggingId) {
                moveItem(draggingId, project.editorId);
              }
            }}
          >
            <span aria-hidden="true" className="drag-handle">
              <img alt="" src="/home-assets/move.svg" />
            </span>
            <button className="portfolio-admin-row-main button-reset" onClick={() => goToEditorPage(project.editorId)} type="button">
              <div className="portfolio-admin-row-thumb">
                {project.thumbnailImage ? (
                  <img alt={project.title || "새 포트폴리오"} src={project.thumbnailImage} />
                ) : (
                  <span className="portfolio-admin-row-thumb-empty">썸네일 없음</span>
                )}
              </div>
              <div className="portfolio-admin-meta">
                <strong>{project.title || "제목 없음"}</strong>
                <span>{project.category}</span>
                <span>{project.summary || "설명을 입력해주세요."}</span>
              </div>
              <span className="portfolio-admin-slug">{items.findIndex((item) => item.editorId === project.editorId) + 1}</span>
            </button>
            <div className="portfolio-admin-row-actions">
              <button className="secondary-link button-reset" onClick={() => goToEditorPage(project.editorId)} type="button">
                편집
              </button>
              <button
                className="secondary-link is-danger button-reset"
                disabled={deletingId === project.editorId}
                onClick={() => void removeProject(project.editorId)}
                type="button"
              >
                {deletingId === project.editorId ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isCategoryModalOpen ? (
        <div className="admin-modal-backdrop is-open" onClick={() => setIsCategoryModalOpen(false)} role="presentation">
          <div
            aria-modal="true"
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="admin-modal-head">
              <div>
                <p className="section-label">Portfolio</p>
                <h3>카테고리 관리</h3>
              </div>
              <button className="secondary-link button-reset" onClick={() => setIsCategoryModalOpen(false)} type="button">
                닫기
              </button>
            </div>

            <div className="admin-modal-stack">
              {categoryOptions.map((category, index) => (
                <article className="mini-card" key={`${category}-${index}`}>
                  <div className="faq-admin-item-head">
                    <strong>카테고리 {index + 1}</strong>
                    <button className="secondary-link is-danger button-reset" onClick={() => removeCategory(index)} type="button">
                      삭제
                    </button>
                  </div>
                  <label className="full-width">
                    <span>카테고리명</span>
                    <input onChange={(event) => updateCategory(index, event.target.value)} value={category} />
                  </label>
                </article>
              ))}
            </div>

            <div className="section-actions">
              <button className="secondary-link button-reset" onClick={addCategory} type="button">
                카테고리 추가
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
