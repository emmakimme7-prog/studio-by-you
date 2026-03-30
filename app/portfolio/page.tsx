
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { PortfolioList } from "@/app/portfolio/portfolio-list";
import { readSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "포트폴리오",
  description:
    "Studio by You의 웹·앱 제작 포트폴리오를 확인하세요. 브랜드 사이트, 서비스 플랫폼, 관리자 페이지 등 다양한 프로젝트를 소개합니다.",
  alternates: { canonical: "https://www.studiobyyou.kr/portfolio" },
  openGraph: {
    url: "https://www.studiobyyou.kr/portfolio",
    title: "포트폴리오 | Studio by You",
    description:
      "Studio by You의 웹·앱 제작 포트폴리오. 브랜드 사이트, 서비스 플랫폼, 관리자 페이지 등 다양한 프로젝트를 확인하세요.",
  },
};

export default async function PortfolioPage() {
  const content = await readSiteContent();

  return (
    <main className="subpage-shell">
      <SiteHeader compact logoSrc={content.brand.logo} />

      <section className="subpage-hero reveal-on-load">
        <h1>포트폴리오</h1>
        <p>{content.projectsIntro}</p>
      </section>
      <PortfolioList projects={content.projects} />
    </main>
  );
}
