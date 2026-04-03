"use client";

const relatedSites = [
  { label: "챗허브 | 고객 상담 서비스", href: "https://chathub.studiobyyou.kr" },
  { label: "세줄아침 | 루틴 콘텐츠 서비스", href: "https://studiobyyou.kr/?site=sejulachim-temp" },
  { label: "폼허브 | 신청서·수집 폼 서비스", href: "https://studiobyyou.kr/?site=formhub-temp" },
  { label: "픽허브 | 설문·투표 서비스", href: "https://survey.studiobyyou.kr" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__meta">
          <p>상호명: OOO</p>
          <p>대표자: OOO</p>
          <p>사업자등록번호: OOO-OO-OOOOO</p>
          <p>통신판매업신고번호: OOO-OO-OOOO</p>
          <p>주소: OOO</p>
          <p>이메일: OOO@OOO.COM</p>
        </div>

        <div className="site-footer__right">
          <div className="site-footer__brand">
            <img
              alt="Studio by You"
              className="site-footer__logo"
              height={42}
              src="/home-assets/logo.png"
              width={186}
            />
            <div className="site-footer__brand-copy">
              <p>브랜드 웹사이트 · 서비스 구축 · 운영형 관리자 페이지</p>
            </div>
          </div>

          <div className="site-footer__links">
            <select
              className="site-footer__select"
              defaultValue=""
              id="related-site-select"
              onChange={event => {
                const nextHref = event.target.value;
                if (!nextHref) return;
                window.open(nextHref, "_blank", "noopener,noreferrer");
                event.currentTarget.value = "";
              }}
            >
              <option value="">관련 사이트</option>
              {relatedSites.map(site => (
                <option key={site.label} value={site.href}>
                  {site.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
}
