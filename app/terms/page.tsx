
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";

const siteUrl = "https://www.studiobyyou.kr";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "Studio by You 웹사이트 이용약관입니다. 서비스 이용 조건과 관련 권리·의무 사항을 안내합니다.",
  alternates: { canonical: `${siteUrl}/terms` },
  openGraph: {
    url: `${siteUrl}/terms`,
    title: "이용약관 | Studio by You",
    description: "Studio by You 웹사이트 이용약관입니다.",
  },
};

export default async function TermsPage() {
  const content = await readSiteContent();

  return (
    <main className="subpage-shell legal-page-shell">
      <SiteHeader compact logoSrc={content.brand.logo} />

      <section className="subpage-hero reveal-on-load">
        <h1>이용약관</h1>
        <p>시행일: 2026년 4월 18일</p>
      </section>

      <article className="legal-body">
        <section>
          <h2>제1조 (목적)</h2>
          <p>
            이 약관은 Studio by You(이하 &ldquo;회사&rdquo;)가 운영하는 웹사이트
            (https://www.studiobyyou.kr, 이하 &ldquo;사이트&rdquo;)에서 제공하는
            정보 열람 및 제작 문의 서비스(이하 &ldquo;서비스&rdquo;)의 이용에 관한
            조건과 절차를 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2>제2조 (용어의 정의)</h2>
          <ul>
            <li>
              <strong>&ldquo;이용자&rdquo;</strong>란 사이트에 접속하여 서비스를
              이용하는 모든 자를 말합니다.
            </li>
            <li>
              <strong>&ldquo;서비스&rdquo;</strong>란 사이트에서 제공하는 포트폴리오
              열람, 서비스 안내, 제작 문의 접수, 채팅 상담 등의 기능을 말합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2>제3조 (약관의 효력 및 변경)</h2>
          <ol>
            <li>이 약관은 사이트에 게시함으로써 효력이 발생합니다.</li>
            <li>
              회사는 합리적인 사유가 있을 경우 관련 법령에 위배되지 않는 범위 내에서
              약관을 변경할 수 있으며, 변경 시 시행 7일 전부터 사이트에 공지합니다.
            </li>
          </ol>
        </section>

        <section>
          <h2>제4조 (서비스의 내용)</h2>
          <p>회사가 제공하는 서비스는 다음과 같습니다.</p>
          <ul>
            <li>회사 소개 및 포트폴리오 열람</li>
            <li>서비스 안내 및 요금 정보 제공</li>
            <li>제작 문의 접수</li>
            <li>채팅 상담</li>
          </ul>
          <p>
            본 사이트는 별도의 회원 가입 절차 없이 누구나 이용할 수 있습니다.
          </p>
        </section>

        <section>
          <h2>제5조 (서비스의 중단)</h2>
          <p>
            회사는 시스템 점검, 장비 교체, 천재지변 등 부득이한 사유가 있을 경우
            사전 고지 후 서비스를 일시적으로 중단할 수 있습니다. 긴급한 경우 사후에
            고지할 수 있습니다.
          </p>
        </section>

        <section>
          <h2>제6조 (이용자의 의무)</h2>
          <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
          <ul>
            <li>타인의 정보를 도용하여 문의를 접수하는 행위</li>
            <li>사이트의 정상적인 운영을 방해하는 행위</li>
            <li>사이트에 게시된 콘텐츠를 무단으로 복제·배포하는 행위</li>
            <li>기타 관련 법령에 위반되는 행위</li>
          </ul>
        </section>

        <section>
          <h2>제7조 (지적재산권)</h2>
          <p>
            사이트에 게시된 디자인, 텍스트, 이미지, 포트폴리오 등 모든 콘텐츠에 대한
            저작권 및 지적재산권은 회사에 귀속됩니다. 이용자는 회사의 사전 서면 동의
            없이 이를 상업적으로 이용하거나 제3자에게 제공할 수 없습니다.
          </p>
        </section>

        <section>
          <h2>제8조 (면책 조항)</h2>
          <ol>
            <li>
              회사는 천재지변 또는 이에 준하는 불가항력으로 인해 서비스를 제공할 수
              없는 경우 책임이 면제됩니다.
            </li>
            <li>
              회사는 이용자가 사이트에 게시한 정보(문의 내용 등)의 신뢰도, 정확성에
              대해 책임을 지지 않습니다.
            </li>
          </ol>
        </section>

        <section>
          <h2>제9조 (분쟁 해결)</h2>
          <p>
            이 약관과 관련하여 분쟁이 발생한 경우 회사의 소재지를 관할하는 법원을
            전속 관할 법원으로 합니다.
          </p>
        </section>

        <section>
          <h2>부칙</h2>
          <p>이 약관은 2026년 4월 18일부터 시행합니다.</p>
        </section>
      </article>
    </main>
  );
}
