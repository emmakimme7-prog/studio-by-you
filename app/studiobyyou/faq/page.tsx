import { SiteHeader } from "@/components/site-header";
import { FaqClient } from "@/app/faq/faq-client";
import { readSiteContent } from "@/lib/site-content";

export default async function SharedFaqPage() {
  const content = await readSiteContent();

  return (
    <main className="subpage-shell faq-page-shell">
      <SiteHeader basePath="/studiobyyou" compact logoSrc={content.brand.logo} showContactCta={false} />
      <FaqClient description={content.faq.description} groups={content.faq.groups} title={content.faq.title} />
    </main>
  );
}
