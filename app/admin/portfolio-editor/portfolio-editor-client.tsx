"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PortfolioDetailEditor } from "@/app/admin/portfolio-detail-editor";
import { isVideoSrc, uploadImageFile, uploadVideoFile } from "@/lib/client-upload";
import type { SiteProject } from "@/lib/site-content";

const PORTFOLIO_DRAFT_STORAGE_KEY = "studiobyyou-portfolio-admin-draft";
const THUMBNAIL_RATIO_TEXT = "25:29";
const THUMBNAIL_RECOMMENDED_SIZE = "1250 x 1450px";

type EditableProject = SiteProject & {
  id: string;
};

type PortfolioDraft = {
  categories: string[];
  items: EditableProject[];
};

function MediaPreview({ alt, src }: { alt: string; src: string }) {
  if (!src) {
    return (
      <div className="upload-preview upload-preview-compact upload-preview-empty">
        <span>썸네일 없음</span>
      </div>
    );
  }

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

export function PortfolioEditorClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<PortfolioDraft | null>(null);
  const [status, setStatus] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [thumbnailFileName, setThumbnailFileName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(PORTFOLIO_DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PortfolioDraft;
      setDraft(parsed);
    } catch {
      setDraft(null);
    }
  }, []);

  const project = useMemo(
    () => draft?.items.find((item) => item.id === projectId) ?? null,
    [draft, projectId],
  );

  function updateDraft(nextDraft: PortfolioDraft) {
    setDraft(nextDraft);
    window.localStorage.setItem(PORTFOLIO_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
  }

  function updateProject(key: keyof SiteProject, value: string) {
    if (!draft) {
      return;
    }

    updateDraft({
      ...draft,
      items: draft.items.map((item) => (item.id === projectId ? { ...item, [key]: value } : item)),
    });
  }

  async function handleThumbnailUpload(file: File) {
    try {
      setThumbnailFileName(file.name);
      let src: string;
      if (file.type.startsWith("video/")) {
        setUploadStatus("uploading");
        src = await uploadVideoFile(file);
      } else {
        setUploadStatus("uploading");
        src = await uploadImageFile(file);
      }
      updateProject("thumbnailImage", src);
    } catch (error) {
      setThumbnailFileName("");
      alert(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setUploadStatus("idle");
    }
  }

  async function persistDraftToServer(nextDraft: PortfolioDraft) {
    const response = await fetch("/api/admin/portfolio-save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        categories: nextDraft.categories,
        projects: nextDraft.items.map(({ id, ...item }) => item),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "포트폴리오 저장에 실패했습니다.");
    }
  }

  async function removeProject() {
    if (!draft) {
      return;
    }

    const nextDraft = {
      ...draft,
      items: draft.items.filter((item) => item.id !== projectId),
    };

    try {
      setIsSaving(true);
      setStatus("");
      updateDraft(nextDraft);
      await persistDraftToServer(nextDraft);
      router.push("/admin");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "프로젝트 삭제에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDraft() {
    if (!draft) {
      return;
    }

    try {
      setIsSaving(true);
      setStatus("");
      await persistDraftToServer(draft);
      setStatus("이 창에서 바로 저장됐습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "포트폴리오 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!draft || !project) {
    return (
      <main className="portfolio-editor-shell">
        <section className="portfolio-editor-panel">
          <h1>포트폴리오 편집기</h1>
          <p>편집할 프로젝트를 찾을 수 없습니다. 메인 어드민에서 다시 열어주세요.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="portfolio-editor-shell">
      <section className="portfolio-editor-panel">
        <div className="panel-heading portfolio-editor-header">
          <div>
            <p className="section-label">Portfolio Editor</p>
            <h1>{project.title}</h1>
          </div>
          <div className="service-card-actions">
            <button className="primary-link button-reset" disabled={isSaving} onClick={() => void saveDraft()} type="button">
              {isSaving ? "저장 중..." : "바로 저장"}
            </button>
            <button className="secondary-link button-reset" onClick={() => router.push("/admin")} type="button">
              목록으로
            </button>
          </div>
        </div>

        <p className="section-label">이 창에서 바로 수정하고 바로 저장할 수 있습니다.</p>
        {status ? <p className="section-label">{status}</p> : null}

        <div className="form-grid two-columns portfolio-editor-form">
          <label>
            <span>프로젝트명</span>
            <input onChange={(event) => updateProject("title", event.target.value)} placeholder="프로젝트명을 입력해주세요" value={project.title} />
          </label>
          <label>
            <span>슬러그</span>
            <input onChange={(event) => updateProject("slug", event.target.value)} required value={project.slug} />
          </label>
          <label>
            <span>카테고리</span>
            <select
              className="faq-category-select"
              onChange={(event) => updateProject("category", event.target.value)}
              value={project.category}
            >
              {draft.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>사이트 링크</span>
            <input onChange={(event) => updateProject("siteUrl", event.target.value)} placeholder="https://example.com" value={project.siteUrl || ""} />
          </label>
          <label>
            <span>관리자 링크</span>
            <input onChange={(event) => updateProject("adminUrl", event.target.value)} placeholder="https://admin.example.com" value={project.adminUrl || ""} />
          </label>
          <label className="full-width">
            <span>설명</span>
            <textarea onChange={(event) => updateProject("summary", event.target.value)} required rows={3} value={project.summary} />
          </label>
          <div className="full-width upload-block-side">
            <MediaPreview alt={`${project.title} 썸네일`} src={project.thumbnailImage} />
            <div className="upload-block-side-info">
              <div className="upload-copy">
                <strong>썸네일 이미지 / 영상</strong>
                <p>{`이미지: 권장 ${THUMBNAIL_RECOMMENDED_SIZE} · 비율 ${THUMBNAIL_RATIO_TEXT}`}</p>
                <p>영상: mp4 · webm 권장</p>
              </div>
              <div className="file-input-stack file-input-stack-inline">
                <label className="file-input-button" htmlFor={`portfolio-thumbnail-${project.id}`}>
                  썸네일 수정
                </label>
                <span className="file-input-name">{thumbnailFileName || "선택된 파일 없음"}</span>
              </div>
              <input
                id={`portfolio-thumbnail-${project.id}`}
                accept="image/*,video/mp4,video/webm,video/quicktime"
                className="file-input"
                disabled={uploadStatus !== "idle"}
                type="file"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    await handleThumbnailUpload(file);
                  }
                  event.currentTarget.value = "";
                }}
              />
              {project.thumbnailImage ? (
                <button
                  className="secondary-link is-danger button-reset"
                  disabled={uploadStatus !== "idle"}
                  onClick={() => {
                    updateProject("thumbnailImage", "");
                    setThumbnailFileName("");
                  }}
                  type="button"
                >
                  썸네일 삭제
                </button>
              ) : null}
              {uploadStatus === "uploading" ? <p className="section-label">업로드 중...</p> : null}
            </div>
          </div>
          <div className="full-width portfolio-editor-detail-field">
            <div className="upload-copy">
              <strong>상세 페이지 본문</strong>
            </div>
            <PortfolioDetailEditor
              initialHtml={project.detailHtml}
              onChange={(nextValue) => updateProject("detailHtml", nextValue)}
              projectId={project.id}
            />
          </div>
        </div>

        <div className="section-actions">
          <button className="secondary-link is-danger button-reset" onClick={removeProject} type="button">
            {isSaving ? "처리 중..." : "프로젝트 삭제"}
          </button>
        </div>
      </section>
    </main>
  );
}
