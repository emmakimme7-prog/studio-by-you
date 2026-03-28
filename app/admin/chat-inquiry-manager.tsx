"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatConversation } from "@/lib/chat-inbox";

type ChatInquiryManagerProps = {
  inquiries: ChatConversation[];
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

function getStatusLabel(status: ChatConversation["status"]) {
  if (status === "answered") return "답변완료";
  if (status === "closed") return "종료";
  return "신규";
}

function getStatusClassName(status: ChatConversation["status"]) {
  if (status === "answered") return "is-answered";
  if (status === "closed") return "is-closed";
  return "is-new";
}

export function ChatInquiryManager({ inquiries }: ChatInquiryManagerProps) {
  const [conversations, setConversations] = useState(inquiries);
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [intentQuery, setIntentQuery] = useState("전체");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState("");

  useEffect(() => {
    setConversations(inquiries);
  }, [inquiries]);

  const intentOptions = useMemo(
    () => ["전체", ...Array.from(new Set(conversations.map((inquiry) => inquiry.intent).filter(Boolean)))],
    [conversations],
  );

  const filtered = useMemo(() => {
    return conversations.filter((conversation) => {
      const lastMessage = conversation.messages[conversation.messages.length - 1]?.text || "";
      const matchesName = !nameQuery.trim() || conversation.name.toLowerCase().includes(nameQuery.trim().toLowerCase());
      const matchesPhone = !phoneQuery.trim() || conversation.phone.toLowerCase().includes(phoneQuery.trim().toLowerCase());
      const matchesMessage = !messageQuery.trim() || lastMessage.toLowerCase().includes(messageQuery.trim().toLowerCase());
      const matchesIntent = intentQuery === "전체" || conversation.intent === intentQuery;

      return matchesName && matchesPhone && matchesMessage && matchesIntent;
    });
  }, [conversations, intentQuery, messageQuery, nameQuery, phoneQuery]);

  const activeConversation =
    filtered.find((conversation) => conversation.id === activeId) ??
    conversations.find((conversation) => conversation.id === activeId) ??
    null;

  useEffect(() => {
    if (!activeConversation) {
      setReplyText("");
      setReplyFeedback("");
    }
  }, [activeConversation?.id]);

  async function handleReply() {
    if (!activeConversation || !replyText.trim()) {
      setReplyFeedback("답장 내용을 입력해주세요.");
      return;
    }

    setIsReplying(true);
    setReplyFeedback("");

    try {
      const response = await fetch("/api/admin/chat-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          message: replyText,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        conversation?: ChatConversation;
        message?: string;
      };

      if (!response.ok || !result.conversation) {
        throw new Error(result.message || "답장 저장에 실패했습니다.");
      }

      setConversations((current) => [result.conversation!, ...current.filter((item) => item.id !== result.conversation!.id)]);
      setActiveId(result.conversation.id);
      setReplyText("");
      setReplyFeedback(result.message || "답장을 보냈습니다.");
    } catch (error) {
      setReplyFeedback(error instanceof Error ? error.message : "답장 저장 중 문제가 발생했습니다.");
    } finally {
      setIsReplying(false);
    }
  }

  return (
    <div className="contact-inquiry-manager">
      <div className="faq-manager-topbar">
        <div className="faq-manager-summary">
          <strong>등록 채팅 {conversations.length}건</strong>
          <span>우하단 채팅 위젯에서 들어온 대화와 답장을 여기서 이어갑니다.</span>
        </div>
      </div>

      <div className="mini-card inquiry-filter-card">
        <div className="contact-inquiry-filter-grid">
          <label>
            <span>이름</span>
            <input onChange={(event) => setNameQuery(event.target.value)} placeholder="이름 검색" type="search" value={nameQuery} />
          </label>
          <label>
            <span>연락처</span>
            <input onChange={(event) => setPhoneQuery(event.target.value)} placeholder="연락처 검색" type="search" value={phoneQuery} />
          </label>
          <label>
            <span>최근 메시지</span>
            <input onChange={(event) => setMessageQuery(event.target.value)} placeholder="메시지 검색" type="search" value={messageQuery} />
          </label>
          <label>
            <span>주제</span>
            <select className="faq-category-select" onChange={(event) => setIntentQuery(event.target.value)} value={intentQuery}>
              {intentOptions.map((intent) => (
                <option key={intent} value={intent}>
                  {intent}
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
                  <th>이름</th>
                  <th>연락처</th>
                  <th>주제</th>
                  <th>상태</th>
                  <th>최근 메시지</th>
                  <th>업데이트</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((conversation, index) => {
                  const lastMessage = conversation.messages[conversation.messages.length - 1];
                  return (
                    <tr className="admin-table-row-clickable" key={conversation.id} onClick={() => setActiveId(conversation.id)}>
                      <td>{index + 1}</td>
                      <td>{conversation.name}</td>
                      <td>{conversation.phone}</td>
                      <td>{conversation.intent}</td>
                      <td>{getStatusLabel(conversation.status)}</td>
                      <td className="inquiry-table-message">{lastMessage?.text || "-"}</td>
                      <td>{formatDate(conversation.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="faq-empty-state">등록된 채팅 문의가 없습니다.</div>
        )}
      </div>

      {activeConversation ? (
        <div className="admin-modal-backdrop is-open" onClick={() => setActiveId(null)} role="presentation">
          <div aria-modal="true" className="admin-modal admin-modal-wide" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="admin-modal-head">
              <div>
                <p className="section-label">Chat</p>
                <h3>{activeConversation.name}</h3>
              </div>
              <button aria-label="채팅 상세 닫기" className="portfolio-modal-close button-reset" onClick={() => setActiveId(null)} type="button">
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="admin-modal-stack admin-chat-stack">
              <article className="admin-chat-summary-card">
                <div className="admin-chat-summary-head">
                  <span className="site-chat-summary-badge">고객 정보</span>
                  <span className={`admin-chat-status-badge ${getStatusClassName(activeConversation.status)}`}>
                    {getStatusLabel(activeConversation.status)}
                  </span>
                </div>
                <div className="admin-chat-summary-grid">
                  <div className="site-chat-summary-item">
                    <span className="site-chat-summary-label">이름</span>
                    <strong>{activeConversation.name}</strong>
                  </div>
                  <div className="site-chat-summary-item">
                    <span className="site-chat-summary-label">연락처</span>
                    <strong>{activeConversation.phone}</strong>
                  </div>
                  <div className="site-chat-summary-item">
                    <span className="site-chat-summary-label">문의 유형</span>
                    <strong>{activeConversation.intent}</strong>
                  </div>
                  <div className="site-chat-summary-item">
                    <span className="site-chat-summary-label">유입 경로</span>
                    <strong>홈 채팅 위젯</strong>
                  </div>
                </div>
              </article>

              <article className="admin-chat-section-card">
                <div className="admin-chat-section-head">
                  <span>대화 내역</span>
                  <strong>{formatDate(activeConversation.updatedAt)}</strong>
                </div>
                <div className="site-chat-thread admin-chat-thread">
                  {activeConversation.messages.map((item) => (
                    <div
                      className={`site-chat-bubble ${item.sender === "admin" ? "site-chat-bubble-agent" : "site-chat-bubble-user"}`}
                      key={item.id}
                    >
                      <span className="site-chat-bubble-label">
                        {item.sender === "admin" ? "관리자" : activeConversation.name} · {formatDate(item.createdAt)}
                      </span>
                      {item.imageDataUrl ? (
                        <a className="site-chat-image-link" href={item.imageDataUrl} rel="noreferrer" target="_blank">
                          <img alt="첨부 이미지" className="site-chat-image" src={item.imageDataUrl} />
                        </a>
                      ) : null}
                      {item.text ? <span>{item.text}</span> : null}
                    </div>
                  ))}
                </div>
              </article>

              <article className="admin-chat-section-card admin-chat-reply-card">
                <div className="admin-chat-section-head">
                  <span>답장 보내기</span>
                </div>
                <textarea
                  className="site-chat-textarea"
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="메세지"
                  rows={4}
                  value={replyText}
                />
                {replyFeedback ? <p className={`site-chat-feedback ${replyFeedback.includes("실패") || replyFeedback.includes("입력") ? "is-error" : "is-success"}`}>{replyFeedback}</p> : null}
                <button className="site-chat-primary" disabled={isReplying} onClick={handleReply} type="button">
                  {isReplying ? "보내는 중..." : "답장 보내기"}
                </button>
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
