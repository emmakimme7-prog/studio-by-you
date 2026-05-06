import type { Metadata } from "next";
import "./globals.css";
import { SiteChatWidget } from "./site-chat-widget";
import { ScrollRevealInit } from "@/components/scroll-reveal-init";
import { SiteFooter } from "@/components/site-footer";
import { readSiteContent } from "@/lib/site-content";

const siteUrl = "https://www.studiobyyou.kr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Studio by You | 웹·앱 디자인 & 개발 스튜디오",
    template: "%s | Studio by You",
  },
  description:
    "브랜드 소개 사이트부터 실제 운영 가능한 앱과 관리자 페이지까지. 깔끔한 디자인과 현실적인 구축 경험을 제공하는 웹·앱 제작 스튜디오입니다.",
  keywords: [
    "웹 제작",
    "앱 개발",
    "웹사이트 제작",
    "랜딩페이지 제작",
    "포트폴리오 사이트",
    "브랜드 사이트",
    "관리자 페이지",
    "프리랜서 개발",
    "Studio by You",
    "스튜디오 바이 유",
  ],
  authors: [{ name: "Studio by You", url: siteUrl }],
  creator: "Studio by You",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName: "Studio by You",
    title: "Studio by You | 웹·앱 디자인 & 개발 스튜디오",
    description:
      "브랜드 소개 사이트부터 실제 운영 가능한 앱과 관리자 페이지까지. 깔끔한 디자인과 현실적인 구축 경험을 제공하는 웹·앱 제작 스튜디오입니다.",
    images: [
      {
        url: "/seo.jpg",
        width: 1200,
        height: 630,
        alt: "Studio by You - 웹·앱 디자인 & 개발 스튜디오",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio by You | 웹·앱 디자인 & 개발 스튜디오",
    description:
      "브랜드 소개 사이트부터 실제 운영 가능한 앱과 관리자 페이지까지. 깔끔한 디자인과 현실적인 구축 경험을 제공합니다.",
    images: ["/seo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    other: {
      // Meta(Facebook) 비즈니스 인증 — 도메인 인증용
      // shotping(서브도메인) 의 Meta App Review 의 비즈니스 인증 단계에서 요구
      "facebook-domain-verification": "0akrt1b7q3bqp788a7xd2qlsp5k6ot",
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Studio by You",
  url: siteUrl,
  logo: `${siteUrl}/home-assets/logo.png`,
  image: `${siteUrl}/seo.jpg`,
  description:
    "브랜드 소개 사이트부터 실제 운영 가능한 앱과 관리자 페이지까지. 깔끔한 디자인과 현실적인 구축 경험을 제공하는 웹·앱 제작 스튜디오입니다.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "KR",
  },
  priceRange: "₩₩",
  serviceType: ["웹 제작", "앱 개발", "UI/UX 디자인", "관리자 페이지 개발"],
  sameAs: [],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = await readSiteContent();

  return (
    <html className="force-motion" lang="ko">
      <head>
        <script
          async
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1580929910190138"
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          type="application/ld+json"
        />
        <ScrollRevealInit />
        {children}
        <SiteFooter />
        <SiteChatWidget config={content.chatWidget} privacyPolicy={content.contact.privacyPolicy} />
      </body>
    </html>
  );
}
