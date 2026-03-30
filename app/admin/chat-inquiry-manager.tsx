"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
  const [threadQuery, setThreadQuery] = useState("");
  const [pendingReplyImage, setPendingReplyImage] = useState<{ name: string; url: string } | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [isUploadingReplyImage, setIsUploadingReplyImage] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState("");
  const [expandedImageUrl, setExpandedImageUrl] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setConversations(inquiries);
  }, [inquiries]);

  const intentOptions = useMemo(
    () => ["전체", ...Array.from(new Set(conversations.map((inquiry) => inquiry.intent).filter(Boolean)))],
    [conversations],
  );

  const filtered = useMemo(() => {
    return conversations.filter((conversation) => {
      const conversationText = conversation.messages.map((item) => item.text).join(" ").toLowerCase();
      const matchesName = !nameQuery.trim() || conversation.name.toLowerCase().includes(nameQuery.trim().toLowerCase());
      const matchesPhone = !phoneQuery.trim() || conversation.phone.toLowerCase().includes(phoneQuery.trim().toLowerCase());
      const matchesMessage = !messageQuery.trim() || conversationText.includes(messageQuery.trim().toLowerCase());
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
      setThreadQuery("");
      setPendingReplyImage(null);
      setReplyFeedback("");
    }
  }, [activeConversation?.id]);

  const visibleMessages = useMemo(() => {
    if (!activeConversation) {
      return [];
    }

    const query = threadQuery.trim().toLowerCase();

    if (!query) {
      return activeConversation.messages;
    }

    return activeConversation.messages.filter((item) => item.text.toLowerCase().includes(query));
  }, [activeConversation, threadQuery]);

  useEffect(() => {
    if (!activeConversation || !threadRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const element = threadRef.current;

      if (!element) {
        return;
      }

      element.scrollTop = element.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [activeConversation?.id, activeConversation?.updatedAt, visibleMessages.length]);

  async function handleReplyImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setReplyFeedback("이미지 파일만 첨부할 수 있습니다.");
      return;
    }

    try {
      setIsUploadingReplyImage(true);
      setReplyFeedback("");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error || "이미지 업로드에 실패했습니다.");
      }

      setPendingReplyImage({
        name: file.name || "image",
        url: result.url,
      });
    } catch (error) {
      setReplyFeedback(error instanceof Error ? error.message : "이미지 업로드 중 문제가 발생했습니다.");
    } finally {
      setIsUploadingReplyImage(false);
    }
  }

  async function handleReply() {
    if (!activeConversation || (!replyText.trim() && !pendingReplyImage?.url)) {
      setReplyFeedback("답장 내용 또는 이미지를 입력해주세요.");
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
          imageDataUrl: pendingReplyImage?.url,
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
      setPendingReplyImage(null);
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
            <span>채팅 내용</span>
            <input onChange={(event) => setMessageQuery(event.target.value)} placeholder="채팅 내용 검색" type="search" value={messageQuery} />
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
                  <th>상태</th>
                  <th>이름</th>
                  <th>연락처</th>
                  <th>주제</th>
                  <th>최근 메시지</th>
                  <th>업데이트</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((conversation, index) => {
                  const lastMessage = conversation.messages[conversation.messages.length - 1];
                  const lastMessagePreview = lastMessage?.text || (lastMessage?.imageDataUrl ? "이미지" : "-");
                  return (
                    <tr className="admin-table-row-clickable" key={conversation.id} onClick={() => setActiveId(conversation.id)}>
                      <td>{index + 1}</td>
                      <td className="inquiry-table-status-cell">
                        <span className={`admin-chat-status-badge ${getStatusClassName(conversation.status)}`}>
                          {getStatusLabel(conversation.status)}
                        </span>
                      </td>
                      <td>{conversation.name}</td>
                      <td>{conversation.phone}</td>
                      <td>{conversation.intent}</td>
                      <td className="inquiry-table-message">{lastMessagePreview}</td>
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
                </div>
              </article>

              <article className="admin-chat-section-card">
                <div className="admin-chat-section-head">
                  <span>대화 내역</span>
                  <strong>{formatDate(activeConversation.updatedAt)}</strong>
                </div>
                <input
                  className="site-chat-input admin-chat-search-input"
                  onChange={(event) => setThreadQuery(event.target.value)}
                  placeholder="채팅 내용 검색"
                  type="search"
                  value={threadQuery}
                />
                <div className="site-chat-thread admin-chat-thread" ref={threadRef}>
                  {visibleMessages.length ? visibleMessages.map((item) => (
                    <div
                      className={`site-chat-bubble ${item.sender === "admin" ? "site-chat-bubble-agent" : "site-chat-bubble-user"}`}
                      key={item.id}
                    >
                      <span className="site-chat-bubble-label">
                        {item.sender === "admin" ? "관리자" : activeConversation.name} · {formatDate(item.createdAt)}
                      </span>
                      {item.imageDataUrl ? (
                        <button
                          className="site-chat-image-link button-reset"
                          onClick={() => setExpandedImageUrl(item.imageDataUrl || "")}
                          type="button"
                        >
                          <img alt="첨부 이미지" className="site-chat-image" src={item.imageDataUrl} />
                        </button>
                      ) : null}
                      {item.text ? <span>{item.text}</span> : null}
                    </div>
                  )) : <p className="faq-empty-state admin-chat-search-empty">검색된 메시지가 없습니다.</p>}
                </div>
              </article>

              <article className="admin-chat-section-card admin-chat-reply-card">
                <div className="admin-chat-section-head">
                  <span>답장 보내기</span>
                </div>
                {pendingReplyImage ? (
                  <div className="site-chat-upload-pill admin-chat-upload-pill">
                    <a className="site-chat-upload-pill-name" href={pendingReplyImage.url} rel="noreferrer" target="_blank">
                      {pendingReplyImage.name}
                    </a>
                    <button
                      aria-label="첨부 이미지 제거"
                      className="site-chat-upload-pill-remove button-reset"
                      onClick={() => setPendingReplyImage(null)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                <input
                  accept="image/*"
                  className="site-chat-file-input"
                  onChange={handleReplyImageChange}
                  ref={replyFileInputRef}
                  type="file"
                />
                <textarea
                  className="site-chat-textarea"
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="메세지"
                  rows={4}
                  value={replyText}
                />
                <div className="admin-chat-reply-actions">
                  <button
                    className="site-chat-upload-pill button-reset admin-chat-attach-button"
                    onClick={() => replyFileInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingReplyImage ? "업로드 중..." : "이미지 첨부"}
                  </button>
                </div>
                {replyFeedback ? <p className={`site-chat-feedback ${replyFeedback.includes("실패") || replyFeedback.includes("입력") ? "is-error" : "is-success"}`}>{replyFeedback}</p> : null}
                <button className="site-chat-primary" disabled={isReplying || isUploadingReplyImage} onClick={handleReply} type="button">
                  {isReplying ? "보내는 중..." : "답장 보내기"}
                </button>
              </article>
            </div>
          </div>
        </div>
      ) : null}

      {expandedImageUrl ? (
        <div className="site-chat-policy-backdrop is-open site-chat-image-backdrop" onClick={() => setExpandedImageUrl("")} role="presentation">
          <div aria-modal="true" className="site-chat-image-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <button
              aria-label="이미지 닫기"
              className="site-chat-close site-chat-image-close"
              onClick={() => setExpandedImageUrl("")}
              type="button"
            >
              ×
            </button>
            <img alt="확대 이미지" className="site-chat-image-preview" src={expandedImageUrl} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
