"use client";

import { useMemo, useState } from "react";
import { HtmlEditor } from "@/app/admin/html-editor";
import { isVideoSrc, uploadImageFile, uploadMediaFile } from "@/lib/client-upload";
import { compressClientVideo } from "@/lib/client-video";
import type { SiteProject } from "@/lib/site-content";

const THUMBNAIL_RATIO_TEXT = "25:29";
const THUMBNAIL_RECOMMENDED_SIZE = "1250 x 1450px";

type PortfolioManagerProps = {
  projects: SiteProject[];
  categories: string[];
  isActive: boolean;
};

type EditableProject = SiteProject & {
  id: string;
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function VideoUploadInput({ onUpload }: { onUpload: (src: string) => void }) {
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading">("idle");
  const [progress, setProgress] = useState(0);

  return (
    <div>
      <input
        accept="image/*,video/mp4,video/webm,video/quicktime"
        className="file-input"
        disabled={status !== "idle"}
        type="file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = "";
          try {
            let src: string;
            if (file.type.startsWith("video/")) {
              setStatus("compressing");
              setProgress(0);
              const compressed = await compressClientVideo(file, {
                onProgress: (ratio) => setProgress(Math.round(ratio * 100)),
              });
              setStatus("uploading");
              src = await uploadMediaFile(compressed);
            } else {
              setStatus("uploading");
              src = await uploadImageFile(file);
            }
            onUpload(src);
          } catch (err) {
            alert(err instanceof Error ? err.message : "업로드에 실패했습니다.");
          } finally {
            setStatus("idle");
            setProgress(0);
          }
        }}
      />
      {status === "compressing" && (
        <p style={{ fontSize: "0.8rem", marginTop: 6, color: "#888" }}>
          압축 중... {progress}%
        </p>
      )}
      {status === "uploading" && (
        <p style={{ fontSize: "0.8rem", marginTop: 6, color: "#888" }}>
          업로드 중...
        </p>
      )}
    </div>
  );
}

function MediaPreview({ alt, src }: { alt: string; src: string }) {
  if (isVideoSrc(src)) {
    return (
      <div className="upload-preview upload-preview-compact">
        <video autoPlay loop muted playsInline src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div className="upload-preview upload-preview-compact">
      <img alt={alt} src={src} />
    </div>
  );
}

export function PortfolioManager({ projects, categories, isActive }: PortfolioManagerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
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

  const activeProject = items.find((item) => item.id === activeId) ?? null;

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

  function updateProject(id: string, key: keyof SiteProject, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  function removeProject(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setActiveId((current) => (current === id ? null : current));
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

      <div className="portfolio-admin-list">
        {filteredItems.map((project, index) => (
          <button
            className={`portfolio-admin-row button-reset${draggingId === project.id ? " is-dragging" : ""}`}
            draggable
            key={project.id}
            onClick={() => setActiveId(project.id)}
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
              <img alt={project.title} src={project.thumbnailImage} />
            </div>
            <div className="portfolio-admin-meta">
              <strong>{project.title}</strong>
              <span>{project.category}</span>
              <span>{project.summary}</span>
            </div>
            <span className="portfolio-admin-slug">{items.findIndex((item) => item.id === project.id) + 1}</span>
          </button>
        ))}
      </div>

      {activeProject ? (
        <div className="admin-modal-backdrop is-open" onClick={() => setActiveId(null)} role="presentation">
          <div
            aria-modal="true"
            className="admin-modal admin-modal-wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="admin-modal-head">
              <div>
                <p className="section-label">Portfolio</p>
                <h3>{activeProject.title}</h3>
              </div>
              <button className="secondary-link button-reset" onClick={() => setActiveId(null)} type="button">
                닫기
              </button>
            </div>

            {items.map((project, index) =>
              project.id === activeProject.id ? (
                <div className="form-grid two-columns" key={project.id}>
                  <label>
                    <span>프로젝트명</span>
                    <input
                      name={`projectTitle${index}`}
                      onChange={(event) => updateProject(project.id, "title", event.target.value)}
                      required
                      value={project.title}
                    />
                  </label>
                  <label>
                    <span>슬러그</span>
                    <input
                      name={`projectSlug${index}`}
                      onChange={(event) => updateProject(project.id, "slug", event.target.value)}
                      required
                      value={project.slug}
                    />
                  </label>
                  <label>
                    <span>카테고리</span>
                    <select
                      className="faq-category-select"
                      name={`projectCategory${index}`}
                      onChange={(event) => updateProject(project.id, "category", event.target.value)}
                      value={project.category}
                    >
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>사이트 링크</span>
                    <input
                      name={`projectSiteUrl${index}`}
                      onChange={(event) => updateProject(project.id, "siteUrl", event.target.value)}
                      placeholder="https://example.com"
                      value={project.siteUrl || ""}
                    />
                  </label>
                  <label>
                    <span>관리자 링크</span>
                    <input
                      name={`projectAdminUrl${index}`}
                      onChange={(event) => updateProject(project.id, "adminUrl", event.target.value)}
                      placeholder="https://admin.example.com"
                      value={project.adminUrl || ""}
                    />
                  </label>
                  <label className="full-width">
                    <span>설명</span>
                    <textarea
                      name={`projectSummary${index}`}
                      onChange={(event) => updateProject(project.id, "summary", event.target.value)}
                      required
                      rows={3}
                      value={project.summary}
                    />
                  </label>
                  <div className="full-width upload-block-side">
                    <MediaPreview alt={`${project.title} 썸네일`} src={project.thumbnailImage} />
                    <div className="upload-block-side-info">
                      <div className="upload-copy">
                        <strong>썸네일 이미지 / 영상</strong>
                        <p>{`이미지: 권장 ${THUMBNAIL_RECOMMENDED_SIZE} · 비율 ${THUMBNAIL_RATIO_TEXT}`}</p>
                        <p>영상: mp4 · webm 권장</p>
                      </div>
                      <VideoUploadInput
                        onUpload={(src) => updateProject(project.id, "thumbnailImage", src)}
                      />
                    </div>
                  </div>
                  <div className="full-width">
                    <HtmlEditor defaultValue={project.detailHtml} label="상세 페이지 본문" name={`projectDetailHtml${index}`} />
                  </div>
                </div>
              ) : null,
            )}
            <div className="section-actions">
              <button
                className="secondary-link is-danger button-reset"
                onClick={() => removeProject(activeProject.id)}
                type="button"
              >
                프로젝트 삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
