"use client";

import { useActionState, useState, useEffect } from "react";
import { updateContentAction } from "@/app/admin/actions";
import { isVideoSrc, uploadImageFile, uploadMediaFile } from "@/lib/client-upload";
import { ChatInquiryManager } from "@/app/admin/chat-inquiry-manager";
import { ContactInquiryManager } from "@/app/admin/contact-inquiry-manager";
import { FaqManager } from "@/app/admin/faq-manager";
import { PortfolioManager } from "@/app/admin/portfolio-manager";
import { PricingManager } from "@/app/admin/pricing-manager";
import { ProcessManager } from "@/app/admin/process-manager";
import { ServiceManager } from "@/app/admin/service-manager";
import type { ChatConversation } from "@/lib/chat-inbox";
import type { SiteContent } from "@/lib/site-content";

type ContentFormProps = {
  chatInquiries: ChatConversation[];
  content: SiteContent;
};

const tabs = [
  { id: "brand", label: "기본 정보" },
  { id: "portfolio", label: "포트폴리오" },
  { id: "services", label: "솔루션" },
  { id: "process", label: "진행 방식" },
  { id: "pricing", label: "요금" },
  { id: "faq", label: "FAQ" },
  { id: "chat", label: "채팅" },
  { id: "contact", label: "문의" },
] as const;

type TabId = (typeof tabs)[number]["id"];
const HERO_FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72] as const;
const HERO_FONT_WEIGHTS = ["200", "300", "400", "500", "600", "700", "800"] as const;

function ImagePreview({ alt, src }: { alt: string; src: string }) {
  return (
    <div className="upload-preview">
      {isVideoSrc(src) ? (
        <video autoPlay loop muted playsInline src={src} />
      ) : (
        <img alt={alt} src={src} />
      )}
    </div>
  );
}

