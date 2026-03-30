
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ServiceScrollShowcase } from "@/components/service-scroll-showcase";
import { readSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "운영 솔루션",
  description: "Studio by You가 직접 운영하는 솔루션을 소개합니다. 지금 바로 사용해보세요.",
  alternates: { canonical: "https://www.studiobyyou.kr/services" },
  openGraph: {
    url: "https://www.studiobyyou.kr/services",
    title: "운영 솔루션 | Studio by You",
    description: "Studio by You가 직접 운영하는 솔루션을 소개합니다.",
  },
};

export default async function ServicesPage() {
  const content = await readSiteContent();
  const services = content.operatedServices;

  return (
    <main className="subpage-shell services-page-shell">
      <SiteHeader compact logoSrc={content.brand.logo} />

      <section className="subpage-hero reveal-on-load">
        <h1>운영 솔루션</h1>
        <p>직접 기획하고 운영 중인 솔루션입니다. 상황에 맞는 기능을 바로 체험해보세요.</p>
      </section>

      <ServiceScrollShowcase services={services} />
    </main>
  );
}
