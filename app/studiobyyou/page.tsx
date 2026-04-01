import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";
import { isVideoSrc } from "@/lib/client-upload";
import { LazyVideo } from "@/components/lazy-video";
import { ScrollRevealInit } from "@/components/scroll-reveal-init";

function getListingThumbnail(src: string) {
  return src;
}

export default async function SharedHomePage() {
  const content = await readSiteContent();
  const heroObjectPosition = `${content.hero.mediaPositionX ?? 50}% ${content.hero.mediaPositionY ?? 50}%`;
  const heroScale = content.hero.mediaScale ?? 100;
  const heroTaglineStyle = { fontSize: `${content.hero.taglineFontSize ?? 14}px`, fontWeight: content.hero.taglineFontWeight ?? "700" };
  const heroTitleStyle = { fontSize: `${content.hero.titleFontSize ?? 62}px`, fontWeight: content.hero.titleFontWeight ?? "700" };
  const heroDescriptionStyle = { fontSize: `${content.hero.descriptionFontSize ?? 15}px`, fontWeight: content.hero.descriptionFontWeight ?? "500" };

  return (
    <>
      <ScrollRevealInit />
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
          <SiteHeader basePath="/studiobyyou" logoSrc={content.brand.logo} showContactCta={false} />

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

            <div className="project-card-grid project-card-grid-reference">
              {content.projects.map((project, index) => (
                <article className="project-shot-card" data-reveal="scale" data-delay={String(index % 4)} key={project.title + index}>
                  <div className="project-shot project-shot-reference">
                    {isVideoSrc(project.thumbnailImage) ? (
                      <LazyVideo className="project-image-tag" src={getListingThumbnail(project.thumbnailImage)} />
                    ) : (
                      <img
                        alt={project.title}
                        className="project-image-tag"
                        decoding="async"
                        loading="lazy"
                        src={getListingThumbnail(project.thumbnailImage)}
                      />
                    )}
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.summary}</p>
                  <div className="project-card-actions">
                    <span className="project-pill">{project.category}</span>
                    <a className="project-detail-link" href={`/studiobyyou/portfolio`}>
                      자세히
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <a className="panel-footer-chip" href="/studiobyyou/portfolio">
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
              <article className="process-visual-card process-visual-card-reference" data-reveal="scale" data-delay={String(index % 3)} key={item.title + index}>
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
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
