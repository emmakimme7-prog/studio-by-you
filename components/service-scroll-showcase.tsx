"use client";

import { useMemo, useState } from "react";
import { ServiceInquiryButton } from "@/components/service-inquiry-button";
import type { OperatedService } from "@/lib/site-content";

type ServiceScrollShowcaseProps = {
  services: OperatedService[];
};

export function ServiceScrollShowcase({ services }: ServiceScrollShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeService = useMemo(() => services[activeIndex] ?? services[0], [activeIndex, services]);

  return (
    <section className="services-grid-section">
      <div className="services-scroll-shell services-scroll-shell-desktop">
        <div className="services-scroll-preview" data-reveal="scale">
          <div className="services-scroll-preview-frame">
            <div className="services-scroll-preview-image">
              <img alt={activeService.title} src={activeService.image} />
            </div>
          </div>
        </div>

        <div className="services-scroll-list">
          {services.map((service, index) => (
            <article
              className={`services-solution-row${activeIndex === index ? " is-active" : ""}`}
              data-index={index}
              key={service.title}
              onClick={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveIndex(index);
                }
              }}
            >
              <div className="services-solution-side">
                <div className="services-solution-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="services-solution-actions">
                  {service.link ? (
                    <a className="primary-link services-solution-cta" href={service.link} rel="noopener noreferrer" target="_blank">
                      솔루션 체험
                      <span aria-hidden="true">›</span>
                    </a>
                  ) : null}
                  <ServiceInquiryButton className="secondary-link button-reset services-solution-secondary" intent={service.title} label="이용 문의" />
                </div>
              </div>
              <div className="services-solution-main">
                <div className="services-solution-copy">
                  <h2>{service.title}</h2>
                  <strong className="services-solution-price">{service.pricing}</strong>
                  <p className="pre-line-copy">{service.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="services-mobile-list">
        {services.map((service, index) => (
          <article className="services-mobile-item" key={`${service.title}-mobile`}>
            <div className="services-mobile-image">
              <img alt={service.title} src={service.image} />
            </div>
            <div className="services-mobile-copy">
              <div className="services-mobile-head">
                <span className="services-mobile-index">{String(index + 1).padStart(2, "0")}</span>
                <strong className="services-solution-price">{service.pricing}</strong>
              </div>
              <h2>{service.title}</h2>
              <p className="pre-line-copy">{service.description}</p>
              <div className="services-mobile-actions">
                {service.link ? (
                  <a className="primary-link services-solution-cta" href={service.link} rel="noopener noreferrer" target="_blank">
                    솔루션 체험
                    <span aria-hidden="true">›</span>
                  </a>
                ) : null}
                <ServiceInquiryButton className="secondary-link button-reset services-solution-secondary" intent={service.title} label="이용 문의" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
