"use client";

import { useMemo, useState } from "react";
import type { FaqGroup } from "@/lib/site-content";

type FaqManagerProps = {
  groups: FaqGroup[];
  isActive: boolean;
};

type Category = {
  id: string;
  title: string;
};

type QuestionItem = {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildInitialState(groups: FaqGroup[]) {
  const categories: Category[] = groups.map((group, index) => ({
    id: `cat-${index + 1}`,
    title: group.title,
  }));

  const fallbackCategoryId = categories[0]?.id ?? "cat-1";

  const questions: QuestionItem[] = groups.flatMap((group, groupIndex) =>
    group.items.map((item, itemIndex) => ({
      id: `question-${groupIndex + 1}-${itemIndex + 1}`,
      categoryId: categories[groupIndex]?.id ?? fallbackCategoryId,
      question: item.question,
      answer: item.answer,
    })),
  );

  return {
    categories: categories.length ? categories : [{ id: "cat-1", title: "기본 카테고리" }],
    questions: questions.length
      ? questions
      : [{ id: "question-1", categoryId: fallbackCategoryId, question: "", answer: "" }],
  };
}

export function FaqManager({ groups, isActive }: FaqManagerProps) {
  const initial = useMemo(() => buildInitialState(groups), [groups]);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [questions, setQuestions] = useState<QuestionItem[]>(initial.questions);
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(initial.questions[0]?.id ?? null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const payload = useMemo(() => {
    return JSON.stringify(
      categories.map((category) => ({
        title: category.title.trim(),
        items: questions
          .filter((item) => item.categoryId === category.id)
          .map((item) => ({
            question: item.question.trim(),
            answer: item.answer.trim(),
          })),
      })),
    );
  }, [categories, questions]);

  function addCategory() {
    const nextId = makeId("cat");
    setCategories((current) => [...current, { id: nextId, title: `새 카테고리 ${current.length + 1}` }]);
  }

  function updateCategory(id: string, title: string) {
    setCategories((current) => current.map((category) => (category.id === id ? { ...category, title } : category)));
  }

  function removeCategory(id: string) {
    if (categories.length === 1) {
      return;
    }

    const nextCategories = categories.filter((category) => category.id !== id);
    const fallbackCategoryId = nextCategories[0]?.id;

    setCategories(nextCategories);
    setQuestions((current) =>
      current.map((item) => (item.categoryId === id && fallbackCategoryId ? { ...item, categoryId: fallbackCategoryId } : item)),
    );
  }

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      {
        id: makeId("question"),
        categoryId: categories[0]?.id ?? "cat-1",
        question: "",
        answer: "",
      },
    ]);
  }

  function updateQuestion(id: string, key: "question" | "answer" | "categoryId", value: string) {
    setQuestions((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  function removeQuestion(id: string) {
    setQuestions((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  }

  function moveQuestion(fromId: string, toId: string) {
    if (fromId === toId) {
      return;
    }

    setQuestions((current) => {
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
    <div className="faq-manager">
      <input disabled={!isActive} name="faqGroupsPayload" readOnly type="hidden" value={payload} />

      <div className="faq-manager-topbar">
        <div className="faq-manager-summary">
          <strong>질문 {questions.length}개</strong>
          <span className="faq-manager-cat-badge">카테고리 {categories.length}개</span>
        </div>
        <div className="faq-manager-actions">
          <button className="secondary-link button-reset" onClick={() => setIsCategoryModalOpen(true)} type="button">
            카테고리 관리
          </button>
          <button className="secondary-link button-reset" onClick={addQuestion} type="button">
            질문 추가
          </button>
        </div>
      </div>

      <div className="faq-admin-grid">
        {questions.map((item, index) => (
          <details
            className={`mini-card faq-admin-card faq-admin-accordion${draggingId === item.id ? " is-dragging" : ""}`}
            draggable
            key={item.id}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggingId(item.id)}
            onDrop={() => {
              if (draggingId) {
                moveQuestion(draggingId, item.id);
              }
            }}
            open={openQuestionId === item.id}
          >
            <summary
              className="faq-admin-summary"
              onClick={(event) => {
                event.preventDefault();
                setOpenQuestionId((current) => (current === item.id ? null : item.id));
              }}
            >
              <span aria-hidden="true" className="drag-handle">
                <img alt="" src="/home-assets/move.svg" />
              </span>
              <strong>질문 {index + 1}</strong>
              <span>{categories.find((category) => category.id === item.categoryId)?.title || "카테고리 없음"}</span>
              <span>{item.question || "질문 제목을 입력하세요."}</span>
            </summary>
            <div className="faq-admin-accordion-body">
              <label className="full-width">
                <span>카테고리</span>
                <select
                  className="faq-category-select"
                  onChange={(event) => updateQuestion(item.id, "categoryId", event.target.value)}
                  value={item.categoryId}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                <span>질문</span>
                <input onChange={(event) => updateQuestion(item.id, "question", event.target.value)} value={item.question} />
              </label>
              <label className="full-width">
                <span>답변</span>
                <textarea
                  onChange={(event) => updateQuestion(item.id, "answer", event.target.value)}
                  rows={4}
                  value={item.answer}
                />
              </label>
              <div className="faq-admin-delete">
                <button className="secondary-link is-danger button-reset" onClick={() => removeQuestion(item.id)} type="button">
                  질문 삭제
                </button>
              </div>
            </div>
          </details>
        ))}
      </div>

      {isCategoryModalOpen ? (
        <div className="admin-modal-backdrop is-open" onClick={() => setIsCategoryModalOpen(false)} role="presentation">
          <div aria-modal="true" className="admin-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="admin-modal-head">
              <div>
                <p className="section-label">FAQ</p>
                <h3>카테고리 관리</h3>
              </div>
              <button className="secondary-link button-reset" onClick={() => setIsCategoryModalOpen(false)} type="button">
                닫기
              </button>
            </div>
            <div className="admin-modal-stack">
              <div className="faq-category-inline-list">
                {categories.map((category, index) => (
                  <div className="faq-category-inline-item" key={category.id}>
                    <span className="faq-category-inline-num">{index + 1}</span>
                    <input
                      className="faq-category-inline-input"
                      onChange={(event) => updateCategory(category.id, event.target.value)}
                      value={category.title}
                    />
                    <button
                      aria-label="카테고리 삭제"
                      className="icon-delete-btn button-reset"
                      onClick={() => removeCategory(category.id)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button className="secondary-link button-reset" onClick={addCategory} type="button">
                카테고리 추가
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
