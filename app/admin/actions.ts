"use server";

import { Buffer } from "buffer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  verifyPassword,
} from "@/lib/admin-auth";
import { readSiteContent, writeSiteContent } from "@/lib/site-content";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function requireFields(values: string[]) {
  return values.every((value) => value.length > 0);
}

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

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

async function fileToDataUrl(file: File) {
  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function loginAction(_: { error?: string } | undefined, formData: FormData) {
  const password = getField(formData, "password");

  if (!verifyPassword(password)) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function updateContentAction(
  _: { success?: string; error?: string } | undefined,
  formData: FormData,
) {
  try {
    const content = await readSiteContent();
    const section = getField(formData, "saveSection");
    console.log("[action] section:", section);
    let nextContent = content;
    let requiredValues: string[] = [];

    if (section === "brand") {
      const logoFile = getFile(formData, "brandLogo");
      const logoDataUrl = getField(formData, "brandLogo");
      const logo = logoFile
        ? await fileToDataUrl(logoFile)
        : logoDataUrl || content.brand.logo;
      nextContent = {
        ...content,
        brand: {
          tagline: getField(formData, "brandTagline"),
          name: content.brand.name,
          logo,
        },
        hero: {
          ...content.hero,
          title: getField(formData, "heroTitle"),
          description: getField(formData, "heroDescription"),
        },
      };

      requiredValues = [
        nextContent.brand.tagline,
        nextContent.brand.logo,
        nextContent.hero.title,
        nextContent.hero.description,
      ];
    }

    if (section === "portfolio") {
      const categoryPayload = getField(formData, "portfolioCategoriesPayload");
      const projectsPayload = getField(formData, "portfolioProjectsPayload");
      const nextCategories = JSON.parse(categoryPayload) as string[];
      const parsedProjects = JSON.parse(projectsPayload) as Array<{
        title: string;
        slug: string;
        category: string;
        summary: string;
        thumbnailImage: string;
        siteUrl?: string;
        adminUrl?: string;
        detailHtml: string;
        detailImages?: string[];
      }>;
      const nextProjects = await Promise.all(
        parsedProjects.map(async (project, index) => {
          const thumbnailFile = getFile(formData, `projectThumbnail${index}`);
          const thumbnailImage = thumbnailFile
            ? await fileToDataUrl(thumbnailFile)
            : project.thumbnailImage;

          return {
            ...project,
            title: project.title.trim(),
            slug: toSlug(project.slug, `project-${index + 1}`),
            category: project.category.trim(),
            summary: project.summary.trim(),
            thumbnailImage,
            siteUrl: (project.siteUrl || "").trim(),
            adminUrl: (project.adminUrl || "").trim(),
            detailHtml: project.detailHtml,
            detailImages: Array.isArray(project.detailImages) ? project.detailImages : [],
          };
        }),
      );

      nextContent = {
        ...content,
        projectsIntro: getField(formData, "projectsIntro"),
        portfolioCategories: nextCategories.map((item) => item.trim()).filter(Boolean),
        projects: nextProjects,
      };

      requiredValues = [
        nextContent.projectsIntro,
        ...nextContent.portfolioCategories,
        ...nextContent.projects.flatMap((item) => [
          item.title,
          item.slug,
          item.category,
          item.summary,
          item.thumbnailImage,
          item.detailHtml,
        ]),
      ];
    }

    if (section === "services") {
      const servicesPayload = getField(formData, "operatedServicesPayload");
      if (!servicesPayload) {
        return { error: "서비스 데이터가 전달되지 않았습니다. 페이지를 새로고침 후 다시 시도해주세요." };
      }
      const parsedServices = JSON.parse(servicesPayload) as Array<{
        title: string;
        description: string;
        image: string;
        link: string;
        badge?: string;
        pricing: string;
        pricingDetail?: string;
      }>;
      const nextServices = await Promise.all(
        parsedServices.map(async (service, index) => {
          const imageFile = getFile(formData, `serviceImage${index}`);
          return {
            title: service.title.trim(),
            description: service.description.trim(),
            image: imageFile ? await fileToDataUrl(imageFile) : service.image,
            link: service.link.trim(),
            badge: service.badge?.trim() ?? "",
            pricing: service.pricing.trim(),
            pricingDetail: service.pricingDetail?.trim() ?? "",
          };
        }),
      );

      nextContent = {
        ...content,
        operatedServices: nextServices,
      };

      requiredValues = nextContent.operatedServices.flatMap((s) => [s.title, s.description, s.pricing]);
    }

    if (section === "process") {
      const processPayload = getField(formData, "processStepsPayload");
      if (!processPayload) {
        return { error: "진행방식 데이터가 전달되지 않았습니다. 페이지를 새로고침 후 다시 시도해주세요." };
      }
      const parsedSteps = JSON.parse(processPayload) as Array<{ title: string; subtitle?: string; image: string }>;
      const nextProcessSteps = await Promise.all(
        parsedSteps.map(async (step, index) => {
          const imageFile = getFile(formData, `processImage${index}`);
          return {
            title: step.title.trim(),
            subtitle: step.subtitle?.trim() ?? "",
            image: imageFile ? await fileToDataUrl(imageFile) : step.image,
          };
        }),
      );

      nextContent = {
        ...content,
        processTitle: getField(formData, "processTitle"),
        processSteps: nextProcessSteps,
      };

      requiredValues = [
        nextContent.processTitle,
        ...nextContent.processSteps.flatMap((step) => [step.title, step.image]),
      ];
    }

    if (section === "pricing") {
      const pricingPayload = getField(formData, "pricingPlansPayload");
      const nextPlans = JSON.parse(pricingPayload) as Array<{
        name: string;
        price: string;
        description: string;
        points: string[];
        featured?: boolean;
      }>;

      nextContent = {
        ...content,
        pricing: {
          title: getField(formData, "pricingTitle"),
          description: getField(formData, "pricingDescription"),
          promo: {
            enabled: formData.get("pricingPromoEnabled") === "on",
            message: getField(formData, "pricingPromoMessage"),
          },
          plans: nextPlans.map((plan) => ({
            name: plan.name.trim(),
            price: plan.price.trim(),
            description: plan.description.trim(),
            points: (Array.isArray(plan.points) ? plan.points : []).map((point) => point.trim()),
            featured: !!plan.featured,
          })),
        },
      };

      requiredValues = [
        nextContent.pricing.title,
        nextContent.pricing.description,
        nextContent.pricing.promo.message,
        ...nextContent.pricing.plans.flatMap((plan) => [
          plan.name,
          plan.price,
          plan.description,
          ...plan.points,
        ]),
      ];
    }

    if (section === "faq") {
      const faqPayload = getField(formData, "faqGroupsPayload");
      const parsedGroups = JSON.parse(faqPayload) as Array<{
        title: string;
        items: Array<{ question: string; answer: string }>;
      }>;

      const nextGroups = parsedGroups.map((group) => ({
        title: group.title.trim(),
        items: group.items.map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        })),
      }));

      nextContent = {
        ...content,
        faq: {
          title: content.faq.title,
          description: content.faq.description,
          groups: nextGroups,
        },
      };

      requiredValues = [
        ...nextContent.faq.groups.flatMap((group) => [
          group.title,
          ...group.items.flatMap((item) => [item.question, item.answer]),
        ]),
      ];
    }

    if (section === "chat") {
      const quickActionsPayload = getField(formData, "chatQuickActionsPayload");
      const quickActions = JSON.parse(quickActionsPayload) as string[];

      nextContent = {
        ...content,
        chatWidget: {
          launcherLabel: getField(formData, "chatLauncherLabel"),
          panelTitle: getField(formData, "chatPanelTitle"),
          panelDescription: getField(formData, "chatPanelDescription"),
          welcomeMessage: getField(formData, "chatWelcomeMessage"),
          quickActions: quickActions.map((item) => item.trim()).filter(Boolean),
          privacyConsentLabel: getField(formData, "chatPrivacyConsentLabel"),
        },
      };

      requiredValues = [
        nextContent.chatWidget.launcherLabel,
        nextContent.chatWidget.panelTitle,
        nextContent.chatWidget.panelDescription,
        nextContent.chatWidget.welcomeMessage,
        nextContent.chatWidget.privacyConsentLabel,
        ...nextContent.chatWidget.quickActions,
      ];
    }

    if (section === "contact") {
      nextContent = {
        ...content,
        contact: {
          headline: getField(formData, "contactHeadline"),
          email: getField(formData, "contactEmail"),
          privacyPolicy: getField(formData, "contactPrivacyPolicy"),
          inquiries: content.contact.inquiries,
        },
      };

      requiredValues = [
        nextContent.contact.headline,
        nextContent.contact.email,
        nextContent.contact.privacyPolicy,
      ];
    }

    if (!section) {
      return { error: "저장할 탭을 다시 선택해주세요." };
    }

    if (!requireFields(requiredValues)) {
      return { error: "현재 탭의 필수 항목을 채워주세요." };
    }

    console.log("[action] writing content for section:", section);
    await writeSiteContent(nextContent);
    console.log("[action] write done, revalidating");
    revalidatePath("/", "layout");
    revalidatePath("/portfolio", "layout");
    revalidatePath("/portfolio/studio", "layout");
    revalidatePath("/services", "layout");
    revalidatePath("/contact", "layout");
    revalidatePath("/pricing", "layout");
    revalidatePath("/faq", "layout");
    revalidatePath("/admin", "layout");
    revalidatePath("/studiobyyou", "layout");
    nextContent.projects.forEach((project) => revalidatePath(`/portfolio/${project.slug}`, "layout"));

    console.log("[action] done, returning success");
    return { success: "현재 탭 내용이 저장되었습니다." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.";
    console.error("[action] caught error:", message);
    return { error: message };
  }
}
