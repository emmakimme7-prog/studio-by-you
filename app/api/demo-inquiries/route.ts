import { NextResponse } from "next/server";
import { readSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await readSiteContent();
  return NextResponse.json(content.contact.inquiries);
}
