"use client";

import { useMemo, useState } from "react";
import { uploadImageFile } from "@/lib/client-upload";
import type { OperatedService } from "@/lib/site-content";

type EditableService = OperatedService & { id: string };

function makeId() {
  return `svc-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyService(): EditableService {
  return {
    id: makeId(),
    title: "",
    description: "",
    image: "/home-assets/process-1.png",
    link: "",
    badge: "",
    pricing: "무료",
    pricingDetail: "",
  };
}

type Props = { services: OperatedService[]; isActive: boolean };

export function ServiceManager({ services, isActive }: Props) {
  const [items, setItems] = useState<EditableService[]>(
    services.length ? services.map((s) => ({ ...s, id: makeId() })) : [emptyService()],
  );
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const payload = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          image: item.image,
          link: item.link.trim(),
          badge: item.badge?.trim() ?? "",
          pricing: item.pricing.trim(),
          pricingDetail: item.pricingDetail?.trim() ?? "",
        })),
      ),
    [items],
  );

  function update(id: string, key: keyof OperatedService, value: string) {
    setItems((cur) => cur.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  function updateImage(id: string, value: string) {
    setItems((cur) => cur.map((item) => (item.id === id ? { ...item, image: value } : item)));
  }

  function addService() {
    const newItem = emptyService();
    setItems((cur) => [...cur, newItem]);
    setOpenId(newItem.id);
  }

  function removeService(id: string) {
    setItems((cur) => {
      if (cur.length === 1) return cur;
      const next = cur.filter((item) => item.id !== id);
      if (openId === id) setOpenId(next[0]?.id ?? null);
      return next;
    });
  }

  function moveItem(fromId: string, toId: string) {
    if (fromId === toId) return;
    setItems((cur) => {
      const from = cur.findIndex((i) => i.id === fromId);
      const to = cur.findIndex((i) => i.id === toId);
      if (from < 0 || to < 0) return cur;
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <div className="service-manager">
      <input disabled={!isActive} name="operatedServicesPayload" readOnly type="hidden" value={payload} />

      <div className="faq-manager-topbar">
        <div className="faq-manager-summary">
          <strong>서비스 {items.length}개</strong>
        </div>
        <div className="faq-manager-actions">
          <button className="secondary-link button-reset" onClick={addService} type="button">
            서비스 추가
          </button>
        </div>
      </div>

      <div className="faq-admin-grid">
        {items.map((item, index) => (
          <details
            className={`mini-card faq-admin-card faq-admin-accordion${draggingId === item.id ? " is-dragging" : ""}`}
            draggable
            key={item.id}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDragStart={() => setDraggingId(item.id)}
            onDrop={() => { if (draggingId) moveItem(draggingId, item.id); }}
            open={openId === item.id}
          >
            <summary
              className="faq-admin-summary"
              onClick={(e) => {
                e.preventDefault();
                setOpenId((cur) => (cur === item.id ? null : item.id));
              }}
            >
              <span aria-hidden="true" className="drag-handle">
                <img alt="" src="/home-assets/move.svg" />
              </span>
              <strong>서비스 {index + 1}</strong>
              {item.badge ? <span className="service-admin-badge">{item.badge}</span> : null}
              <span>{item.title || "서비스 이름을 입력하세요."}</span>
              <span className="service-admin-price">{item.pricing || "-"}</span>
            </summary>

            <div className="faq-admin-accordion-body service-admin-body">
              <div className="service-admin-image-row">
                <div className="upload-preview upload-preview-compact">
                  <img alt={item.title} src={item.image} />
                </div>
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
                      updateImage(item.id, url);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "업로드 실패");
                    }
                  }}
                />
              </div>

              <label className="full-width">
                <span>서비스 이름</span>
                <input onChange={(e) => update(item.id, "title", e.target.value)} required value={item.title} />
              </label>
              <label className="full-width">
                <span>설명</span>
                <textarea
                  onChange={(e) => update(item.id, "description", e.target.value)}
                  rows={3}
                  value={item.description}
                />
              </label>
              <label className="full-width">
                <span>서비스 링크 (사용해보기 URL)</span>
                <input
                  onChange={(e) => update(item.id, "link", e.target.value)}
                  placeholder="https://..."
                  type="url"
                  value={item.link}
                />
              </label>
              <div className="form-grid two-columns">
                <label>
                  <span>요금</span>
                  <input
                    onChange={(e) => update(item.id, "pricing", e.target.value)}
                    placeholder="무료 / 월 9,900원 등"
                    value={item.pricing}
                  />
                </label>
                <label>
                  <span>뱃지 (선택)</span>
                  <input
                    onChange={(e) => update(item.id, "badge", e.target.value)}
                    placeholder="NEW / 베타 / 인기"
                    value={item.badge ?? ""}
                  />
                </label>
              </div>
              <label className="full-width">
                <span>요금 상세 (선택)</span>
                <input
                  onChange={(e) => update(item.id, "pricingDetail", e.target.value)}
                  placeholder="추가 요금 안내, 무료 체험 조건 등"
                  value={item.pricingDetail ?? ""}
                />
              </label>

              <div className="faq-admin-delete">
                <button
                  className="secondary-link is-danger button-reset"
                  onClick={() => removeService(item.id)}
                  type="button"
                >
                  서비스 삭제
                </button>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
