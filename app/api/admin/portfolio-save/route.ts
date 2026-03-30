import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { readSiteContent, writeSiteContent } from "@/lib/site-content";

function toSlug(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || fallback;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      categories?: string[];
      projects?: Array<{
        title?: string;
        slug?: string;
        category?: string;
        summary?: string;
        thumbnailImage?: string;
        siteUrl?: string;
        adminUrl?: string;
        detailHtml?: string;
        detailImages?: string[];
      }>;
    };

    const content = await readSiteContent();
    const categories = Array.isArray(body.categories) ? body.categories.map((item) => item.trim()).filter(Boolean) : content.portfolioCategories;
    const projects = Array.isArray(body.projects)
      ? body.projects.map((project, index) => ({
          title: String(project.title || "").trim(),
          slug: toSlug(String(project.slug || ""), `project-${index + 1}`),
          category: String(project.category || "").trim(),
          summary: String(project.summary || "").trim(),
          thumbnailImage: String(project.thumbnailImage || "").trim(),
          siteUrl: String(project.siteUrl || "").trim(),
          adminUrl: String(project.adminUrl || "").trim(),
          detailHtml: String(project.detailHtml || "").trim(),
          detailImages: Array.isArray(project.detailImages) ? project.detailImages.filter(Boolean) : [],
        }))
      : content.projects;

    if (!projects.every((project) => project.title && project.slug && project.category && project.thumbnailImage && project.detailHtml)) {
      return NextResponse.json({ error: "필수 항목을 모두 입력해주세요." }, { status: 400 });
    }

    const nextContent = {
      ...content,
      portfolioCategories: categories,
      projects,
    };

    await writeSiteContent(nextContent);

    revalidatePath("/admin", "layout");
    revalidatePath("/", "layout");
    revalidatePath("/portfolio", "layout");
    revalidatePath("/portfolio/studio", "layout");
    revalidatePath("/studiobyyou", "layout");
    revalidatePath("/studiobyyou/portfolio", "layout");
    nextContent.projects.forEach((project) => revalidatePath(`/portfolio/${project.slug}`, "layout"));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Portfolio save failed", error);
    return NextResponse.json({ error: "포트폴리오 저장에 실패했습니다." }, { status: 500 });
  }
}
