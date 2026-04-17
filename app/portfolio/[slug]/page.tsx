
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";
import { PortfolioDetailHtmlClient } from "./portfolio-detail-html-client";

type PortfolioDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const siteUrl = "https://www.studiobyyou.kr";

export async function generateMetadata({ params }: PortfolioDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = await readSiteContent();
  const project = content.projects.find((item) => item.slug === slug);

  if (!project) {
    return {};
  }

  const title = project.title;
  const description = project.summary;
  const canonicalUrl = `${siteUrl}/portfolio/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
    },
  };
}

function parsePortfolioDocument(value: string) {
  const backgroundMatch = value.match(/data-page-background="([^"]+)"/);
  const textColorMatch = value.match(/data-page-text-color="([^"]+)"/);
  const contentMatch = value.match(
    /<div[^>]*data-portfolio-page-root="true"[^>]*>([\s\S]*)<\/div>\s*$/,
  );

  return {
    background: backgroundMatch?.[1] || "#ffffff",
    textColor: textColorMatch?.[1] || "#141924",
    bodyHtml: contentMatch?.[1] || value,
  };
}

function isDarkColor(value: string) {
  const hex = value.replace("#", "").trim();
  const normalized =
    hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return false;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance < 0.48;
}

export default async function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { slug } = await params;
  const content = await readSiteContent();
  const project =
    content.projects.find((item) => item.slug === slug) ||
    (slug === "project-1"
      ? content.projects.find(
          (item) => item.title.includes("TY") || String(item.siteUrl || "").includes("/portfolio/ty"),
        )
      : undefined) ||
    (slug === "project-3"
      ? content.projects.find(
          (item) => item.title.includes("투표") || String(item.siteUrl || "").includes("/portfolio/vote"),
        )
      : undefined);

  if (!project) {
    notFound();
  }

  const parsed = parsePortfolioDocument(project.detailHtml);
  const isDark = isDarkColor(parsed.background);

  return (
    <main
      className={`subpage-shell portfolio-detail-page${isDark ? " is-dark" : ""}`}
      style={{ backgroundColor: parsed.background, color: parsed.textColor }}
    >
      <SiteHeader
        compact
        darkLogoSrc="/home-assets/logo-white.png"
        darkMode={isDark}
        logoSrc={content.brand.logo}
      />

      <section className="subpage-hero reveal-on-load">
        <p className="panel-heading-kicker">{project.category}</p>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
      </section>

      <section className="portfolio-detail-editor">
        <PortfolioDetailHtmlClient html={parsed.bodyHtml} />
      </section>
    </main>
  );
}
