export const dynamic = "force-dynamic";


import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "운영 서비스",
  description: "Studio by You가 직접 운영하는 서비스를 소개합니다. 지금 바로 사용해보세요.",
  alternates: { canonical: "https://www.studiobyyou.kr/services" },
  openGraph: {
    url: "https://www.studiobyyou.kr/services",
    title: "운영 서비스 | Studio by You",
    description: "Studio by You가 직접 운영하는 서비스를 소개합니다.",
  },
};

export default async function ServicesPage() {
  const content = await readSiteContent();
  const services = content.operatedServices;

  return (
    <main className="subpage-shell">
      <SiteHeader compact logoSrc={content.brand.logo} />

      <section className="subpage-hero">
        <h1>운영 서비스</h1>
        <p>직접 기획하고 운영 중인 서비스입니다. 지금 바로 사용해보세요.</p>
      </section>

      <section className="services-grid-section">
        <div className="services-grid">
          {services.map((service) => (
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
                    <a
                      className="primary-link"
                      href={service.link}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      서비스 이용하기 →
                    </a>
                  ) : null}
                  <a className="secondary-link" href="/contact">
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
