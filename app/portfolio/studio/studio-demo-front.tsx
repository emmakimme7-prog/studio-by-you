"use client";

import Image from "next/image";
import { ContactForm } from "@/app/contact/contact-form";
import { FaqClient } from "@/app/faq/faq-client";
import { HomePortfolioGrid } from "@/app/home-portfolio-grid";
import { PortfolioList } from "@/app/portfolio/portfolio-list";
import { ServiceScrollShowcase } from "@/components/service-scroll-showcase";
import { SiteHeader } from "@/components/site-header";
import { LazyVideo } from "@/components/lazy-video";
import { isVideoSrc } from "@/lib/client-upload";
import type { SiteContent, SiteProject } from "@/lib/site-content";

export type StudioDemoFrontPage = "home" | "portfolio" | "services" | "pricing" | "faq" | "contact";

const DEMO_PORTFOLIO_SETS = [
  {
    thumb: "https://images.pexels.com/photos/7439135/pexels-photo-7439135.jpeg?cs=srgb&dl=pexels-cottonbro-7439135.jpg&fm=jpg",
    detail: [
      "https://images.pexels.com/photos/7439135/pexels-photo-7439135.jpeg?cs=srgb&dl=pexels-cottonbro-7439135.jpg&fm=jpg",
      "https://images.pexels.com/photos/20555791/pexels-photo-20555791.jpeg?cs=srgb&dl=pexels-jakubzerdzicki-20555791.jpg&fm=jpg",
      "https://images.pexels.com/photos/13620263/pexels-photo-13620263.jpeg?cs=srgb&dl=pexels-pramodtiwari-13620263.jpg&fm=jpg",
    ],
  },
  {
    thumb: "https://images.pexels.com/photos/17036353/pexels-photo-17036353.jpeg?cs=srgb&dl=pexels-jakubzerdzicki-17036353.jpg&fm=jpg",
    detail: [
      "https://images.pexels.com/photos/17036353/pexels-photo-17036353.jpeg?cs=srgb&dl=pexels-jakubzerdzicki-17036353.jpg&fm=jpg",
      "https://images.pexels.com/photos/27505478/pexels-photo-27505478.jpeg?cs=srgb&dl=pexels-jakubzerdzicki-27505478.jpg&fm=jpg",
      "https://images.pexels.com/photos/3913016/pexels-photo-3913016.jpeg?cs=srgb&dl=pexels-thisisengineering-3913016.jpg&fm=jpg",
    ],
  },
  {
    thumb: "https://images.pexels.com/photos/13620262/pexels-photo-13620262.jpeg?cs=srgb&dl=pexels-pramodtiwari-13620262.jpg&fm=jpg",
    detail: [
      "https://images.pexels.com/photos/13620262/pexels-photo-13620262.jpeg?cs=srgb&dl=pexels-pramodtiwari-13620262.jpg&fm=jpg",
      "https://images.pexels.com/photos/13620263/pexels-photo-13620263.jpeg?cs=srgb&dl=pexels-pramodtiwari-13620263.jpg&fm=jpg",
      "https://images.pexels.com/photos/20555791/pexels-photo-20555791.jpeg?cs=srgb&dl=pexels-jakubzerdzicki-20555791.jpg&fm=jpg",
    ],
  },
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildDemoDetailHtml(project: SiteProject, images: string[]) {
  const summaryLines = project.summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

  const imageMarkup = images
    .map(
      (image, index) =>
        `<figure><img src="${image}" alt="${escapeHtml(project.title)} ${index + 1}" loading="lazy" decoding="async" /></figure>`,
    )
    .join("");

  return `
    <section class="portfolio-detail-section">
      <div class="portfolio-detail-intro">
        <p>${escapeHtml(project.category)}</p>
        <h3>${escapeHtml(project.title)}</h3>
        <div>${summaryLines}</div>
      </div>
      <div class="portfolio-detail-gallery">
        ${imageMarkup}
      </div>
    </section>
  `;
}

function withStudioDemoProjects(projects: SiteProject[]) {
  return projects.map((project, index) => {
    const set = DEMO_PORTFOLIO_SETS[index % DEMO_PORTFOLIO_SETS.length];
    return {
      ...project,
      thumbnailImage: set.thumb,
      detailImages: set.detail,
      detailHtml: buildDemoDetailHtml(project, set.detail),
    };
  });
}

function DemoHeader({
  content,
  compact = false,
}: {
  content: SiteContent;
  compact?: boolean;
}) {
  return <SiteHeader basePath="/portfolio/studio" compact={compact} logoSrc={content.brand.logo} mobileLogoSrc={content.brand.logo} />;
}

function HomePage({ content }: { content: SiteContent }) {
  const projects = withStudioDemoProjects(content.projects);
  const heroObjectPosition = `${content.hero.mediaPositionX ?? 50}% ${content.hero.mediaPositionY ?? 50}%`;
  const heroScale = content.hero.mediaScale ?? 100;
  const heroTaglineStyle = { fontSize: `${content.hero.taglineFontSize ?? 14}px`, fontWeight: content.hero.taglineFontWeight ?? "700" };
  const heroTitleStyle = { fontSize: `${content.hero.titleFontSize ?? 62}px`, fontWeight: content.hero.titleFontWeight ?? "700" };
  const heroDescriptionStyle = { fontSize: `${content.hero.descriptionFontSize ?? 15}px`, fontWeight: content.hero.descriptionFontWeight ?? "500" };

  return (
    <>
      <section className="hero-band">
        {isVideoSrc(content.hero.media || "") ? (
          <LazyVideo
            className="reference-hero-image"
            src={content.hero.media || ""}
            style={{ objectPosition: heroObjectPosition, transform: `scale(${heroScale / 100})` }}
          />
        ) : (
          <Image
            alt="메인 배경"
            className="reference-hero-image"
            fill
            priority
            sizes="100vw"
            src={content.hero.media || "/home-assets/hero-bg-optimized.jpg"}
            style={{ objectPosition: heroObjectPosition, transform: `scale(${heroScale / 100})` }}
          />
        )}
        <div className="hero-image-overlay" />
        <div className="hero-band-inner">
          <DemoHeader content={content} />

          <div className={`reference-hero-copy${content.hero.description?.trim() ? "" : " is-description-empty"}`}>
            <p style={heroTaglineStyle}>{content.brand.tagline}</p>
            <h1 style={heroTitleStyle}>{content.hero.title}</h1>
            {content.hero.description?.trim() ? (
              <span className="pre-line-copy" style={heroDescriptionStyle}>{content.hero.description}</span>
            ) : null}
          </div>
        </div>
      </section>

      <main className="landing-shell">
        <section className="white-panel" id="portfolio">
          <div className="white-panel-content">
            <div className="panel-heading-reference">
              <div className="panel-heading-kicker">이런 작업들을 했어요.</div>
              <p>대표 포트폴리오</p>
            </div>
            <HomePortfolioGrid projects={projects} />
            <a className="panel-footer-chip" href="/portfolio/studio/portfolio">
              더보기
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section className="process-section" id="process">
          <div className="panel-heading-reference process-heading">
            <div className="panel-heading-kicker">이렇게 진행돼요.</div>
            <p className="pre-line-copy">{content.processTitle}</p>
          </div>
          <div className="process-card-grid">
            {content.processSteps.map((item, index) => (
              <article className="process-visual-card process-visual-card-reference" key={item.title + index}>
                <div className="process-number">{index + 1}</div>
                <div className="process-visual process-visual-plain">
                  <Image
                    alt={`진행방법 ${index + 1}`}
                    className="contain-image process-image-framed"
                    fill
                    sizes="(max-width: 980px) 100vw, 33vw"
                    src={item.image}
                  />
                </div>
                <h3>{item.title}</h3>
                {item.subtitle ? <p className="process-step-subtitle">{item.subtitle}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function PortfolioPage({ content }: { content: SiteContent }) {
  const projects = withStudioDemoProjects(content.projects);

  return (
    <main className="subpage-shell">
      <DemoHeader compact content={content} />
      <section className="subpage-hero">
        <h1>포트폴리오</h1>
        <p>{content.projectsIntro}</p>
      </section>
      <PortfolioList projects={projects} />
    </main>
  );
}

function ServicesPage({ content }: { content: SiteContent }) {
  return (
    <main className="subpage-shell">
      <DemoHeader compact content={content} />
      <section className="subpage-hero">
        <h1>운영 솔루션</h1>
        <p>{content.servicesIntro}</p>
      </section>
      <ServiceScrollShowcase services={content.operatedServices} />
    </main>
  );
}

function PricingPage({ content }: { content: SiteContent }) {
  return (
    <main className="subpage-shell pricing-page-shell">
      <DemoHeader compact content={content} />
      <section className="pricing-shell">
        <div className="pricing-hero">
          <h1>{content.pricing.title}</h1>
          <span>{content.pricing.description}</span>
        </div>

        {content.pricing.promo.enabled ? (
          <div className="pricing-promo">
            <span>{content.pricing.promo.message}</span>
          </div>
        ) : null}

        <div className="pricing-grid">
          {content.pricing.plans.map((plan) => (
            <article className={`pricing-card${plan.featured ? " is-featured" : ""}`} key={plan.name}>
              <div className="pricing-card-head">
                <p>{plan.name}</p>
                <strong>{plan.price}</strong>
                <span>{plan.description}</span>
              </div>
              <ul>
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <a className="pricing-cta" href="/portfolio/studio/contact">
                {content.contact.headline}
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function FaqPage({ content }: { content: SiteContent }) {
  return (
    <main className="subpage-shell faq-page-shell">
      <DemoHeader compact content={content} />
      <FaqClient description={content.faq.description} groups={content.faq.groups} title={content.faq.title} />
    </main>
  );
}

function ContactPage({ content }: { content: SiteContent }) {
  return (
    <main className="subpage-shell">
      <DemoHeader compact content={content} />
      <ContactForm
        email={content.contact.email}
        headline={content.contact.headline}
        operatedServices={content.operatedServices.map((service) => ({ title: service.title }))}
        plans={content.pricing.plans.map((plan) => ({
          name: plan.name,
          price: plan.price,
          description: plan.description,
        }))}
        privacyPolicy={content.contact.privacyPolicy}
      />
    </main>
  );
}

export function StudioDemoFront({ content, page = "home" }: { content: SiteContent; page?: StudioDemoFrontPage }) {
  const pages: Record<StudioDemoFrontPage, React.JSX.Element> = {
    home: <HomePage content={content} />,
    portfolio: <PortfolioPage content={content} />,
    services: <ServicesPage content={content} />,
    pricing: <PricingPage content={content} />,
    faq: <FaqPage content={content} />,
    contact: <ContactPage content={content} />,
  };

  return <div style={{ minHeight: "100%", background: "linear-gradient(180deg, #f7f8fc 0%, #f8f9fb 100%)" }}>{pages[page]}</div>;
}
