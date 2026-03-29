import Image from "next/image";

type HeaderNavLink = {
  href: string;
  iconSrc?: string;
  label: string;
  shortLabel?: string;
};

type SiteHeaderProps = {
  basePath?: string;
  compact?: boolean;
  homeHref?: string;
  logoSrc: string;
  mobileLogoSrc?: string;
  navLinks?: HeaderNavLink[];
  contactHref?: string;
  showContactCta?: boolean;
};

export function SiteHeader({
  basePath = "",
  compact = false,
  homeHref,
  logoSrc,
  mobileLogoSrc,
  navLinks,
  contactHref,
  showContactCta = true,
}: SiteHeaderProps) {
  const links =
    navLinks ??
    [
      { href: `${basePath}/portfolio` || "/portfolio", iconSrc: "/home-assets/task.svg", label: "포트폴리오" },
      { href: `${basePath}/services` || "/services", iconSrc: "/home-assets/setting.svg", label: "서비스" },
      { href: `${basePath}/pricing` || "/pricing", iconSrc: "/home-assets/pay.svg", label: "요금" },
      { href: `${basePath}/faq` || "/faq", iconSrc: "/home-assets/question.svg", label: "자주 묻는 질문", shortLabel: "질문" },
    ].filter((link) => !(basePath === "/studiobyyou" && (link.label === "요금" || link.label === "서비스")));
  const resolvedHomeHref = homeHref ?? (basePath || "/");
  const resolvedContactHref = contactHref ?? (`${basePath}/contact` || "/contact");
  const resolvedMobileLogoSrc = mobileLogoSrc ?? "/home-assets/symbol.png";
  const isDynamicLogo = logoSrc.startsWith("data:");

  return (
    <div className={`site-header-shell${compact ? " is-compact" : ""}`}>
      <header className={`site-header${compact ? " is-compact" : ""}`}>
        <a className="symbol-brand" href={resolvedHomeHref}>
          {isDynamicLogo ? (
            <img alt="Studio by You" className="header-logo header-logo-desktop" src={logoSrc} />
          ) : (
            <Image
              alt="Studio by You"
              className="header-logo header-logo-desktop"
              height={34}
              src={logoSrc}
              width={148}
            />
          )}
          <img alt="Studio by You" className="header-logo header-logo-mobile" src={resolvedMobileLogoSrc} />
        </a>
        <div className="site-header-actions">
          <nav className="minimal-nav">
            {links.map((link) => (
              <a href={link.href} key={link.label}>
                {link.label}
              </a>
            ))}
          </nav>
          {showContactCta ? (
            <a className="hero-cta-chip" href={resolvedContactHref}>
              제작 문의
            </a>
          ) : null}
        </div>
        <nav className="mobile-icon-nav" aria-label="모바일 메뉴">
          {links.map((link) => (
            <a className="mobile-icon-link" href={link.href} key={link.label}>
              <img alt="" aria-hidden="true" src={link.iconSrc || "/home-assets/task.svg"} />
              <span>{link.shortLabel ?? link.label}</span>
            </a>
          ))}
          {showContactCta ? (
            <a className="mobile-icon-link is-accent" href={resolvedContactHref}>
              <img alt="" aria-hidden="true" src="/home-assets/mail.svg" />
              <span>문의</span>
            </a>
          ) : null}
        </nav>
      </header>
    </div>
  );
}
