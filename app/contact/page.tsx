
import type { Metadata } from "next";
import { ContactForm } from "@/app/contact/contact-form";
import { SiteHeader } from "@/components/site-header";
import { readSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "제작 문의",
  description:
    "웹·앱 제작 문의를 남겨주세요. 원하시는 서비스 범위와 일정을 알려주시면 빠르게 안내드립니다.",
  alternates: { canonical: "https://www.studiobyyou.kr/contact" },
  openGraph: {
    url: "https://www.studiobyyou.kr/contact",
    title: "제작 문의 | Studio by You",
    description:
      "웹·앱 제작 문의를 남겨주세요. 원하시는 서비스 범위와 일정을 알려주시면 빠르게 안내드립니다.",
  },
};

export default async function ContactPage() {
  const content = await readSiteContent();

  return (
    <main className="subpage-shell">
      <SiteHeader compact logoSrc={content.brand.logo} />
      <ContactForm
        email={content.contact.email}
        headline={content.contact.headline}
        plans={content.pricing.plans.map((plan) => ({
          name: plan.name,
          price: plan.price,
          description: plan.description,
        }))}
        privacyPolicy={content.contact.privacyPolicy}
      />
    </main>
  );
}
