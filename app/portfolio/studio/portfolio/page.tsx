import { readSiteContent } from "@/lib/site-content";
import { StudioDemoShell } from "../studio-demo-shell";

export default async function StudioDemoPortfolioPage() {
  const content = await readSiteContent();
  return <StudioDemoShell initialContent={content} initialFrontPage="portfolio" />;
}
