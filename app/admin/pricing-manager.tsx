"use client";

import { useMemo, useState } from "react";
import type { PricingPlan } from "@/lib/site-content";

type PricingManagerProps = {
  plans: PricingPlan[];
  isActive: boolean;
};

type EditablePlan = PricingPlan & {
  id: string;
};

function makeId() {
  return `plan-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyPlan(index: number): EditablePlan {
  return {
    id: makeId(),
    name: `New Plan ${index + 1}`,
    price: "",
    description: "",
    points: ["", "", "", ""],
    featured: false,
  };
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`pricing-chevron${open ? " is-open" : ""}`}
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 14 14"
      width="14"
    >
      <polyline points="2,4 7,10 12,4" />
    </svg>
  );
}

export function PricingManager({ plans, isActive }: PricingManagerProps) {
  const [items, setItems] = useState<EditablePlan[]>(
    plans.length ? plans.map((plan) => ({ ...plan, id: makeId(), points: [...plan.points] })) : [createEmptyPlan(0)],
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const payload = useMemo(
    () =>
      JSON.stringify(
        items.map(({ id, ...item }) => ({
          ...item,
          name: item.name.trim(),
          price: item.price.trim(),
          description: item.description.trim(),
          points: item.points.map((point) => point.trim()),
        })),
      ),
    [items],
  );

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateItem(id: string, key: keyof PricingPlan, value: string | boolean) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  function updatePoint(id: string, pointIndex: number, value: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              points: item.points.map((point, index) => (index === pointIndex ? value : point)),
            }
          : item,
      ),
    );
  }

  function addPlan() {
    const newPlan = createEmptyPlan(items.length);
    setItems((current) => [...current, newPlan]);
    setOpenIds((prev) => new Set(prev).add(newPlan.id));
  }

  function removePlan(id: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  }

  function movePlan(fromId: string, toId: string) {
    if (fromId === toId) return;
    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === fromId);
      const toIndex = current.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function addPoint(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, points: [...item.points, ""] } : item)),
    );
  }

  function removePoint(id: string, pointIndex: number) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, points: item.points.filter((_, i) => i !== pointIndex) } : item,
      ),
    );
  }

  return (
    <div className="pricing-manager">
      <input disabled={!isActive} name="pricingPlansPayload" readOnly type="hidden" value={payload} />

      <div className="faq-manager-topbar">
        <div className="faq-manager-summary">
          <strong>요금제 {items.length}개</strong>
        </div>
        <div className="faq-manager-actions">
          <button className="secondary-link button-reset" onClick={addPlan} type="button">
            플랜 추가
          </button>
        </div>
      </div>

      <div className="pricing-admin-grid">
        {items.map((plan, index) => {
          const isOpen = openIds.has(plan.id);
          return (
            <article
              className={`mini-card pricing-admin-card${draggingId === plan.id ? " is-dragging" : ""}`}
              draggable
              key={plan.id}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggingId(plan.id)}
              onDrop={() => {
                if (draggingId) movePlan(draggingId, plan.id);
              }}
            >
              <div className="pricing-admin-head">
                <button
                  aria-expanded={isOpen}
                  className="pricing-admin-head-left button-reset"
                  onClick={() => toggleOpen(plan.id)}
                  type="button"
                >
                  <span aria-hidden="true" className="drag-handle">
                    <img alt="" src="/home-assets/move.svg" />
                  </span>
                  <strong>플랜 {index + 1}</strong>
                  <ChevronIcon open={isOpen} />
                </button>
                <button className="secondary-link is-danger button-reset" onClick={() => removePlan(plan.id)} type="button">
                  삭제
                </button>
              </div>

              {isOpen && (
                <div className="form-grid two-columns">
                  <label>
                    <span>플랜명</span>
                    <input onChange={(event) => updateItem(plan.id, "name", event.target.value)} value={plan.name} />
                  </label>
                  <label>
                    <span>가격</span>
                    <input onChange={(event) => updateItem(plan.id, "price", event.target.value)} value={plan.price} />
                  </label>
                  <label className="full-width">
                    <span>설명</span>
                    <textarea onChange={(event) => updateItem(plan.id, "description", event.target.value)} rows={3} value={plan.description} />
                  </label>
                  {plan.points.map((point, pointIndex) => (
                    <div className="full-width pricing-point-row" key={`${plan.id}-${pointIndex}`}>
                      <label>
                        <span>포인트 {pointIndex + 1}</span>
                        <input onChange={(event) => updatePoint(plan.id, pointIndex, event.target.value)} value={point} />
                      </label>
                      <button
                        aria-label="포인트 삭제"
                        className="icon-delete-btn button-reset"
                        onClick={() => removePoint(plan.id, pointIndex)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="full-width">
                    <button className="secondary-link button-reset" onClick={() => addPoint(plan.id)} type="button">
                      포인트 추가
                    </button>
                  </div>
                  <div className="full-width pricing-featured-toggle">
                    <span>강조 플랜</span>
                    <label className="toggle-switch" aria-label="강조 플랜">
                      <input
                        checked={!!plan.featured}
                        onChange={(event) => updateItem(plan.id, "featured", event.target.checked)}
                        type="checkbox"
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
