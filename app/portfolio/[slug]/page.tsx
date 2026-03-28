export const dynamic = "force-dynamic";


import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";

type PortfolioDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { slug } = await params;
  const content = await readSiteContent();
  const project = content.projects.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="subpage-shell">
      <SiteHeader compact logoSrc={content.brand.logo} />

      <section className="subpage-hero">
        <p className="panel-heading-kicker">{project.category}</p>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
      </section>

      <section className="portfolio-detail-editor">
        <div
          className="portfolio-detail-html"
          dangerouslySetInnerHTML={{ __html: project.detailHtml }}
        />
      </section>
    </main>
  );
}
