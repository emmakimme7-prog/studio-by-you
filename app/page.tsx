export const dynamic = "force-dynamic";


import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";
import { HomePortfolioGrid } from "@/app/home-portfolio-grid";
import { isVideoSrc } from "@/lib/client-upload";
import { LazyVideo } from "@/components/lazy-video";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.studiobyyou.kr" },
};

export default async function HomePage() {
  const content = await readSiteContent();
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
          <SiteHeader logoSrc={content.brand.logo} />

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
            <div className="panel-heading-reference" data-reveal>
              <p>대표 포트폴리오</p>
            </div>

            <HomePortfolioGrid projects={content.projects} />

            <a className="panel-footer-chip" href="/portfolio">
              더보기
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section className="process-section" id="process">
          <div className="panel-heading-reference process-heading" data-reveal>
            <p className="pre-line-copy">{content.processTitle}</p>
          </div>
          <div className="process-card-grid">
            {content.processSteps.map((item, index) => (
              <article
                className="process-visual-card process-visual-card-reference"
                data-reveal="scale"
                data-delay={String(index % 3)}
                key={item.title + index}
              >
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
