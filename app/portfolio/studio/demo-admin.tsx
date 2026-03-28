"use client";

import { useEffect, useRef, useState } from "react";
import { ContactInquiryManager } from "@/app/admin/contact-inquiry-manager";
import { FaqManager } from "@/app/admin/faq-manager";
import { PortfolioManager } from "@/app/admin/portfolio-manager";
import { PricingManager } from "@/app/admin/pricing-manager";
import { ProcessManager } from "@/app/admin/process-manager";
import { ServiceManager } from "@/app/admin/service-manager";
import { compressClientImage } from "@/lib/client-image";
import type { SiteContent } from "@/lib/site-content";

function parseDemoSection(formData: FormData, content: SiteContent, brandLogoOverride?: string): SiteContent {
  const section = String(formData.get("saveSection") || "");
  switch (section) {
    case "brand":
      return {
        ...content,
        brand: {
          ...content.brand,
          tagline: String(formData.get("brandTagline") || ""),
          logo: brandLogoOverride?.trim() || String(formData.get("brandLogo") || "").trim() || content.brand.logo,
        },
        hero: {
          ...content.hero,
          title: String(formData.get("heroTitle") || ""),
          description: String(formData.get("heroDescription") || ""),
        },
      };
    case "portfolio": {
      const cats = JSON.parse(String(formData.get("portfolioCategoriesPayload") || "[]"));
      const projs = JSON.parse(String(formData.get("portfolioProjectsPayload") || "[]"));
      return {
        ...content,
        projectsIntro: String(formData.get("projectsIntro") || content.projectsIntro),
        portfolioCategories: cats,
        projects: projs,
      };
    }
    case "services":
      return {
        ...content,
        operatedServices: JSON.parse(String(formData.get("operatedServicesPayload") || "[]")),
      };
    case "process":
      return {
        ...content,
        processTitle: String(formData.get("processTitle") || content.processTitle),
        processSteps: JSON.parse(String(formData.get("processStepsPayload") || "[]")),
      };
    case "pricing": {
      const plans = JSON.parse(String(formData.get("pricingPlansPayload") || "[]"));
      return {
        ...content,
        pricing: {
          title: String(formData.get("pricingTitle") || content.pricing.title),
          description: String(formData.get("pricingDescription") || content.pricing.description),
          promo: {
            enabled: formData.get("pricingPromoEnabled") === "on",
            message: String(formData.get("pricingPromoMessage") || ""),
          },
          plans,
        },
      };
    }
    case "faq":
      return {
        ...content,
        faq: {
          ...content.faq,
          groups: JSON.parse(String(formData.get("faqGroupsPayload") || "[]")),
        },
      };
    case "contact":
      return {
        ...content,
        contact: {
          ...content.contact,
          headline: String(formData.get("contactHeadline") || ""),
          email: String(formData.get("contactEmail") || ""),
          privacyPolicy: String(formData.get("contactPrivacyPolicy") || ""),
        },
      };
    default:
      return content;
  }
}

type DemoAdminProps = {
  content: SiteContent;
  onSave: (updated: SiteContent) => void;
};

