"use client";

import { ChangeEvent, ClipboardEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type { ChatConversation } from "@/lib/chat-inbox";
import { compressClientImage } from "@/lib/client-image";
import type { ChatWidgetSettings } from "@/lib/site-content";

type SubmitState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

type SiteChatWidgetProps = {
  config: ChatWidgetSettings;
  privacyPolicy: string;
};

const STORAGE_KEY = "studio_by_you_chat_session";
const ACTIVE_POLL_MS = 800;
const IDLE_POLL_MS = 2500;

type StoredSession = {
  conversationId?: string;
  intent?: string;
  name?: string;
  phone?: string;
  conversation?: ChatConversation | null;
};

type PendingImage = {
  name: string;
  dataUrl: string;
};

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "방금";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function SiteChatWidget({ config, privacyPolicy }: SiteChatWidgetProps) {
  const pathname = usePathname();
  const quickActions = useMemo(
    () => (config.quickActions.length ? config.quickActions : ["빠른 문의"]),
    [config.quickActions],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [intent, setIntent] = useState(quickActions[0] ?? "빠른 문의");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const composeRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const hasActiveConversation = Boolean(conversation || conversationId);
  const messageCount = conversation?.messages.length ?? 0;
  const activeName = isEditingContact ? editingName : name;
  const activePhone = isEditingContact ? editingPhone : phone;
  const trimmedName = activeName.trim();
  const trimmedPhone = activePhone.trim();
  const trimmedMessage = message.trim();
  const canSubmit = hasActiveConversation
    ? Boolean(trimmedMessage || pendingImage)
    : Boolean(trimmedName && trimmedPhone && (trimmedMessage || pendingImage));
  const intentOptions = useMemo(() => {
    if (!intent || quickActions.includes(intent)) {
      return quickActions;
    }

    return [...quickActions, intent];
  }, [intent, quickActions]);

  useEffect(() => {
    setIntent((current) => current || (quickActions[0] ?? "빠른 문의"));
  }, [quickActions]);

  if (pathname?.startsWith("/studiobyyou") || pathname?.startsWith("/portfolio/studio")) {
    return null;
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as StoredSession;

      if (parsed.conversationId) setConversationId(parsed.conversationId);
      if (parsed.intent) setIntent(parsed.intent);
      if (parsed.name) setName(parsed.name);
      if (parsed.phone) setPhone(parsed.phone);
      if (parsed.name) setEditingName(parsed.name);
      if (parsed.phone) setEditingPhone(parsed.phone);
      if (parsed.conversation) {
        setConversation(parsed.conversation);
        setAcceptedPrivacy(Boolean(parsed.conversation.consentAcceptedAt));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    function handleOpenChat(event: Event) {
      const customEvent = event as CustomEvent<{ intent?: string }>;
      const nextIntent = customEvent.detail?.intent?.trim();

      if (nextIntent) {
        setIntent(nextIntent);
        persistSession(conversationId, nextIntent, name, phone, conversation);
      }

      setIsOpen(true);
      setSubmitState({ kind: "idle" });
    }

    window.addEventListener("studio-by-you:open-chat", handleOpenChat);

    return () => {
      window.removeEventListener("studio-by-you:open-chat", handleOpenChat);
    };
  }, [conversation, conversationId, name, phone]);

  useEffect(() => {
    if (!isOpen || !threadRef.current) {
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
  }, [isOpen, messageCount]);

  useEffect(() => {
    if (!isOpen || !pendingImage) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      composeRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen, pendingImage]);

  useEffect(() => {
    if (!conversationId || !isOpen || isSubmitting) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let isRefreshing = false;

    function scheduleNextPoll(delay: number) {
      if (cancelled) {
        return;
      }

      timer = setTimeout(() => {
        void loadConversation();
      }, delay);
    }

    async function loadConversation(force = false) {
      if (cancelled || (isRefreshing && !force)) {
        return;
      }

      isRefreshing = true;

      try {
        const response = await fetch(`/api/widget-inquiry?conversationId=${encodeURIComponent(conversationId)}`, {
          cache: "no-store",
        });

        if (response.status === 404) {
          if (!cancelled) {
            setConversation(null);
            setConversationId("");
            setAcceptedPrivacy(false);
            setIsEditingContact(false);
            persistSession("", intent, name, phone, null);
          }
          return;
        }

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as { conversation?: ChatConversation };
        if (!cancelled && result.conversation) {
          const storedRaw = window.localStorage.getItem(STORAGE_KEY);
          let storedName = "";
          let storedPhone = "";

          if (storedRaw) {
            try {
              const stored = JSON.parse(storedRaw) as StoredSession;
              storedName = stored.name?.trim() ?? "";
              storedPhone = stored.phone?.trim() ?? "";
            } catch {}
          }

          const nextConversation = {
            ...result.conversation,
            name: storedName || result.conversation.name,
            phone: storedPhone || result.conversation.phone,
          };

          setConversation(nextConversation);
          setIntent(nextConversation.intent);
          setName(nextConversation.name);
          setPhone(nextConversation.phone);
          if (!isEditingContact) {
            setEditingName(nextConversation.name);
            setEditingPhone(nextConversation.phone);
          }
          setAcceptedPrivacy(Boolean(nextConversation.consentAcceptedAt));
          persistSession(
            nextConversation.id,
            nextConversation.intent,
            nextConversation.name,
            nextConversation.phone,
            nextConversation,
          );
        }
      } finally {
        isRefreshing = false;
        scheduleNextPoll(document.hidden ? IDLE_POLL_MS : ACTIVE_POLL_MS);
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        void loadConversation(true);
      }
    }

    void loadConversation(true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [conversationId, isEditingContact, isOpen, isSubmitting]);

  function persistSession(
    nextConversationId: string,
    nextIntent: string,
    nextName: string,
    nextPhone: string,
    nextConversation?: ChatConversation | null,
  ) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        conversationId: nextConversationId,
        intent: nextIntent,
        name: nextName,
        phone: nextPhone,
        conversation: nextConversation ?? null,
      }),
    );
  }

  async function submitMessage(options?: { imageDataUrl?: string; messageOverride?: string }) {
    if (isSubmitting) {
      return;
    }

    const nextMessage = options?.messageOverride ?? messageInputRef.current?.value ?? message;
    const nextImageDataUrl = options?.imageDataUrl ?? pendingImage?.dataUrl ?? "";
    const activeDraftName = isEditingContact ? editingName : nameInputRef.current?.value ?? name;
    const activeDraftPhone = isEditingContact ? editingPhone : phoneInputRef.current?.value ?? phone;
    const trimmedName = activeDraftName.trim();
    const trimmedPhone = activeDraftPhone.trim();

    if (!trimmedName || !trimmedPhone || (!nextMessage.trim() && !nextImageDataUrl)) {
      setSubmitState({ kind: "error", message: "이름, 연락처와 문의 내용 또는 이미지를 입력해주세요." });
      return;
    }

    const previousConversation = conversation;
    const previousMessage = message;
    const previousPendingImage = pendingImage;
    const optimisticMessage = {
      id: `local-${Date.now()}`,
      sender: "user" as const,
      text: nextMessage,
      imageDataUrl: nextImageDataUrl || undefined,
      createdAt: new Date().toISOString(),
    };
    const optimisticConversation = conversation
      ? {
          ...conversation,
          name: trimmedName,
          phone: trimmedPhone,
          updatedAt: optimisticMessage.createdAt,
          messages: [...conversation.messages, optimisticMessage],
        }
      : {
          id: "pending",
          createdAt: optimisticMessage.createdAt,
          updatedAt: optimisticMessage.createdAt,
          intent,
          name: trimmedName,
          phone: trimmedPhone,
          source: "widget" as const,
          status: "new" as const,
          consentAcceptedAt: optimisticMessage.createdAt,
          messages: [optimisticMessage],
        };

    setConversation(optimisticConversation);
    setMessage("");
    setPendingImage(null);
    setIsSubmitting(true);
    setSubmitState({ kind: "idle" });

    try {
      const response = await fetch("/api/widget-inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          intent,
          name: trimmedName,
          phone: trimmedPhone,
          message: nextMessage,
          imageDataUrl: nextImageDataUrl,
          acceptedPrivacy: conversation ? acceptedPrivacy : true,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        conversation?: ChatConversation;
        conversationId?: string;
        message?: string;
      };

      if (!response.ok || !result.conversation || !result.conversationId) {
        throw new Error(result.message || "메시지 전송에 실패했습니다.");
      }

      setConversation(result.conversation);
      setConversationId(result.conversationId);
      setAcceptedPrivacy(Boolean(result.conversation.consentAcceptedAt));
      persistSession(result.conversationId, intent, result.conversation.name, result.conversation.phone, result.conversation);
      setSubmitState({ kind: "success", message: result.message || "메시지를 보냈습니다." });
    } catch (error) {
      setConversation(previousConversation);
      setMessage(previousMessage);
      setPendingImage(previousPendingImage);
      setSubmitState({
        kind: "error",
        message: error instanceof Error ? error.message : "메시지 전송 중 문제가 발생했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setSubmitState({ kind: "error", message: "이미지 파일만 첨부할 수 있습니다." });
      return;
    }

    try {
      const nextImage = await compressClientImage(file, 960, 0.62, true);
      setPendingImage({
        name: file.name || "image.jpg",
        dataUrl: nextImage,
      });
      setSubmitState({ kind: "idle" });
    } catch {
      setSubmitState({ kind: "error", message: "이미지 첨부에 실패했습니다. 다시 시도해주세요." });
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    await uploadImageFile(file);
  }

  async function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(event.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();
    await uploadImageFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage();
  }

  async function handleContactSave() {
    const nextName = editingName.trim().slice(0, 10);
    const nextPhone = formatPhoneInput(editingPhone);
    const resolvedConversationId = conversationId || (conversation && conversation.id !== "pending" ? conversation.id : "");
    const currentName = name.trim();
    const currentPhone = phone.trim();

    if (!nextName || !nextPhone) {
      setSubmitState({ kind: "error", message: "이름과 연락처를 모두 입력해주세요." });
      return;
    }

    if (nextName === currentName && nextPhone === currentPhone) {
      setEditingName(currentName);
      setEditingPhone(currentPhone);
      setIsEditingContact(false);
      setSubmitState({ kind: "idle" });
      return;
    }

    if (!conversation || !resolvedConversationId) {
      setSubmitState({ kind: "error", message: "채팅방이 준비된 뒤 다시 저장해주세요." });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/widget-inquiry", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: resolvedConversationId,
          name: nextName,
          phone: nextPhone,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        conversation?: ChatConversation;
        message?: string;
      };

      if (!response.ok || !result.conversation) {
        throw new Error(result.message || "입력 정보 저장에 실패했습니다.");
      }

      setConversation(result.conversation);
      setName(result.conversation.name);
      setPhone(result.conversation.phone);
      setEditingName(result.conversation.name);
      setEditingPhone(result.conversation.phone);
      persistSession(result.conversation.id, intent, result.conversation.name, result.conversation.phone, result.conversation);
      setSubmitState({ kind: "success", message: result.message || "입력 정보를 저장했습니다." });
      setIsEditingContact(false);
    } catch (error) {
      setSubmitState({
        kind: "error",
        message: error instanceof Error ? error.message : "입력 정보 저장 중 문제가 발생했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="site-chat-widget-root">
        {isOpen ? (
          <div className="site-chat-panel is-open" role="dialog" aria-label="빠른 상담 위젯">
          <div className="site-chat-panel-head">
            <div className="site-chat-panel-brand">
              <img alt={config.panelTitle} className="site-chat-panel-logo" src="/home-assets/chahup_logo.png" />
            </div>
            <button
              aria-label="상담 위젯 닫기"
              className="site-chat-close"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="site-chat-panel-body">
            <div className="site-chat-thread" ref={threadRef}>
              {!hasActiveConversation ? (
                <>
                  <div className="site-chat-notice-card">응답이 늦어질 경우 작성하신 연락처로 답변드릴 수 있습니다.</div>
                  <div className="site-chat-bubble site-chat-bubble-agent">안녕하세요. 문의사항을 편하게 남겨주세요 ☺️</div>
                </>
              ) : (
                <>
                  <div className="site-chat-bubble site-chat-bubble-agent">안녕하세요. 문의사항을 편하게 남겨주세요 ☺️</div>
                  {conversation ? (
                    <>
                      <div className="site-chat-summary-card">
                        <div className="site-chat-summary-head">
                          <span className="site-chat-summary-badge">내가 입력한 정보</span>
                          <button
                            className="site-chat-summary-action button-reset"
                            disabled={isSubmitting}
                            onClick={() => {
                              if (isEditingContact) {
                                void handleContactSave();
                                return;
                              }

                              setEditingName(conversation?.name || name);
                              setEditingPhone(conversation?.phone || phone);
                              setIsEditingContact(true);
                            }}
                            type="button"
                          >
                            {isEditingContact ? "저장" : "수정"}
                          </button>
                        </div>
                        <div className="site-chat-summary-grid">
                          <div className="site-chat-summary-item">
                            <span className="site-chat-summary-label">이름</span>
                            <input
                              className={`site-chat-summary-input${isEditingContact ? " is-editing" : ""}`}
                              maxLength={10}
                              onChange={(event) => setEditingName(event.target.value.slice(0, 10))}
                              readOnly={!isEditingContact}
                              value={isEditingContact ? editingName : name}
                            />
                          </div>
                          <div className="site-chat-summary-item">
                            <span className="site-chat-summary-label">연락처</span>
                            <input
                              className={`site-chat-summary-input${isEditingContact ? " is-editing" : ""}`}
                              inputMode="numeric"
                              maxLength={13}
                              onChange={(event) => setEditingPhone(formatPhoneInput(event.target.value))}
                              readOnly={!isEditingContact}
                              value={isEditingContact ? editingPhone : phone}
                            />
                          </div>
                        </div>
                      </div>
                      {conversation.messages.map((item) => (
                        <div
                          className={`site-chat-bubble ${item.sender === "admin" ? "site-chat-bubble-agent" : "site-chat-bubble-user"}`}
                          key={item.id}
                        >
                          <span className="site-chat-bubble-label">
                            {item.sender === "admin" ? config.panelTitle : "나"} · {formatTime(item.createdAt)}
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
                      ))}
                    </>
                  ) : null}
                </>
              )}
            </div>

            {!hasActiveConversation ? (
              <div className="site-chat-chip-row" aria-label="문의 주제 선택">
                {intentOptions.map((item) => (
                  <button
                    key={item}
                    className={`site-chat-chip${item === intent ? " is-active" : ""}`}
                    onClick={() => setIntent(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}

            <form className="site-chat-form" onSubmit={handleSubmit}>
              {!hasActiveConversation ? (
                <>
                  <input
                    className="site-chat-input"
                    maxLength={10}
                    onChange={(event) => setName(event.target.value.slice(0, 10))}
                    onInput={(event) => setName((event.target as HTMLInputElement).value.slice(0, 10))}
                    placeholder="이름"
                    ref={nameInputRef}
                    value={name}
                  />
                  <input
                    className="site-chat-input"
                    inputMode="numeric"
                    maxLength={13}
                    onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                    onInput={(event) => setPhone(formatPhoneInput((event.target as HTMLInputElement).value))}
                    placeholder="연락처"
                    ref={phoneInputRef}
                    value={phone}
                  />
                </>
              ) : null}
              <div className="site-chat-compose" ref={composeRef}>
                {pendingImage ? (
                  <div className="site-chat-upload-pill">
                    <span className="site-chat-upload-pill-name">{pendingImage.name}</span>
                    <button
                      aria-label="첨부 이미지 제거"
                      className="site-chat-upload-pill-remove button-reset"
                      onClick={() => setPendingImage(null)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                <textarea
                  className="site-chat-textarea"
                  onChange={(event) => setMessage(event.target.value)}
                  onInput={(event) => setMessage((event.target as HTMLTextAreaElement).value)}
                  onPaste={(event) => void handlePaste(event)}
                  placeholder="메세지"
                  ref={messageInputRef}
                  rows={4}
                  value={message}
                />

                {hasActiveConversation ? (
                  <>
                    <input
                      accept="image/*"
                      className="site-chat-file-input"
                      onChange={handleImageChange}
                      ref={fileInputRef}
                      type="file"
                    />
                    <button className="site-chat-upload-icon button-reset" onClick={() => fileInputRef.current?.click()} type="button">
                      <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
                        <path
                          d="M4.167 5.833A1.667 1.667 0 0 1 5.833 4.167h8.334a1.667 1.667 0 0 1 1.666 1.666v8.334a1.667 1.667 0 0 1-1.666 1.666H5.833a1.667 1.667 0 0 1-1.666-1.666V5.833Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M7.083 8.333a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM15 12.083l-2.838-2.837a.833.833 0 0 0-1.178 0L6.667 13.562"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                        <path
                          d="m9.583 15 1.924-1.924a.833.833 0 0 1 1.178 0L15 15"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </button>
                  </>
                ) : null}
              </div>

              {!hasActiveConversation ? (
                <p className="site-chat-consent-copy">
                  <button
                    className="site-chat-policy-inline button-reset"
                    onClick={() => setIsPrivacyModalOpen(true)}
                    type="button"
                  >
                    개인정보처리방침
                  </button>
                  <span>에 동의하셔야 채팅이 가능합니다.</span>
                </p>
              ) : null}

              {submitState.kind === "error" ? <p className="site-chat-feedback is-error">{submitState.message}</p> : null}

              <button className="site-chat-primary" disabled={isSubmitting || !canSubmit} type="submit">
                {isSubmitting ? "보내는 중..." : "메세지 보내기"}
              </button>
            </form>
          </div>
          </div>
        ) : null}

        <button
          aria-expanded={isOpen}
          aria-label="상담 위젯 열기"
          className={`site-chat-launcher${isOpen ? " is-open" : ""}`}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="site-chat-launcher-icon">
            <img alt="" aria-hidden="true" className="site-chat-launcher-logo" src="/home-assets/chahupsymbol.png" />
          </span>
        </button>
      </div>
      {isMounted
        ? createPortal(
            <PrivacyPolicyModal
              isOpen={isPrivacyModalOpen}
              onClose={() => setIsPrivacyModalOpen(false)}
              privacyPolicy={privacyPolicy}
            />,
            document.body,
          )
        : null}
      {isMounted && expandedImageUrl
        ? createPortal(
            <ImagePreviewModal imageUrl={expandedImageUrl} onClose={() => setExpandedImageUrl("")} />,
            document.body,
          )
        : null}
    </>
  );
}

function PrivacyPolicyModal({
  isOpen,
  onClose,
  privacyPolicy,
}: {
  isOpen: boolean;
  onClose: () => void;
  privacyPolicy: string;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="site-chat-policy-backdrop is-open" onClick={onClose} role="presentation">
      <div aria-modal="true" className="site-chat-policy-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="site-chat-policy-head">
          <div>
            <strong>개인정보처리방침</strong>
            <p>채팅 문의 전에 수집 항목과 이용 목적을 확인해주세요.</p>
          </div>
          <button className="site-chat-close" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="site-chat-policy-copy">
          {privacyPolicy.split("\n").map((line, index) => (
            <p key={`privacy-line-${index}`}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImagePreviewModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string;
  onClose: () => void;
}) {
  return (
    <div className="site-chat-policy-backdrop is-open site-chat-image-backdrop" onClick={onClose} role="presentation">
      <div aria-modal="true" className="site-chat-image-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="이미지 닫기" className="site-chat-close site-chat-image-close" onClick={onClose} type="button">
          ×
        </button>
        <img alt="확대 이미지" className="site-chat-image-preview" src={imageUrl} />
      </div>
    </div>
  );
}
