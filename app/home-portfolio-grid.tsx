"use client";

import { LazyVideo } from "@/components/lazy-video";
import { isVideoSrc } from "@/lib/client-upload";
import type { SiteProject } from "@/lib/site-content";

function getListingThumbnail(src: string) {
  return src;
}

export function HomePortfolioGrid({ projects }: { projects: SiteProject[] }) {
  return (
    <section className="portfolio-page-grid">
      {projects.map((project, index) => (
        <a
          className="portfolio-page-card portfolio-page-card-vertical button-reset"
          data-reveal
          data-delay={String(index % 3)}
          onMouseEnter={(event) => {
            event.currentTarget.dataset.hovered = "true";
          }}
          onMouseLeave={(event) => {
            delete event.currentTarget.dataset.hovered;
          }}
          href={`/portfolio/${project.slug}`}
          key={project.title + index}
        >
          <div className="portfolio-page-thumb portfolio-page-thumb-vertical">
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
          <div className="portfolio-page-copy">
            <p>{project.category}</p>
            <h2>{project.title}</h2>
            <span>{project.summary}</span>
          </div>
        </a>
      ))}
    </section>
  );
}
