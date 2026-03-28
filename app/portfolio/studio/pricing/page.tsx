export const dynamic = "force-dynamic";

import { readSiteContent } from "@/lib/site-content";
import { StudioDemoShell } from "../studio-demo-shell";

export default async function StudioDemoPricingPage() {
  const content = await readSiteContent();
  return <StudioDemoShell initialContent={content} initialFrontPage="pricing" />;
}
