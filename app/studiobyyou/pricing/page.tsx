export const dynamic = "force-dynamic";

import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";

export default async function SharedPricingPage() {
  const content = await readSiteContent();

  return (
    <main className="subpage-shell pricing-page-shell">
      <SiteHeader basePath="/studiobyyou" compact logoSrc={content.brand.logo} showContactCta={false} />

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
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
