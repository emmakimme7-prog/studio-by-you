"use client";

import { useMemo, useState } from "react";
import { uploadImageFile } from "@/lib/client-upload";
import type { ProcessStep } from "@/lib/site-content";

type ProcessManagerProps = {
  steps: ProcessStep[];
  isActive: boolean;
};

type EditableStep = ProcessStep & {
  id: string;
};

function makeId() {
  return `process-${Math.random().toString(36).slice(2, 9)}`;
}

function ImagePreview({ alt, src }: { alt: string; src: string }) {
  return (
    <div className="upload-preview">
      <img alt={alt} src={src} />
    </div>
  );
}

export function ProcessManager({ steps, isActive }: ProcessManagerProps) {
  const [items, setItems] = useState<EditableStep[]>(
    steps.length
      ? steps.map((step) => ({ ...step, id: makeId() }))
      : [{ id: makeId(), title: "", image: "/home-assets/process-1.png" }],
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const payload = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          title: item.title.trim(),
          subtitle: item.subtitle?.trim() ?? "",
          image: item.image,
        })),
      ),
    [items],
  );

  function updateTitle(id: string, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, title: value } : item)));
  }

  function updateSubtitle(id: string, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, subtitle: value } : item)));
  }

  function updateImage(id: string, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, image: value } : item)));
  }

  function addStep() {
    setItems((current) => [...current, { id: makeId(), title: "", image: "/home-assets/process-1.png" }]);
  }

  function removeStep(id: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
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
    <div className="process-manager">
      <input disabled={!isActive} name="processStepsPayload" readOnly type="hidden" value={payload} />

      <div className="faq-manager-topbar">
        <div className="faq-manager-summary">
          <strong>진행 단계 {items.length}개</strong>
        </div>
        <div className="faq-manager-actions">
          <button className="secondary-link button-reset" onClick={addStep} type="button">
            단계 추가
          </button>
        </div>
      </div>

      <div className="process-admin-grid">
        {items.map((step, index) => (
          <article
            className={`mini-card process-admin-card${draggingId === step.id ? " is-dragging" : ""}`}
            draggable
            key={step.id}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggingId(step.id)}
            onDrop={() => {
              if (draggingId) {
                moveItem(draggingId, step.id);
              }
            }}
          >
            <div className="process-admin-row">
              <div className="process-admin-left">
                <span aria-hidden="true" className="drag-handle">
                  <img alt="" src="/home-assets/move.svg" />
                </span>
                <div className="process-number">{index + 1}</div>
              </div>
              <div className="process-admin-image-col">
                <ImagePreview alt={`진행방법 ${index + 1}`} src={step.image} />
                <input
                  accept="image/*"
                  className="file-input"
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = "";
                    try {
                      const url = await uploadImageFile(file);
                      updateImage(step.id, url);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "업로드 실패");
                    }
                  }}
                />
              </div>
              <div className="process-admin-field">
                <label>
                  <input
                    name={`processStep${index}`}
                    onChange={(event) => updateTitle(step.id, event.target.value)}
                    placeholder="메인 텍스트"
                    required
                    value={step.title}
                  />
                </label>
                <label>
                  <input
                    onChange={(event) => updateSubtitle(step.id, event.target.value)}
                    placeholder="서브 텍스트 (선택)"
                    value={step.subtitle ?? ""}
                  />
                </label>
              </div>
              <button className="secondary-link is-danger button-reset" onClick={() => removeStep(step.id)} type="button">
                삭제
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