export function ContentForm({ chatInquiries, content }: ContentFormProps) {
  const [state, formAction, pending] = useActionState(updateContentAction, undefined);
  const [activeTab, setActiveTab] = useState<TabId>("brand");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [heroMediaUrl, setHeroMediaUrl] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState("");
  const [heroMediaFileName, setHeroMediaFileName] = useState("");
  const [brandTagline, setBrandTagline] = useState(content.brand.tagline);
  const [heroTitle, setHeroTitle] = useState(content.hero.title);
  const [heroDescription, setHeroDescription] = useState(content.hero.description);
  const [heroMediaPositionX, setHeroMediaPositionX] = useState(content.hero.mediaPositionX ?? 50);
  const [heroMediaPositionY, setHeroMediaPositionY] = useState(content.hero.mediaPositionY ?? 50);
  const [heroMediaScale, setHeroMediaScale] = useState(content.hero.mediaScale ?? 100);
  const [heroTaglineFontSize, setHeroTaglineFontSize] = useState(content.hero.taglineFontSize ?? 14);
  const [heroTaglineFontWeight, setHeroTaglineFontWeight] = useState(content.hero.taglineFontWeight ?? "700");
  const [heroTitleFontSize, setHeroTitleFontSize] = useState(content.hero.titleFontSize ?? 62);
  const [heroTitleFontWeight, setHeroTitleFontWeight] = useState(content.hero.titleFontWeight ?? "700");
  const [heroDescriptionFontSize, setHeroDescriptionFontSize] = useState(content.hero.descriptionFontSize ?? 15);
  const [heroDescriptionFontWeight, setHeroDescriptionFontWeight] = useState(content.hero.descriptionFontWeight ?? "500");
  const [chatQuickActions, setChatQuickActions] = useState(() => content.chatWidget.quickActions);
  const [isPortfolioSettingsOpen, setIsPortfolioSettingsOpen] = useState(false);
  const [isProcessSettingsOpen, setIsProcessSettingsOpen] = useState(false);
  const [isPricingSettingsOpen, setIsPricingSettingsOpen] = useState(false);
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (state?.success) {
      setLogoDataUrl(null);
      setHeroMediaUrl(null);
      setLogoFileName("");
      setHeroMediaFileName("");
    }
  }, [state?.success]);

  useEffect(() => {
    setHeroMediaPositionX(content.hero.mediaPositionX ?? 50);
    setHeroMediaPositionY(content.hero.mediaPositionY ?? 50);
    setHeroMediaScale(content.hero.mediaScale ?? 100);
    setBrandTagline(content.brand.tagline);
    setHeroTitle(content.hero.title);
    setHeroDescription(content.hero.description);
    setHeroTaglineFontSize(content.hero.taglineFontSize ?? 14);
    setHeroTaglineFontWeight(content.hero.taglineFontWeight ?? "700");
    setHeroTitleFontSize(content.hero.titleFontSize ?? 62);
    setHeroTitleFontWeight(content.hero.titleFontWeight ?? "700");
    setHeroDescriptionFontSize(content.hero.descriptionFontSize ?? 15);
    setHeroDescriptionFontWeight(content.hero.descriptionFontWeight ?? "500");
  }, [
    content.brand.tagline,
    content.hero.title,
    content.hero.description,
    content.hero.mediaPositionX,
    content.hero.mediaPositionY,
    content.hero.mediaScale,
    content.hero.taglineFontSize,
    content.hero.taglineFontWeight,
    content.hero.titleFontSize,
    content.hero.titleFontWeight,
    content.hero.descriptionFontSize,
    content.hero.descriptionFontWeight,
  ]);

  useEffect(() => {
    setChatQuickActions(content.chatWidget.quickActions);
  }, [content.chatWidget.quickActions]);

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

  return (
    <>
      {toast ? (
        <div className="floating-toast-overlay" role="status" aria-live="polite">
          <div className={`floating-toast floating-toast-${toast.kind}`}>{toast.message}</div>
        </div>
      ) : null}

      <form className="content-form" action={formAction}>
        <div className="admin-editor-layout">
        <aside className="editor-sidebar">
          <div className="editor-sidebar-head">
            <p className="section-label">Editor</p>
            <h3>관리 메뉴</h3>
          </div>

          <div className="editor-tabs editor-tabs-sidebar" role="tablist" aria-label="콘텐츠 탭">
            {tabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={`editor-tab editor-tab-sidebar${activeTab === tab.id ? " is-active" : ""}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="editor-main">

      <section className={`dashboard-panel editor-section${activeTab === "brand" ? " is-visible" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="section-label">Brand</p>
            <h3>브랜드와 메인 히어로</h3>
          </div>
        </div>
        <div className="form-grid brand-settings-grid">
          <div className="brand-logo-row">
            <div className="upload-copy">
              <strong>브랜드 로고</strong>
            </div>
            <div className="brand-logo-upload-row brand-logo-upload-row-compact">
              <div className="upload-preview upload-preview-tiny">
                <img alt="브랜드 로고" src={logoDataUrl ?? content.brand.logo} />
              </div>
              {logoDataUrl && <input name="brandLogo" type="hidden" value={logoDataUrl} />}
              <div className="file-input-stack file-input-stack-inline">
                <input
                  accept="image/*"
                  id="brand-logo-input"
                  className="file-input"
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLogoFileName(file.name);
                    e.target.value = "";
                    try {
                      const url = await uploadImageFile(file);
                      setLogoDataUrl(url);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "업로드 실패");
                    }
                  }}
                />
                <label className="file-input-button" htmlFor="brand-logo-input">파일 선택</label>
                <span className="file-input-name">{logoFileName || "선택된 파일 없음"}</span>
              </div>
            </div>
          </div>
          <div className="full-width hero-field-row">
            <label className="hero-field-input">
              <span>태그라인</span>
              <input name="brandTagline" onChange={(event) => setBrandTagline(event.target.value)} value={brandTagline} required />
            </label>
            <label>
              <span>크기</span>
              <select name="heroTaglineFontSize" onChange={(event) => setHeroTaglineFontSize(Number(event.target.value))} value={heroTaglineFontSize}>
                {HERO_FONT_SIZES.map((size) => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
            </label>
            <label>
              <span>두께</span>
              <select name="heroTaglineFontWeight" onChange={(event) => setHeroTaglineFontWeight(event.target.value)} value={heroTaglineFontWeight}>
                {HERO_FONT_WEIGHTS.map((weight) => (
                  <option key={weight} value={weight}>{weight}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="full-width hero-field-row">
            <label className="hero-field-input">
              <span>메인 제목</span>
              <input name="heroTitle" onChange={(event) => setHeroTitle(event.target.value)} value={heroTitle} required />
            </label>
            <label>
              <span>크기</span>
              <select name="heroTitleFontSize" onChange={(event) => setHeroTitleFontSize(Number(event.target.value))} value={heroTitleFontSize}>
                {HERO_FONT_SIZES.map((size) => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
            </label>
            <label>
              <span>두께</span>
              <select name="heroTitleFontWeight" onChange={(event) => setHeroTitleFontWeight(event.target.value)} value={heroTitleFontWeight}>
                {HERO_FONT_WEIGHTS.map((weight) => (
                  <option key={weight} value={weight}>{weight}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="full-width hero-field-row">
            <label className="hero-field-input">
              <span>메인 설명</span>
              <input
                name="heroDescription"
                onChange={(event) => setHeroDescription(event.target.value)}
                placeholder="설명이 없으면 비워둘 수 있어요."
                value={heroDescription}
              />
            </label>
            <label>
              <span>크기</span>
              <select name="heroDescriptionFontSize" onChange={(event) => setHeroDescriptionFontSize(Number(event.target.value))} value={heroDescriptionFontSize}>
                {HERO_FONT_SIZES.map((size) => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
            </label>
            <label>
              <span>두께</span>
              <select name="heroDescriptionFontWeight" onChange={(event) => setHeroDescriptionFontWeight(event.target.value)} value={heroDescriptionFontWeight}>
                {HERO_FONT_WEIGHTS.map((weight) => (
                  <option key={weight} value={weight}>{weight}</option>
                ))}
              </select>
            </label>
          </div>
              <div className="brand-logo-row full-width">
                <div className="upload-copy">
                  <strong>메인 히어로 미디어</strong>
                  <span>이미지 또는 mp4/webm/mov</span>
                </div>
                <div className="brand-logo-upload-row brand-logo-upload-row-media">
                  <div
                    style={{
                      width: 72,
                      minHeight: 72,
                      borderRadius: 18,
                      overflow: "hidden",
                    }}
                  >
                    <div className="upload-preview upload-preview-compact">
                      {isVideoSrc(heroMediaUrl ?? content.hero.media ?? "/home-assets/0330.mov") ? (
                        <video
                          autoPlay
                          loop
                          muted
                          playsInline
                          src={heroMediaUrl ?? content.hero.media ?? "/home-assets/0330.mov"}
                          style={{ objectPosition: `${heroMediaPositionX}% ${heroMediaPositionY}%` }}
                        />
                      ) : (
                        <img
                          alt="메인 히어로 미디어"
                          src={heroMediaUrl ?? content.hero.media ?? "/home-assets/0330.mov"}
                          style={{ objectPosition: `${heroMediaPositionX}% ${heroMediaPositionY}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <input name="heroMedia" type="hidden" value={heroMediaUrl ?? content.hero.media ?? "/home-assets/0330.mov"} />
                  <input name="heroMediaPositionX" type="hidden" value={heroMediaPositionX} />
                  <input name="heroMediaPositionY" type="hidden" value={heroMediaPositionY} />
                  <input name="heroMediaScale" type="hidden" value={heroMediaScale} />
                  <div className="file-input-stack file-input-stack-inline">
                    <input
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      id="hero-media-input"
                      className="file-input"
                      type="file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setHeroMediaFileName(file.name);
                        e.target.value = "";
                        try {
                          const url = file.type.startsWith("image/") ? await uploadImageFile(file) : await uploadMediaFile(file);
                          setHeroMediaUrl(url);
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "업로드 실패");
                        }
                      }}
                    />
                    <label className="file-input-button" htmlFor="hero-media-input">파일 선택</label>
                    <span className="file-input-name">{heroMediaFileName || "선택된 파일 없음"}</span>
                  </div>
                  <div className="hero-media-position-row">
                    <label className="hero-media-control">
                      <span>좌우 {heroMediaPositionX}%</span>
                      <input
                        max={100}
                        min={0}
                        onChange={(event) => setHeroMediaPositionX(Number(event.target.value))}
                        type="range"
                        value={heroMediaPositionX}
                      />
                    </label>
                    <label className="hero-media-control">
                      <span>상하 {heroMediaPositionY}%</span>
                      <input
                        max={100}
                        min={0}
                        onChange={(event) => setHeroMediaPositionY(Number(event.target.value))}
                        type="range"
                        value={heroMediaPositionY}
                      />
                    </label>
                    <label className="hero-media-control">
                      <span>확대 {heroMediaScale}%</span>
                      <input
                        max={180}
                        min={80}
                        onChange={(event) => setHeroMediaScale(Number(event.target.value))}
                        type="range"
                        value={heroMediaScale}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="full-width hero-admin-live-preview">
                <div className="hero-preview-card-title">미리보기</div>
                <div className="hero-band hero-band-preview">
                  {isVideoSrc(heroMediaUrl ?? content.hero.media ?? "/home-assets/0330.mov") ? (
                    <video
                      autoPlay
                      className="reference-hero-image"
                      loop
                      muted
                      playsInline
                      src={heroMediaUrl ?? content.hero.media ?? "/home-assets/0330.mov"}
                      style={{
                        objectPosition: `${heroMediaPositionX}% ${heroMediaPositionY}%`,
                        transform: `scale(${heroMediaScale / 100})`,
                      }}
                    />
                  ) : (
                    <img
                      alt="히어로 미리보기"
                      className="reference-hero-image"
                      src={heroMediaUrl ?? content.hero.media ?? "/home-assets/0330.mov"}
                      style={{
                        objectPosition: `${heroMediaPositionX}% ${heroMediaPositionY}%`,
                        transform: `scale(${heroMediaScale / 100})`,
                      }}
                    />
                  )}
                  <div className="hero-image-overlay" />
                  <div className="hero-band-inner hero-band-inner-preview">
                    <div className={`reference-hero-copy reference-hero-copy-preview${heroDescription.trim() ? "" : " is-description-empty"}`}>
                      <p style={{ fontSize: `${heroTaglineFontSize}px`, fontWeight: heroTaglineFontWeight }}>{brandTagline}</p>
                      <h1 style={{ fontSize: `${heroTitleFontSize}px`, fontWeight: heroTitleFontWeight }}>{heroTitle}</h1>
                      {heroDescription.trim() ? (
                        <span className="pre-line-copy" style={{ fontSize: `${heroDescriptionFontSize}px`, fontWeight: heroDescriptionFontWeight }}>{heroDescription}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
        </div>
        <div className="section-actions">
          <button className="primary-link button-reset" disabled={pending} formNoValidate name="saveSection" type="submit" value="brand">
            {pending && activeTab === "brand" ? "저장 중..." : "기본 정보 저장"}
          </button>
        </div>
      </section>

      <section className={`dashboard-panel editor-section${activeTab === "portfolio" ? " is-visible" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="section-label">Portfolio</p>
            <h3>포트폴리오 리스트</h3>
          </div>
          <button
            aria-label="포트폴리오 설정"
            className="settings-trigger button-reset"
            onClick={() => setIsPortfolioSettingsOpen(true)}
            type="button"
          >
            <img alt="" aria-hidden="true" src="/home-assets/setting.svg" />
          </button>
        </div>
        <div className="editor-manager-body">
          <PortfolioManager categories={content.portfolioCategories} isActive={activeTab === "portfolio"} projects={content.projects} />
        </div>
        <div className="section-actions">
          <button className="primary-link button-reset" disabled={pending} formNoValidate name="saveSection" type="submit" value="portfolio">
            {pending && activeTab === "portfolio" ? "저장 중..." : "포트폴리오 저장"}
          </button>
        </div>
      </section>

      <section className={`dashboard-panel editor-section${activeTab === "services" ? " is-visible" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="section-label">Services</p>
            <h3>운영 솔루션 관리</h3>
          </div>
        </div>
        <div className="editor-manager-body">
          <ServiceManager isActive={activeTab === "services"} services={content.operatedServices} />
        </div>
        <div className="section-actions">
          <button className="primary-link button-reset" disabled={pending} formNoValidate name="saveSection" type="submit" value="services">
            {pending && activeTab === "services" ? "저장 중..." : "솔루션 저장"}
          </button>
        </div>
      </section>

      <section className={`dashboard-panel editor-section${activeTab === "process" ? " is-visible" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="section-label">Process</p>
            <h3>진행 흐름 관리</h3>
          </div>
          <button
            aria-label="진행 방식 설정"
            className="settings-trigger button-reset"
            onClick={() => setIsProcessSettingsOpen(true)}
            type="button"
          >
            <img alt="" aria-hidden="true" src="/home-assets/setting.svg" />
          </button>
        </div>
        <div className="editor-manager-body">
          <ProcessManager isActive={activeTab === "process"} steps={content.processSteps} />
        </div>
        <div className="section-actions">
          <button className="primary-link button-reset" disabled={pending} formNoValidate name="saveSection" type="submit" value="process">
            {pending && activeTab === "process" ? "저장 중..." : "진행 방식 저장"}
          </button>
        </div>
      </section>

      <section className={`dashboard-panel editor-section${activeTab === "pricing" ? " is-visible" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="section-label">Pricing</p>
            <h3>요금 페이지 설정</h3>
          </div>
          <button
            aria-label="요금 설정"
            className="settings-trigger button-reset"
            onClick={() => setIsPricingSettingsOpen(true)}
            type="button"
          >
            <img alt="" aria-hidden="true" src="/home-assets/setting.svg" />
          </button>
        </div>
        <div className="editor-manager-body">
          <PricingManager isActive={activeTab === "pricing"} plans={content.pricing.plans} />
        </div>
        <div className="section-actions">
          <button className="primary-link button-reset" disabled={pending} formNoValidate name="saveSection" type="submit" value="pricing">
            {pending && activeTab === "pricing" ? "저장 중..." : "요금 저장"}
          </button>
        </div>
      </section>

      <section className={`dashboard-panel editor-section${activeTab === "faq" ? " is-visible" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="section-label">FAQ</p>
            <h3>FAQ 카테고리와 질문 답변</h3>
          </div>
        </div>
        <div className="editor-manager-body">
          <FaqManager groups={content.faq.groups} isActive={activeTab === "faq"} />
        </div>
        <div className="section-actions">
          <button className="primary-link button-reset" disabled={pending} formNoValidate name="saveSection" type="submit" value="faq">
            {pending && activeTab === "faq" ? "저장 중..." : "FAQ 저장"}
          </button>
        </div>
      </section>

      <section className={`dashboard-panel editor-section${activeTab === "chat" ? " is-visible" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="section-label">Chat</p>
            <h3>홈 채팅 위젯 설정</h3>
          </div>
          <button
            aria-label="채팅 설정"
            className="settings-trigger button-reset"
            onClick={() => setIsChatSettingsOpen(true)}
            type="button"
          >
            <img alt="" aria-hidden="true" src="/home-assets/setting.svg" />
          </button>
        </div>
        <div className="editor-manager-body">
          <input name="chatQuickActionsPayload" type="hidden" value={JSON.stringify(chatQuickActions)} />
          <ChatInquiryManager inquiries={chatInquiries} />
        </div>
      </section>

      <section className={`dashboard-panel editor-section${activeTab === "contact" ? " is-visible" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="section-label">Contact</p>
            <h3>문의 페이지 정보</h3>
          </div>
        </div>
        <div className="editor-manager-body">
          <ContactInquiryManager
            email={content.contact.email}
            headline={content.contact.headline}
            inquiries={content.contact.inquiries}
            pending={pending && activeTab === "contact"}
            planOptions={content.pricing.plans.map((plan) => plan.name)}
            privacyPolicy={content.contact.privacyPolicy}
          />
        </div>
      </section>
        </div>
      </div>

      <div
        className={`admin-modal-backdrop${isPortfolioSettingsOpen ? " is-open" : ""}`}
        onClick={() => setIsPortfolioSettingsOpen(false)}
        role="presentation"
      >
          <div aria-modal="true" className="admin-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="admin-modal-head">
              <div>
                <p className="section-label">Portfolio</p>
                <h3>포트폴리오페이지 설정</h3>
              </div>
              <button className="secondary-link button-reset" onClick={() => setIsPortfolioSettingsOpen(false)} type="button">
                닫기
              </button>
            </div>
            <div className="admin-modal-stack">
              <label className="full-width">
                <span>페이지 설명</span>
                <textarea name="projectsIntro" defaultValue={content.projectsIntro} rows={3} required />
              </label>
            </div>
            <div className="section-actions">
              <button
                className="primary-link button-reset"
                disabled={pending}
                formNoValidate
                name="saveSection"
                type="submit"
                value="portfolio"
              >
                {pending && activeTab === "portfolio" ? "저장 중..." : "포트폴리오 설정 저장"}
              </button>
            </div>
          </div>
        </div>

      <div
        className={`admin-modal-backdrop${isProcessSettingsOpen ? " is-open" : ""}`}
        onClick={() => setIsProcessSettingsOpen(false)}
        role="presentation"
      >
          <div aria-modal="true" className="admin-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="admin-modal-head">
              <div>
                <p className="section-label">Process</p>
                <h3>진행방식페이지 설정</h3>
              </div>
              <button className="secondary-link button-reset" onClick={() => setIsProcessSettingsOpen(false)} type="button">
                닫기
              </button>
            </div>
            <div className="admin-modal-stack">
              <label className="full-width">
                <span>페이지 제목</span>
                <textarea name="processTitle" defaultValue={content.processTitle} rows={3} required />
              </label>
            </div>
            <div className="section-actions">
              <button
                className="primary-link button-reset"
                disabled={pending}
                formNoValidate
                name="saveSection"
                type="submit"
                value="process"
              >
                {pending && activeTab === "process" ? "저장 중..." : "진행방식 설정 저장"}
              </button>
            </div>
          </div>
        </div>

      <div
        className={`admin-modal-backdrop${isPricingSettingsOpen ? " is-open" : ""}`}
        onClick={() => setIsPricingSettingsOpen(false)}
        role="presentation"
      >
          <div aria-modal="true" className="admin-modal admin-modal-wide" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="admin-modal-head">
              <div>
                <p className="section-label">Pricing</p>
                <h3>요금페이지 설정</h3>
              </div>
              <button className="secondary-link button-reset" onClick={() => setIsPricingSettingsOpen(false)} type="button">
                닫기
              </button>
            </div>
            <div className="admin-modal-stack">
              <label className="full-width">
                <span>페이지 제목</span>
                <textarea name="pricingTitle" defaultValue={content.pricing.title} rows={3} required />
              </label>
              <label className="full-width">
                <span>페이지 설명</span>
                <textarea name="pricingDescription" defaultValue={content.pricing.description} rows={3} required />
              </label>
              <div className="promo-settings-row">
                <span>할인 이벤트 노출</span>
                <label className="toggle-switch" aria-label="할인 이벤트 노출">
                  <input defaultChecked={content.pricing.promo.enabled} name="pricingPromoEnabled" type="checkbox" />
                  <span className="toggle-slider" />
                </label>
                <input name="pricingPromoMessage" defaultValue={content.pricing.promo.message} required />
              </div>
            </div>
            <div className="section-actions">
              <button
                className="primary-link button-reset"
                disabled={pending}
                formNoValidate
                name="saveSection"
                type="submit"
                value="pricing"
              >
                {pending && activeTab === "pricing" ? "저장 중..." : "요금 설정 저장"}
              </button>
            </div>
          </div>
        </div>

      <div
        className={`admin-modal-backdrop${isChatSettingsOpen ? " is-open" : ""}`}
        onClick={() => setIsChatSettingsOpen(false)}
        role="presentation"
      >
          <div aria-modal="true" className="admin-modal admin-modal-wide" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="admin-modal-head">
              <div>
                <p className="section-label">Chat</p>
                <h3>채팅 위젯 설정</h3>
              </div>
              <button className="secondary-link button-reset" onClick={() => setIsChatSettingsOpen(false)} type="button">
                닫기
              </button>
            </div>
            <div className="admin-modal-stack">
              <div className="form-grid">
                <label>
                  <span>런처 버튼 문구</span>
                  <input defaultValue={content.chatWidget.launcherLabel} name="chatLauncherLabel" required />
                </label>
                <label>
                  <span>패널 제목</span>
                  <input defaultValue={content.chatWidget.panelTitle} name="chatPanelTitle" required />
                </label>
                <label className="full-width">
                  <span>패널 설명</span>
                  <input defaultValue={content.chatWidget.panelDescription} name="chatPanelDescription" required />
                </label>
                <label className="full-width">
                  <span>첫 기본 메시지</span>
                  <textarea defaultValue={content.chatWidget.welcomeMessage} name="chatWelcomeMessage" required rows={4} />
                </label>
                <label className="full-width">
                  <span>개인정보 동의 문구</span>
                  <input defaultValue={content.chatWidget.privacyConsentLabel} name="chatPrivacyConsentLabel" required />
                </label>
                <div className="full-width">
                  <span style={{ display: "block", marginBottom: 10 }}>빠른 문의 버튼</span>
                  <div className="faq-admin-grid">
                    {chatQuickActions.map((item, index) => (
                      <label className="mini-card" key={`chat-quick-action-${index}`}>
                        <span>버튼 {index + 1}</span>
                        <input
                          onChange={(event) =>
                            setChatQuickActions((current) =>
                              current.map((value, valueIndex) => (valueIndex === index ? event.target.value : value)),
                            )
                          }
                          value={item}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="section-actions">
              <button
                className="primary-link button-reset"
                disabled={pending}
                formNoValidate
                name="saveSection"
                type="submit"
                value="chat"
              >
                {pending && activeTab === "chat" ? "저장 중..." : "채팅 설정 저장"}
              </button>
            </div>
        </div>
      </div>
    </form>
    </>
  );
}