const tabs = [
  { id: "brand", label: "기본 정보" },
  { id: "portfolio", label: "포트폴리오" },
  { id: "services", label: "서비스" },
  { id: "process", label: "진행 방식" },
  { id: "pricing", label: "요금" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "문의" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function ImagePreview({ alt, src }: { alt: string; src: string }) {
  return (
    <div className="upload-preview">
      <img alt={alt} src={src} />
    </div>
  );
}

export function DemoAdmin({ content, onSave }: DemoAdminProps) {
  const [status, setStatus] = useState<{ success?: string; error?: string }>();
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>("brand");
  const [logoValue, setLogoValue] = useState(content.brand.logo);
  const [isLogoProcessing, setIsLogoProcessing] = useState(false);
  const [isPortfolioSettingsOpen, setIsPortfolioSettingsOpen] = useState(false);
  const [isProcessSettingsOpen, setIsProcessSettingsOpen] = useState(false);
  const [isPricingSettingsOpen, setIsPricingSettingsOpen] = useState(false);

  useEffect(() => {
    setLogoValue(content.brand.logo);
  }, [content.brand.logo]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    setPending(true);
    try {
      const updated = parseDemoSection(formData, content, activeTab === "brand" ? logoValue : undefined);
      onSave(updated);
      setLogoValue(updated.brand.logo);
      setStatus({ success: "저장됐습니다. (브라우저에만 저장)" });
    } catch {
      setStatus({ error: "저장 중 오류가 발생했습니다." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} className="content-form" onSubmit={handleSubmit}>
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
          {status?.success ? <div className="editor-feedback success-text">{status.success}</div> : null}
          {status?.error ? <div className="editor-feedback form-error">{status.error}</div> : null}

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
                <div className="brand-logo-upload-row">
                  <ImagePreview alt="브랜드 로고" src={logoValue} />
                  <input name="brandLogo" type="hidden" value={logoValue} />
                  <input
                    accept="image/*"
                    className="file-input"
                    type="file"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsLogoProcessing(true);
                      try {
                        const dataUrl = await compressClientImage(file);
                        setLogoValue(dataUrl);
                        setStatus(undefined);
                      } catch {
                        setStatus({ error: "로고 처리 중 오류가 발생했습니다." });
                      } finally {
                        setIsLogoProcessing(false);
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
                {isLogoProcessing ? <p className="section-label">로고 처리 중...</p> : null}
              </div>
              <label className="full-width">
                <span>태그라인</span>
                <input name="brandTagline" defaultValue={content.brand.tagline} required />
              </label>
              <label className="full-width">
                <span>메인 제목</span>
                <textarea name="heroTitle" defaultValue={content.hero.title} rows={3} required />
              </label>
              <label className="full-width">
                <span>메인 설명</span>
                <textarea name="heroDescription" defaultValue={content.hero.description} rows={6} required />
              </label>
            </div>
            <div className="section-actions">
              <button
                className="primary-link button-reset"
                disabled={pending || isLogoProcessing}
                formNoValidate
                name="saveSection"
                type="submit"
                value="brand"
              >
                {isLogoProcessing ? "로고 처리 중..." : pending && activeTab === "brand" ? "저장 중..." : "기본 정보 저장"}
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
              <PortfolioManager
                categories={content.portfolioCategories}
                isActive={activeTab === "portfolio"}
                projects={content.projects}
              />
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
                {pending && activeTab === "portfolio" ? "저장 중..." : "포트폴리오 저장"}
              </button>
            </div>
          </section>

          <section className={`dashboard-panel editor-section${activeTab === "services" ? " is-visible" : ""}`}>
            <div className="panel-heading">
              <div>
                <p className="section-label">Services</p>
                <h3>운영 서비스 관리</h3>
              </div>
            </div>
            <div className="editor-manager-body">
              <ServiceManager isActive={activeTab === "services"} services={content.operatedServices} />
            </div>
            <div className="section-actions">
              <button
                className="primary-link button-reset"
                disabled={pending}
                formNoValidate
                name="saveSection"
                type="submit"
                value="services"
              >
                {pending && activeTab === "services" ? "저장 중..." : "서비스 저장"}
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
              <button
                className="primary-link button-reset"
                disabled={pending}
                formNoValidate
                name="saveSection"
                type="submit"
                value="process"
              >
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
              <button
                className="primary-link button-reset"
                disabled={pending}
                formNoValidate
                name="saveSection"
                type="submit"
                value="pricing"
              >
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
              <button
                className="primary-link button-reset"
                disabled={pending}
                formNoValidate
                name="saveSection"
                type="submit"
                value="faq"
              >
                {pending && activeTab === "faq" ? "저장 중..." : "FAQ 저장"}
              </button>
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
    </form>
  );
}
