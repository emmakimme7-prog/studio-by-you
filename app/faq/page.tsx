export const dynamic = "force-dynamic";


import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { FaqClient } from "./faq-client";
import { readSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description:
    "웹·앱 제작 서비스 진행 방식, 디자인, 계약 일정 등 자주 묻는 질문과 답변을 확인하세요.",
  alternates: { canonical: "https://www.studiobyyou.kr/faq" },
  openGraph: {
    url: "https://www.studiobyyou.kr/faq",
    title: "자주 묻는 질문 | Studio by You",
    description:
      "웹·앱 제작 서비스 진행 방식, 디자인, 계약 일정 등 자주 묻는 질문과 답변을 확인하세요.",
  },
};

export default async function FaqPage() {
  const content = await readSiteContent();
  return (
    <main className="subpage-shell faq-page-shell">
      <SiteHeader compact logoSrc={content.brand.logo} />
      <FaqClient description={content.faq.description} groups={content.faq.groups} title={content.faq.title} />
    </main>
  );
}
