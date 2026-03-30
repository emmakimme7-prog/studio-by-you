"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteProject } from "@/lib/site-content";

const PORTFOLIO_DRAFT_STORAGE_KEY = "studiobyyou-portfolio-admin-draft";

type PortfolioManagerProps = {
  projects: SiteProject[];
  categories: string[];
  isActive: boolean;
};

type EditableProject = SiteProject & {
  id: string;
};

type PortfolioDraft = {
  categories: string[];
  items: EditableProject[];
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyProject(category: string): EditableProject {
  const timestamp = Date.now();

  return {
    id: makeId("project"),
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [titleQuery, setTitleQuery] = useState("");
  const [summaryQuery, setSummaryQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("전체");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(categories.length ? categories : ["기본 카테고리"]);
  const [items, setItems] = useState<EditableProject[]>(
    projects.map((project) => ({
      ...project,
      id: makeId("project"),
    })),
  );

  function persistDraft(nextItems: EditableProject[], nextCategories: string[]) {
    if (typeof window === "undefined") {
      return;
    }

    const payload: PortfolioDraft = { items: nextItems, categories: nextCategories };
    window.localStorage.setItem(PORTFOLIO_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  }

  function syncDraftFromStorage() {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(PORTFOLIO_DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PortfolioDraft>;
      if (Array.isArray(parsed.categories) && parsed.categories.length) {
        setCategoryOptions(parsed.categories);
      }
      if (Array.isArray(parsed.items)) {
        setItems(parsed.items as EditableProject[]);
      }
    } catch {
      // ignore invalid draft
    }
  }

  useEffect(() => {
    persistDraft(items, categoryOptions);
  }, [items, categoryOptions]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === PORTFOLIO_DRAFT_STORAGE_KEY) {
        syncDraftFromStorage();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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
      const fromIndex = current.findIndex((item) => item.id === fromId);
      const toIndex = current.findIndex((item) => item.id === toId);

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
    goToEditorPage(nextProject.id);
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

      <div className="portfolio-admin-list">
        {filteredItems.map((project) => (
          <button
            className={`portfolio-admin-row button-reset${draggingId === project.id ? " is-dragging" : ""}`}
            draggable
            key={project.id}
            onClick={() => goToEditorPage(project.id)}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggingId(project.id)}
            onDrop={() => {
              if (draggingId) {
                moveItem(draggingId, project.id);
              }
            }}
            type="button"
          >
            <span aria-hidden="true" className="drag-handle">
              <img alt="" src="/home-assets/move.svg" />
            </span>
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
            <span className="portfolio-admin-slug">{items.findIndex((item) => item.id === project.id) + 1}</span>
          </button>
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
