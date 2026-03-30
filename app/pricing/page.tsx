
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "요금 안내",
  description:
    "Landing, Website, Product 세 가지 플랜으로 구성된 웹·앱 제작 요금을 확인하세요. 브랜딩부터 풀스택 개발까지 합리적인 가격으로 제공합니다.",
  alternates: { canonical: "https://www.studiobyyou.kr/pricing" },
  openGraph: {
    url: "https://www.studiobyyou.kr/pricing",
    title: "요금 안내 | Studio by You",
    description:
      "Landing, Website, Product 세 가지 플랜으로 구성된 웹·앱 제작 요금을 확인하세요.",
  },
};

export default async function PricingPage() {
  const content = await readSiteContent();
  return (
    <main className="subpage-shell pricing-page-shell">
      <SiteHeader compact logoSrc={content.brand.logo} />

      <section className="pricing-shell">
        <div className="pricing-hero reveal-on-load">
          <h1>필요한 서비스와 요금을 확인하세요.</h1>
          <span>{content.pricing.description}</span>
        </div>

        {content.pricing.promo.enabled ? (
          <div className="pricing-promo" data-reveal>
            <span>{content.pricing.promo.message}</span>
          </div>
        ) : null}

        <div className="pricing-grid">
          {content.pricing.plans.map((plan, index) => (
            <article
              className={`pricing-card${plan.featured ? " is-featured" : ""}`}
              data-reveal="scale"
              data-delay={String(index)}
              key={plan.name}
            >
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
              <a className="pricing-cta" href="/contact">
                이 플랜으로 문의하기
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
