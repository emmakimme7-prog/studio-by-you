import { SiteHeader } from "@/components/site-header";
import { PortfolioList } from "@/app/portfolio/portfolio-list";
import { readSiteContent } from "@/lib/site-content";

export default async function SharedPortfolioPage() {
  const content = await readSiteContent();

  return (
    <main className="subpage-shell">
      <SiteHeader basePath="/studiobyyou" compact logoSrc={content.brand.logo} showContactCta={false} />

      <section className="subpage-hero">
        <h1>포트폴리오</h1>
        <p>{content.projectsIntro}</p>
      </section>
      <PortfolioList projects={content.projects} />
    </main>
  );
}
