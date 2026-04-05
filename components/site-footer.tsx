"use client";

import { useEffect, useRef, useState } from "react";

const relatedSites = [
  { label: "챗허브 | 고객 상담 서비스", href: "https://chathub.studiobyyou.kr" },
  { label: "세줄아침 | 루틴 콘텐츠 서비스", href: "https://studiobyyou.kr/?site=sejulachim-temp" },
  { label: "폼허브 | 신청서·수집 폼 서비스", href: "https://studiobyyou.kr/?site=formhub-temp" },
  { label: "픽허브 | 설문·투표 서비스", href: "https://survey.studiobyyou.kr" },
] as const;

export function SiteFooter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__meta">
          <p>상호명: OOO</p>
          <p>대표자: OOO</p>
          <p>사업자등록번호: OOO-OO-OOOOO</p>
          <p>통신판매업신고번호: OOO-OO-OOOO</p>
          <p>주소: OOO</p>
          <p>이메일: OOO@OOO.COM</p>
        </div>

        <div className="site-footer__right">
          <div className="site-footer__brand">
            <img
              alt="Studio by You"
              className="site-footer__logo"
              height={42}
              src="/home-assets/logo.png"
              width={186}
            />
            <div className="site-footer__brand-copy">
              <p>브랜드 웹사이트 · 서비스 구축 · 운영형 관리자 페이지</p>
            </div>
          </div>

          <div className="site-footer__links" ref={dropdownRef}>
            <button
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              className={`site-footer__select${isOpen ? " is-open" : ""}`}
              onClick={() => setIsOpen(current => !current)}
              type="button"
            >
              <span>관련 사이트</span>
              <span aria-hidden="true" className="site-footer__select-icon">
                <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                </svg>
              </span>
            </button>

            {isOpen ? (
              <div className="site-footer__menu" role="listbox">
                {relatedSites.map(site => (
                  <button
                    className="site-footer__menu-item"
                    key={site.label}
                    onClick={() => {
                      window.open(site.href, "_blank", "noopener,noreferrer");
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    {site.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
