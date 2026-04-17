
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";

const siteUrl = "https://www.studiobyyou.kr";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "Studio by You의 개인정보처리방침입니다. 수집하는 개인정보 항목, 이용 목적, 보유 기간 등을 안내합니다.",
  alternates: { canonical: `${siteUrl}/privacy` },
  openGraph: {
    url: `${siteUrl}/privacy`,
    title: "개인정보처리방침 | Studio by You",
    description:
      "Studio by You의 개인정보처리방침입니다.",
  },
};

export default async function PrivacyPage() {
  const content = await readSiteContent();

  return (
    <main className="subpage-shell legal-page-shell">
      <SiteHeader compact logoSrc={content.brand.logo} />

      <section className="subpage-hero reveal-on-load">
        <h1>개인정보처리방침</h1>
        <p>시행일: 2026년 4월 18일</p>
      </section>

      <article className="legal-body">
        <section>
          <h2>1. 개인정보의 처리 목적</h2>
          <p>
            Studio by You(이하 &ldquo;회사&rdquo;)는 다음의 목적을 위해 개인정보를
            처리합니다. 처리한 개인정보는 아래 목적 이외의 용도로는 사용하지 않으며,
            목적이 변경되는 경우 별도의 동의를 받는 등 필요한 조치를 이행합니다.
          </p>
          <ul>
            <li>
              <strong>제작 문의 접수 및 상담:</strong> 이름, 이메일, 연락처, 문의
              내용을 수집하여 문의에 대한 답변 및 상담을 진행합니다.
            </li>
            <li>
              <strong>채팅 상담:</strong> 사이트 내 채팅 위젯을 통해 입력된 메시지를
              수집하여 실시간 상담을 제공합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2>2. 수집하는 개인정보 항목</h2>
          <ul>
            <li>
              <strong>제작 문의 폼:</strong> 이름, 이메일, 전화번호, 문의 내용
            </li>
            <li>
              <strong>채팅 상담:</strong> 대화 내용 (별도의 개인정보를 요구하지
              않습니다)
            </li>
          </ul>
        </section>

        <section>
          <h2>3. 개인정보의 처리 및 보유 기간</h2>
          <p>
            회사는 법령에 따른 보유 기간 또는 정보 주체로부터 동의받은 기간 내에서
            개인정보를 처리·보유합니다.
          </p>
          <ul>
            <li>제작 문의 및 상담 기록: <strong>3년</strong> (상담 완료 후)</li>
            <li>
              관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. 개인정보의 제3자 제공</h2>
          <p>
            회사는 정보 주체의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
            다만, 법률에 특별한 규정이 있는 경우는 예외로 합니다.
          </p>
        </section>

        <section>
          <h2>5. 개인정보의 파기 절차 및 방법</h2>
          <p>
            회사는 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이
            개인정보를 파기합니다. 전자적 파일은 복구할 수 없는 방법으로 삭제하며,
            종이 문서는 분쇄하거나 소각합니다.
          </p>
        </section>

        <section>
          <h2>6. 정보 주체의 권리·의무 및 행사 방법</h2>
          <p>
            정보 주체는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리 정지를
            요청할 수 있습니다. 요청은 아래 연락처로 문의해 주시면 지체 없이
            조치하겠습니다.
          </p>
        </section>

        <section>
          <h2>7. 개인정보의 안전성 확보 조치</h2>
          <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
          <ul>
            <li>데이터 전송 시 SSL/TLS 암호화 적용</li>
            <li>데이터베이스 접근 권한 제한</li>
            <li>개인정보 취급 인원 최소화</li>
          </ul>
        </section>

        <section>
          <h2>8. 개인정보 보호책임자</h2>
          <ul>
            <li>상호: 스튜디오 바이유 (대표: 김진래)</li>
            <li>이메일: hello@studiobyyou.kr</li>
            <li>주소: 울산광역시 북구 호계9길 64-1, 303호(호계동)</li>
          </ul>
        </section>

        <section>
          <h2>9. 방침 변경에 관한 사항</h2>
          <p>
            이 개인정보처리방침은 2026년 4월 18일부터 적용됩니다. 변경 사항이 있을
            경우 시행 7일 전부터 사이트 공지를 통해 안내합니다.
          </p>
        </section>
      </article>
    </main>
  );
}
