import type { Metadata } from "next";
import { readSiteContent } from "@/lib/site-content";
import { StudioDemoShell } from "./studio-demo-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function StudioDemoPage() {
  const content = await readSiteContent();
  return <StudioDemoShell initialContent={content} />;
}
