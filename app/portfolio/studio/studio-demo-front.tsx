"use client";

import Image from "next/image";
import { ContactForm } from "@/app/contact/contact-form";
import { FaqClient } from "@/app/faq/faq-client";
import { HomePortfolioGrid } from "@/app/home-portfolio-grid";
import { PortfolioList } from "@/app/portfolio/portfolio-list";
import { SiteHeader } from "@/components/site-header";
import type { SiteContent } from "@/lib/site-content";

export type StudioDemoFrontPage = "home" | "portfolio" | "services" | "pricing" | "faq" | "contact";

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
  return (
    <>
      <section className="hero-band">
        <Image
          alt="메인 배경"
          className="reference-hero-image"
          fill
          priority
          sizes="100vw"
          src="/home-assets/hero-bg-optimized.jpg"
        />
        <div className="hero-image-overlay" />
        <div className="hero-band-inner">
          <DemoHeader content={content} />

          <div className="reference-hero-copy">
            <p>{content.brand.tagline}</p>
            <h1>{content.hero.title}</h1>
            <span className="pre-line-copy">{content.hero.description}</span>
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
            <HomePortfolioGrid projects={content.projects} />
          </div>
        </section>

        <section className="services-grid-section">
          <div className="panel-heading-reference">
            <div className="panel-heading-kicker">직접 운영 중인 서비스</div>
            <p>운영 서비스</p>
          </div>
          <div className="services-grid">
            {content.operatedServices.map((service) => (
              <article className="service-card" key={service.title}>
                <div className="service-card-image">
                  <img alt={service.title} src={service.image} />
                </div>
                <div className="service-card-body">
                  <div className="service-card-head">
                    <h2>{service.title}</h2>
                    {service.badge ? <span className="service-badge">{service.badge}</span> : null}
                  </div>
                  <p className="service-card-desc">{service.description}</p>
                  <div className="service-card-pricing">
                    <strong>{service.pricing}</strong>
                    {service.pricingDetail ? <span>{service.pricingDetail}</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="process-section" id="process">
          <div className="panel-heading-reference process-heading">
            <div className="panel-heading-kicker">이렇게 진행돼요.</div>
            <p>{content.processTitle}</p>
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
              </article>
            ))}
          </div>
        </section>

        <FaqClient description={content.faq.description} groups={content.faq.groups} title={content.faq.title} />

        <section className="contact-reference-shell">
          <div className="contact-reference-copy">
            <h1>문의하기</h1>
            <span>{content.contact.headline}</span>
            <span className="contact-reference-email">{content.contact.email}</span>
          </div>
        </section>
      </main>
    </>
  );
}

function PortfolioPage({ content }: { content: SiteContent }) {
  return (
    <main className="subpage-shell">
      <DemoHeader compact content={content} />
      <section className="subpage-hero">
        <h1>포트폴리오</h1>
        <p>{content.projectsIntro}</p>
      </section>
      <PortfolioList projects={content.projects} />
    </main>
  );
}

function ServicesPage({ content }: { content: SiteContent }) {
  return (
    <main className="subpage-shell">
      <DemoHeader compact content={content} />
      <section className="subpage-hero">
        <h1>운영 서비스</h1>
        <p>직접 기획하고 운영 중인 서비스입니다. 지금 바로 사용해보세요.</p>
      </section>
      <section className="services-grid-section">
        <div className="services-grid">
          {content.operatedServices.map((service) => (
            <article className="service-card" key={service.title}>
              <div className="service-card-image">
                <img alt={service.title} src={service.image} />
              </div>
              <div className="service-card-body">
                <div className="service-card-head">
                  <h2>{service.title}</h2>
                  {service.badge ? <span className="service-badge">{service.badge}</span> : null}
                </div>
                <p className="service-card-desc">{service.description}</p>
                <div className="service-card-pricing">
                  <strong>{service.pricing}</strong>
                  {service.pricingDetail ? <span>{service.pricingDetail}</span> : null}
                </div>
                <div className="service-card-actions">
                  {service.link ? (
                    <a className="primary-link" href={service.link} rel="noopener noreferrer" target="_blank">
                      서비스 이용하기 →
                    </a>
                  ) : null}
                  <a className="secondary-link" href="/portfolio/studio/contact">
                    문의하기
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function PricingPage({ content }: { content: SiteContent }) {
  return (
    <main className="subpage-shell pricing-page-shell">
      <DemoHeader compact content={content} />
      <section className="pricing-shell">
        <div className="pricing-hero">
          <h1>필요한 서비스와 요금을 확인하세요.</h1>
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
                이 플랜으로 문의하기
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
