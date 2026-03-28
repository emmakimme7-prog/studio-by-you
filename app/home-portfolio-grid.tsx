"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isVideoSrc } from "@/lib/client-upload";
import { LazyVideo } from "@/components/lazy-video";
import type { SiteProject } from "@/lib/site-content";

function getListingThumbnail(src: string) {
  return src;
}

function enhanceDetailHtml(html: string) {
  return html.replace(/<img\b(?![^>]*\bloading=)([^>]*)>/gi, '<img loading="lazy" decoding="async"$1>');
}

export function HomePortfolioGrid({ projects }: { projects: SiteProject[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isDetailReady, setIsDetailReady] = useState(false);

  const activeProject = useMemo(
    () => projects.find((p) => p.slug === activeSlug) ?? null,
    [activeSlug, projects],
  );
  const activeDetailHtml = useMemo(
    () => (activeProject ? enhanceDetailHtml(activeProject.detailHtml) : ""),
    [activeProject],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";
    const raf = window.requestAnimationFrame(() => setIsDetailReady(true));

    return () => {
      window.cancelAnimationFrame(raf);
      setIsDetailReady(false);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [activeProject]);

  return (
    <>
      <section className="portfolio-page-grid">
        {projects.map((project, index) => (
          <button
            className="portfolio-page-card portfolio-page-card-vertical button-reset"
            key={project.title + index}
            onClick={() => setActiveSlug(project.slug)}
            type="button"
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
          </button>
        ))}
      </section>

      {isMounted && activeProject
        ? createPortal(
            <div className="portfolio-modal-backdrop" onClick={() => setActiveSlug(null)} role="presentation">
              <div
                aria-modal="true"
                className="portfolio-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <div className="portfolio-modal-head">
                  <div>
                    <p>{activeProject.category}</p>
                    <h2>{activeProject.title}</h2>
                  </div>
                  <div className="portfolio-modal-actions">
                    {activeProject.siteUrl ? (
                      <a className="primary-link" href={activeProject.siteUrl} rel="noreferrer" target="_blank">
                        홈페이지
                      </a>
                    ) : null}
                    {activeProject.adminUrl ? (
                      <a className="secondary-link" href={activeProject.adminUrl} rel="noreferrer" target="_blank">
                        관리자페이지
                      </a>
                    ) : null}
                    <button
                      aria-label="모달 닫기"
                      className="portfolio-modal-close button-reset"
                      onClick={() => setActiveSlug(null)}
                      type="button"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </div>
                {isDetailReady ? (
                  <div
                    className="portfolio-detail-html"
                    dangerouslySetInnerHTML={{ __html: activeDetailHtml }}
                  />
                ) : (
                  <div className="portfolio-detail-loading" aria-hidden="true">
                    <div className="portfolio-detail-loading-block is-title" />
                    <div className="portfolio-detail-loading-block is-hero" />
                    <div className="portfolio-detail-loading-block" />
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
