"use client";

import { useMemo, useState } from "react";

type FaqGroup = {
  title: string;
  items: Array<{
    question: string;
    answer: string;
  }>;
};

type FaqClientProps = {
  description: string;
  groups: FaqGroup[];
  title: string;
};

export function FaqClient({ description, groups, title }: FaqClientProps) {
  const [activeGroup, setActiveGroup] = useState("전체");
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const searched = groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          item.question.toLowerCase().includes(normalizedQuery) ||
          item.answer.toLowerCase().includes(normalizedQuery) ||
          group.title.toLowerCase().includes(normalizedQuery)
        );
      }),
    }));

    return searched.filter((group) => group.items.length > 0);
  }, [groups, query]);

  const visibleGroups =
    query || activeGroup === "전체"
      ? filteredGroups
      : filteredGroups.filter((group) => group.title === activeGroup);

  const menuItems = ["전체", ...groups.map((group) => group.title)];

  return (
    <section className="faq-shell">
      <div className="faq-hero">
        <h1>{title}</h1>
        <span>{description}</span>
        <div className="faq-search">
          <span aria-hidden="true" className="faq-search-icon">
            <img alt="" src="/home-assets/search.svg" />
          </span>
          <input
            aria-label="질문 검색"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="궁금한 내용을 찾아보세요."
            value={query}
          />
        </div>
      </div>

      <div className="faq-menu faq-menu-centered">
        {menuItems.map((item) => (
          <button
            className={`faq-menu-button${item === activeGroup ? " is-active" : ""}`}
            key={item}
            onClick={() => setActiveGroup(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="faq-group-stack faq-group-stack-centered">
        {visibleGroups.length ? (
          visibleGroups.map((group) => (
            <section className="faq-group" key={group.title}>
              <h2>{group.title}</h2>
              <div className="faq-item-stack">
                {group.items.map((item) => (
                  <details className="faq-item" key={item.question}>
                    <summary>
                      <span>{item.question}</span>
                      <span aria-hidden="true" className="faq-item-icon">
                        +
                      </span>
                    </summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))
        ) : (
          <section className="faq-group">
            <h2>검색 결과가 없어요.</h2>
            <div className="faq-item-stack">
              <div className="faq-empty-state">
                다른 키워드로 검색하거나, 문의하기 페이지에서 직접 상담을 남겨주세요.
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
