"use client";

import { useActionState, useEffect, useState } from "react";
import { submitContactInquiryAction } from "@/app/contact/actions";
import { compressClientImageFile } from "@/lib/client-image";

type ContactFormProps = {
  email: string;
  headline: string;
  plans: Array<{
    name: string;
    price: string;
    description: string;
  }>;
  privacyPolicy: string;
};

const serviceTypes = ["홈페이지", "관리자 페이지", "나만의 기능 개발", "앱서비스", "유료 솔루션"] as const;

export function ContactForm({ email, headline, plans, privacyPolicy }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(submitContactInquiryAction, undefined);
  const [activePlan, setActivePlan] = useState(plans[0]?.name ?? "Standard");
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["홈페이지"]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!state?.success) {
      return;
    }

    setSelectedTypes(["홈페이지"]);
    setMessage("");
    setName("");
    setPhone("");
    setAttachments([]);
  }, [state?.success]);

  useEffect(() => {
    if (state?.success) {
      setToast({ kind: "success", message: state.success });
      return;
    }

    if (state?.error) {
      setToast({ kind: "error", message: state.error });
    }
  }, [state]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function toggleType(type: string) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  const isSubmitReady =
    Boolean(activePlan) &&
    selectedTypes.length > 0 &&
    (message.trim().length > 0 || attachments.length > 0) &&
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    !isUploadingImages;

  async function handleAttachmentChange(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const nextFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const availableCount = Math.max(0, 10 - attachments.length);

    if (!availableCount) {
      alert("이미지는 최대 10장까지 첨부할 수 있습니다.");
      return;
    }

    try {
      setIsUploadingImages(true);
      const uploadedImages = await Promise.all(
        nextFiles.slice(0, availableCount).map(async (file) => {
          const compressedFile = await compressClientImageFile(file, { maxWidth: 1800, quality: 0.88 });
          const formData = new FormData();
          formData.append("file", compressedFile);
          const response = await fetch("/api/contact-upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error || "이미지 업로드에 실패했습니다.");
          }

          const payload = (await response.json()) as { url: string };
          return payload.url;
        }),
      );
      setAttachments((current) => [...current, ...uploadedImages].slice(0, 10));
    } catch (error) {
      alert(error instanceof Error ? error.message : "이미지 첨부 중 문제가 발생했습니다.");
    } finally {
      setIsUploadingImages(false);
    }
  }

  return (
    <>
      {toast ? (
        <div className="floating-toast-overlay" role="status" aria-live="polite">
          <div className={`floating-toast floating-toast-${toast.kind}`}>{toast.message}</div>
        </div>
      ) : null}

      <section className="contact-reference-shell">
        <div className="contact-reference-copy reveal-on-load">
          <h1>문의하기</h1>
          <span>{headline}</span>
          <span className="contact-reference-email">{email}</span>
        </div>

        <form action={formAction} className="contact-reference-form reveal-on-load" style={{ animationDelay: "0.25s" }}>
          <input name="plan" type="hidden" value={activePlan} />
          {selectedTypes.map((type) => (
            <input key={type} name="serviceTypes" type="hidden" value={type} />
          ))}
          {attachments.map((attachment, index) => (
            <input key={`${attachment.slice(0, 32)}-${index}`} name="attachments" type="hidden" value={attachment} />
          ))}

          <div className="contact-form-row">
            <strong>요금제</strong>
            <div className="contact-plan-grid">
              {plans.map((plan) => (
                <div
                  className="contact-plan-item"
                  key={plan.name}
                  onMouseEnter={() => setHoveredPlan(plan.name)}
                  onMouseLeave={() => setHoveredPlan(null)}
                >
                  <div
                    className={`contact-plan-tooltip${hoveredPlan === plan.name ? " is-visible" : ""}`}
                    role="tooltip"
                  >
                    <strong>{plan.price}</strong>
                    <span>{plan.description}</span>
                  </div>
                  <button
                    className={`contact-plan-button${activePlan === plan.name ? " is-active" : ""}`}
                    key={plan.name}
                    onBlur={() => setHoveredPlan(null)}
                    onClick={() => setActivePlan(plan.name)}
                    type="button"
                  >
                    {plan.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="contact-form-row">
            <strong>서비스 유형</strong>
            <div className="contact-service-grid">
              {serviceTypes.map((type) => (
                <label className="contact-check-item" key={type}>
                  <input
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                    type="checkbox"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="contact-form-row">
            <strong>문의 내용</strong>
            <div className="contact-form-attachment-stack">
              <textarea
                className="contact-textarea"
                name="message"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="희망 서비스 / 기간 / 요구사항을 작성해 주세요."
                rows={10}
                value={message}
              />
              <div className="contact-attachment-row">
                <label className="contact-attachment-button">
                  {isUploadingImages ? "이미지 처리 중..." : "이미지 첨부"}
                  <input
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void handleAttachmentChange(event.target.files);
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                </label>
                <span className="contact-attachment-note">최대 10장까지 첨부할 수 있어요.</span>
              </div>
              {attachments.length ? (
                <div className="contact-attachment-grid">
                  {attachments.map((attachment, index) => (
                    <div className="contact-attachment-card" key={`${attachment.slice(0, 32)}-${index}`}>
                      <button
                        className="contact-attachment-preview button-reset"
                        onClick={() => setActiveAttachment(attachment)}
                        type="button"
                      >
                        <img alt={`첨부 이미지 ${index + 1}`} src={attachment} />
                      </button>
                      <button
                        aria-label={`첨부 이미지 ${index + 1} 삭제`}
                        className="contact-attachment-remove button-reset"
                        onClick={() => setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="contact-form-row">
            <strong>담당자</strong>
            <div className="contact-input-stack">
              <input
                name="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="담당자 이름"
                value={name}
              />
              <input
                name="phone"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="담당자 휴대폰번호"
                value={phone}
              />
            </div>
          </div>

          <div className="contact-form-submit">
            <p className="contact-policy-consent">
              <button
                className="contact-policy-link button-reset"
                onClick={() => setIsPrivacyOpen(true)}
                type="button"
              >
                개인정보처리방침
              </button>
              <span>에 동의하셔야 문의 등록이 가능합니다.</span>
            </p>
            <button
              className={`contact-submit-button button-reset${isSubmitReady ? " is-ready" : ""}`}
              disabled={pending || isUploadingImages}
              type="submit"
            >
              {pending ? "등록 중..." : isUploadingImages ? "이미지 처리 중..." : "동의 후 문의 등록"}
            </button>
          </div>
        </form>
      </section>

      {isPrivacyOpen ? (
        <div className="portfolio-modal-backdrop" onClick={() => setIsPrivacyOpen(false)} role="presentation">
          <div
            aria-modal="true"
            className="portfolio-modal contact-policy-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="portfolio-modal-head">
              <div>
                <p>Privacy Policy</p>
                <h2>개인정보처리방침</h2>
              </div>
              <button
                aria-label="개인정보처리방침 닫기"
                className="portfolio-modal-close button-reset"
                onClick={() => setIsPrivacyOpen(false)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="contact-policy-copy">
              {privacyPolicy.split("\n").map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
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
            <img alt="첨부 이미지 크게 보기" src={activeAttachment} />
          </div>
        </div>
      ) : null}
    </>
  );
}
