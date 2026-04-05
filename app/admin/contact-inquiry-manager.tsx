"use client";

import { useMemo, useState } from "react";
import type { ContactInquiry } from "@/lib/site-content";

type ContactInquiryManagerProps = {
  email: string;
  headline: string;
  inquiries: ContactInquiry[];
  pending?: boolean;
  planOptions: string[];
  privacyPolicy: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ContactInquiryManager({
  email,
  headline,
  inquiries,
  pending = false,
  planOptions,
  privacyPolicy,
}: ContactInquiryManagerProps) {
  const [headlineValue, setHeadlineValue] = useState(headline);
  const [emailValue, setEmailValue] = useState(email);
  const [privacyPolicyValue, setPrivacyPolicyValue] = useState(privacyPolicy);
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [planQuery, setPlanQuery] = useState("전체");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return inquiries.filter((inquiry) => {
      const matchesName = !nameQuery.trim() || inquiry.name.toLowerCase().includes(nameQuery.trim().toLowerCase());
      const matchesPhone = !phoneQuery.trim() || inquiry.phone.toLowerCase().includes(phoneQuery.trim().toLowerCase());
      const matchesMessage =
        !messageQuery.trim() || inquiry.message.toLowerCase().includes(messageQuery.trim().toLowerCase());
      const matchesPlan = planQuery === "전체" || inquiry.plan === planQuery;

      return matchesName && matchesPhone && matchesMessage && matchesPlan;
    });
  }, [inquiries, messageQuery, nameQuery, phoneQuery, planQuery]);

  const activeInquiry =
    filtered.find((inquiry) => inquiry.id === activeId) ??
    inquiries.find((inquiry) => inquiry.id === activeId) ??
    null;

  return (
    <div className="contact-inquiry-manager">
      <input name="contactHeadline" readOnly type="hidden" value={headlineValue} />
      <input name="contactEmail" readOnly type="hidden" value={emailValue} />
      <textarea className="visually-hidden-textarea" name="contactPrivacyPolicy" readOnly value={privacyPolicyValue} />

      <div className="faq-manager-topbar">
        <div className="faq-manager-summary">
          <strong>등록 문의 {inquiries.length}건</strong>
        </div>
        <div className="faq-manager-actions">
          <button className="secondary-link button-reset" onClick={() => setIsSettingsOpen(true)} type="button">
            문의관리
          </button>
        </div>
      </div>

      <div className="mini-card inquiry-filter-card">
        <div className="contact-inquiry-filter-grid">
          <label>
            <span>담당자 이름</span>
            <input
              onChange={(event) => setNameQuery(event.target.value)}
              placeholder="이름 검색"
              type="search"
              value={nameQuery}
            />
          </label>
          <label>
            <span>번호</span>
            <input
              onChange={(event) => setPhoneQuery(event.target.value)}
              placeholder="번호 검색"
              type="search"
              value={phoneQuery}
            />
          </label>
          <label>
            <span>문의내용</span>
            <input
              onChange={(event) => setMessageQuery(event.target.value)}
              placeholder="문의내용 검색"
              type="search"
              value={messageQuery}
            />
          </label>
          <label>
            <span>요금제</span>
            <select
              className="faq-category-select"
              onChange={(event) => setPlanQuery(event.target.value)}
              value={planQuery}
            >
              <option value="전체">전체</option>
              {planOptions.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mini-card inquiry-table-card">
        {filtered.length ? (
          <div className="table-wrap inquiry-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>번호</th>
                  <th>담당자</th>
                  <th>번호</th>
                  <th>요금제</th>
                  <th>문의내용</th>
                  <th>등록일</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inquiry, index) => (
                  <tr className="admin-table-row-clickable" key={inquiry.id} onClick={() => setActiveId(inquiry.id)}>
                    <td>{index + 1}</td>
                    <td>{inquiry.name}</td>
                    <td>{inquiry.phone}</td>
                    <td>{inquiry.plan}</td>
                    <td className="inquiry-table-message">{inquiry.message}</td>
                    <td>{formatDate(inquiry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="faq-empty-state">검색 결과가 없습니다.</div>
        )}
      </div>

      {isSettingsOpen ? (
        <div className="admin-modal-backdrop is-open" onClick={() => setIsSettingsOpen(false)} role="presentation">
          <div
            aria-modal="true"
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="admin-modal-head">
              <div>
                <p className="section-label">Contact</p>
                <h3>문의관리</h3>
              </div>
              <button
                aria-label="문의관리 닫기"
                className="portfolio-modal-close button-reset"
                onClick={() => setIsSettingsOpen(false)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="admin-modal-stack">
              <label className="full-width">
                <span>문의 헤드라인</span>
                <textarea onChange={(event) => setHeadlineValue(event.target.value)} rows={3} value={headlineValue} />
              </label>
              <label className="full-width">
                <span>문의 이메일</span>
                <input onChange={(event) => setEmailValue(event.target.value)} type="email" value={emailValue} />
              </label>
              <label className="full-width">
                <span>개인정보처리방침 전문</span>
                <textarea onChange={(event) => setPrivacyPolicyValue(event.target.value)} rows={8} value={privacyPolicyValue} />
              </label>
            </div>
            <div className="section-actions">
              <button
                className="primary-link button-reset"
                disabled={pending}
                formNoValidate
                name="saveSection"
                type="submit"
                value="contact"
              >
                {pending ? "저장 중..." : "문의 설정 저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeInquiry ? (
        <div className="admin-modal-backdrop is-open" onClick={() => setActiveId(null)} role="presentation">
          <div
            aria-modal="true"
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="admin-modal-head">
              <div>
                <p className="section-label">Inquiry</p>
                <h3>{activeInquiry.name}</h3>
              </div>
              <button
                aria-label="문의 상세 닫기"
                className="portfolio-modal-close button-reset"
                onClick={() => setActiveId(null)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="admin-modal-stack">
              <article className="mini-card">
                <div className="contact-inquiry-detail-grid">
                  <div>
                    <span>문의 유형</span>
                    <strong>{activeInquiry.inquiryType || "웹 제작"}</strong>
                  </div>
                  <div>
                    <span>요금제</span>
                    <strong>{activeInquiry.plan}</strong>
                  </div>
                  <div>
                    <span>연락처</span>
                    <strong>{activeInquiry.phone}</strong>
                  </div>
                  <div>
                    <span>서비스 유형</span>
                    <strong>{activeInquiry.serviceTypes.join(", ") || "-"}</strong>
                  </div>
                  <div>
                    <span>등록일시</span>
                    <strong>{formatDate(activeInquiry.createdAt)}</strong>
                  </div>
                </div>
              </article>
              <article className="mini-card">
                <span>문의 내용</span>
                <p className="contact-inquiry-message">{activeInquiry.message}</p>
                {activeInquiry.attachments.length ? (
                  <div className="contact-inquiry-attachments">
                    {activeInquiry.attachments.map((attachment, index) => (
                      <button
                        className="contact-inquiry-attachment-button button-reset"
                        key={`${attachment.slice(0, 32)}-${index}`}
                        onClick={() => setActiveAttachment(attachment)}
                        type="button"
                      >
                        <img alt={`문의 첨부 이미지 ${index + 1}`} src={attachment} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            </div>
          </div>
        </div>
      ) : null}

      {activeAttachment ? (
        <div className="portfolio-modal-backdrop" onClick={() => setActiveAttachment(null)} role="presentation">
          <div
            aria-modal="true"
            className="contact-image-lightbox"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="첨부 이미지 닫기"
              className="portfolio-modal-close button-reset contact-image-lightbox-close"
              onClick={() => setActiveAttachment(null)}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
            <img alt="문의 첨부 이미지 크게 보기" src={activeAttachment} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
