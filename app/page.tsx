export const dynamic = "force-dynamic";


import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";
import { HomePortfolioGrid } from "@/app/home-portfolio-grid";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.studiobyyou.kr" },
};

export default async function HomePage() {
  const content = await readSiteContent();

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
          <SiteHeader logoSrc={content.brand.logo} />

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

            <a className="panel-footer-chip" href="/portfolio">
              더보기
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section className="process-section" id="process">
          <div className="panel-heading-reference process-heading">
            <div className="panel-heading-kicker">이렇게 진행돼요.</div>
            <p>상담부터 오픈까지, 흐름이 끊기지 않게 함께 진행합니다.</p>
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
