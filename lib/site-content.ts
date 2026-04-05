import { promises as fs } from "fs";
import path from "path";
import { unstable_cache, revalidateTag } from "next/cache";
import { list, put } from "@vercel/blob";
import {
  getMongoDatabase,
  hasMongoConfig,
  SITE_CONTENT_COLLECTION,
  SITE_CONTENT_DOCUMENT_ID,
} from "@/lib/mongodb";

export type SiteProject = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  thumbnailImage: string;
  siteUrl?: string;
  adminUrl?: string;
  detailHtml: string;
  detailImages: string[];
};

export type ProcessStep = {
  title: string;
  subtitle?: string;
  image: string;
};

export type PricingPlan = {
  name: string;
  price: string;
  description: string;
  points: string[];
  featured?: boolean;
};

export type PricingPromo = {
  enabled: boolean;
  message: string;
};

export type OperatedService = {
  title: string;
  description: string;
  image: string;
  link: string;
  badge?: string;
  pricing: string;
  pricingDetail?: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqGroup = {
  title: string;
  items: FaqItem[];
};

export type ContactInquiry = {
  id: string;
  createdAt: string;
  inquiryType: string;
  plan: string;
  serviceTypes: string[];
  message: string;
  name: string;
  phone: string;
  attachments: string[];
};

export type ChatWidgetSettings = {
  launcherLabel: string;
  panelTitle: string;
  panelDescription: string;
  welcomeMessage: string;
  quickActions: string[];
  privacyConsentLabel: string;
};

export type SiteContent = {
  brand: {
    name: string;
    tagline: string;
    logo: string;
  };
  hero: {
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta?: string;
    media?: string;
    mediaPositionX?: number;
    mediaPositionY?: number;
    mediaScale?: number;
    taglineFontSize?: number;
    taglineFontWeight?: string;
    titleFontSize?: number;
    titleFontWeight?: string;
    descriptionFontSize?: number;
    descriptionFontWeight?: string;
  };
  metrics: Array<{
    label: string;
    value: string;
    accent?: boolean;
  }>;
  servicesIntro: string;
  services: Array<{
    title: string;
    description: string;
  }>;
  projectsIntro: string;
  portfolioCategories: string[];
  projects: SiteProject[];
  operatedServices: OperatedService[];
  processTitle: string;
  processSteps: ProcessStep[];
  pricing: {
    title: string;
    description: string;
    promo: PricingPromo;
    plans: PricingPlan[];
  };
  faq: {
    title: string;
    description: string;
    groups: FaqGroup[];
  };
  contact: {
    headline: string;
    email: string;
    privacyPolicy: string;
    inquiries: ContactInquiry[];
  };
  chatWidget: ChatWidgetSettings;
  dashboard: {
    stats: Array<{
      label: string;
      value: string;
    }>;
    leads: Array<{
      name: string;
      channel: string;
      request: string;
    }>;
    notes: Array<{
      title: string;
      body: string;
    }>;
  };
};

type SiteContentDocument = {
  _id: string;
  content: SiteContent;
  updatedAt: Date;
};

const SITE_CONTENT_TAG = "site-content";
const TY_PORTFOLIO_PATH = "/portfolio/ty";
const SITE_CONTENT_BLOB_PATH = "site-content.json";

const contentPath = path.join(process.cwd(), "data", "site-content.json");
const fallbackProjectThumbs = [
  "/home-assets/frame-2.jpg",
  "/home-assets/frame-3.jpg",
  "/home-assets/frame-4.jpg",
];
const fallbackProjectDetails = [
  [
    "/home-assets/project-main.jpg",
    "/home-assets/project-1.jpg",
    "/home-assets/project-2.jpg",
  ],
  [
    "/home-assets/portfolio-main-wide.jpg",
    "/home-assets/project-2.jpg",
    "/home-assets/project-3.jpg",
  ],
  [
    "/home-assets/project-3.jpg",
    "/home-assets/project-1.jpg",
    "/home-assets/portfolio-main-wide.jpg",
  ],
];
const fallbackOperatedServices: OperatedService[] = [
  {
    title: "서비스 이름",
    description: "서비스에 대한 간단한 설명을 입력하세요.",
    image: "/home-assets/process-1.png",
    link: "#",
    badge: "",
    pricing: "무료",
    pricingDetail: "",
  },
];

const fallbackProcessImages = [
  "/home-assets/process-1.png",
  "/home-assets/process-2.png",
  "/home-assets/process-3.png",
  "/home-assets/process-4.png",
  "/home-assets/process-5.png",
  "/home-assets/process-6.png",
];
const fallbackProcessTitles = [
  "서비스 제작을 위한 자료 전달",
  "제작 비용 및 기간 안내",
  "유선 & 채팅 & 대면 미팅 진행",
  "기능 & 디자인 컨셉 조율",
  "서비스 초안 피드백",
  "서비스 배포 및 제작 종료",
];
const fallbackPricingPlans: PricingPlan[] = [
  {
    name: "Landing",
    price: "1.8M~",
    description: "브랜드 소개, 이벤트, 제품 소개에 맞는 단일 목적형 페이지",
    points: ["메인 랜딩 1페이지", "반응형 UI", "문의 연결", "배포 지원"],
  },
  {
    name: "Website",
    price: "3.5M~",
    description: "브랜드를 더 설득력 있게 보여주는 다중 페이지형 사이트",
    points: ["메인 + 서브 페이지", "콘텐츠 구조 설계", "디자인/프론트 구현", "기본 관리자 기능"],
    featured: true,
  },
  {
    name: "Product",
    price: "6.0M~",
    description: "웹앱, 예약형 서비스, 운영 기능이 포함된 실전형 구축",
    points: ["서비스 흐름 설계", "프론트 + 관리자", "DB 연동", "배포/운영 구조"],
  },
];
const fallbackPricingPromo: PricingPromo = {
  enabled: true,
  message: "오픈 기념 50% 할인 이벤트 🎉",
};
const fallbackChatWidget: ChatWidgetSettings = {
  launcherLabel: "채팅 문의",
  panelTitle: "Studio by You",
  panelDescription: "여기서 바로 대화를 이어갈 수 있어요.",
  welcomeMessage: "안녕하세요. 어떤 사이트를 만들고 싶은지 남겨주시면 이 창에서 바로 답장을 이어갈게요.",
  quickActions: ["홈페이지 제작", "브랜딩 사이트", "관리자 페이지", "빠른 문의"],
  privacyConsentLabel: "개인정보 수집 및 이용에 동의합니다.",
};
const fallbackFaqGroups: FaqGroup[] = [
  {
    title: "서비스 진행",
    items: [
      {
        question: "제작 문의 후 얼마나 빨리 답변을 받을 수 있나요?",
        answer: "보통 평일 기준 순차적으로 확인하고 있으며, 전달해주신 내용이 구체적일수록 더 빠르게 일정과 범위를 안내드릴 수 있어요.",
      },
      {
        question: "어떤 자료를 먼저 준비하면 좋나요?",
        answer: "서비스 목적, 필요한 페이지 수, 원하는 오픈 일정, 참고 사이트, 브랜드 톤을 알려주시면 초기 상담이 훨씬 정확해집니다.",
      },
      {
        question: "기획이 없어도 진행할 수 있나요?",
        answer: "가능합니다. 필요한 기능과 흐름이 아직 정리되지 않았더라도, 상담 단계에서 구조와 범위를 함께 정리해드려요.",
      },
    ],
  },
  {
    title: "디자인과 개발",
    items: [
      {
        question: "디자인과 개발을 같이 맡길 수 있나요?",
        answer: "네. 브랜딩 톤에 맞춘 UI 디자인과 실제 운영 가능한 프론트 구현, 관리자 페이지까지 한 번에 진행할 수 있습니다.",
      },
      {
        question: "관리자 페이지도 포함되나요?",
        answer: "프로젝트 목적에 따라 포함 가능합니다. 포트폴리오 관리, 문의 관리, 콘텐츠 수정 같은 운영 기능을 같이 설계할 수 있어요.",
      },
      {
        question: "모바일 대응도 되나요?",
        answer: "기본적으로 모바일과 데스크톱을 함께 고려해 반응형으로 제작합니다. 필요한 경우 모바일 우선 흐름으로 따로 설계할 수도 있어요.",
      },
    ],
  },
  {
    title: "계약과 일정",
    items: [
      {
        question: "제작 기간은 보통 얼마나 걸리나요?",
        answer: "랜딩 페이지는 비교적 짧게, 관리자 기능이 포함된 사이트나 앱은 더 길게 잡습니다. 실제 기간은 상담 후 범위에 따라 안내드려요.",
      },
      {
        question: "유지보수도 가능한가요?",
        answer: "네. 오픈 후 간단한 수정부터 추가 기능 논의까지 이어서 도와드릴 수 있습니다.",
      },
      {
        question: "도메인 연결이나 배포도 맡길 수 있나요?",
        answer: "가능합니다. 배포 환경 설정, 도메인 연결, 기본 운영 점검까지 함께 진행할 수 있어요.",
      },
    ],
  },
];

async function readFileContent() {
  const file = await fs.readFile(contentPath, "utf-8");
  return JSON.parse(file) as SiteContent;
}

async function writeFileContent(content: SiteContent) {
  await fs.writeFile(contentPath, JSON.stringify(content, null, 2) + "\n", "utf-8");
}

function hasBlobConfig() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBlobContent(): Promise<SiteContent | null> {
  if (!hasBlobConfig()) {
    return null;
  }

  const { blobs } = await list({ limit: 10, prefix: SITE_CONTENT_BLOB_PATH });
  const target = blobs
    .filter((blob) => blob.pathname === SITE_CONTENT_BLOB_PATH)
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];

  if (!target) {
    return null;
  }

  const response = await fetch(target.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Blob 콘텐츠를 읽지 못했습니다. (${response.status})`);
  }

  return (await response.json()) as SiteContent;
}

async function writeBlobContent(content: SiteContent) {
  if (!hasBlobConfig()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  await put(SITE_CONTENT_BLOB_PATH, JSON.stringify(content, null, 2) + "\n", {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });
}

function normalizeProject(project: Partial<SiteProject> | undefined, index: number): SiteProject {
  const detailImages =
    project?.detailImages?.filter(Boolean).length
      ? project.detailImages.filter(Boolean)
      : fallbackProjectDetails[index % fallbackProjectDetails.length];
  const resolvedSlug = project?.slug || `project-${index + 1}`;
  const resolvedTitle = project?.title || `프로젝트 ${index + 1}`;
  const shouldLinkTyPortfolio =
    resolvedSlug === "project-1" ||
    resolvedTitle.includes("TY") ||
    String(project?.siteUrl || "").includes("/portfolio/studio");

  return {
    title: resolvedTitle,
    slug: resolvedSlug,
    category: project?.category || "포트폴리오",
    summary: project?.summary || "",
    thumbnailImage: project?.thumbnailImage || fallbackProjectThumbs[index % fallbackProjectThumbs.length],
    siteUrl: shouldLinkTyPortfolio ? TY_PORTFOLIO_PATH : project?.siteUrl || "",
    adminUrl: project?.adminUrl || "",
    detailHtml:
      project?.detailHtml ||
      detailImages
        .map((image) => `<p><img src="${image}" alt="${project?.title || `프로젝트 ${index + 1}`}" /></p>`)
        .join(""),
    detailImages,
  };
}

function normalizeOperatedService(service: Partial<OperatedService> | undefined, index: number): OperatedService {
  const fallback = fallbackOperatedServices[index] ?? fallbackOperatedServices[0];
  return {
    title: service?.title || fallback.title,
    description: service?.description || fallback.description,
    image: service?.image || fallback.image,
    link: service?.link || fallback.link,
    badge: service?.badge ?? "",
    pricing: service?.pricing || fallback.pricing,
    pricingDetail: service?.pricingDetail ?? "",
  };
}

function normalizeProcessStep(step: SiteContent["processSteps"][number] | string | undefined, index: number): ProcessStep {
  if (typeof step === "string") {
    return {
      title: step || fallbackProcessTitles[index] || `진행 단계 ${index + 1}`,
      subtitle: "",
      image: fallbackProcessImages[index] || fallbackProcessImages[0],
    };
  }

  return {
    title: step?.title || fallbackProcessTitles[index] || `진행 단계 ${index + 1}`,
    subtitle: step?.subtitle ?? "",
    image: step?.image || fallbackProcessImages[index] || fallbackProcessImages[0],
  };
}

function normalizePricingPlan(plan: Partial<PricingPlan> | undefined, index: number): PricingPlan {
  const fallback = fallbackPricingPlans[index] || fallbackPricingPlans[0];
  return {
    name: plan?.name || fallback.name,
    price: plan?.price || fallback.price,
    description: plan?.description || fallback.description,
    points: Array.isArray(plan?.points) && plan.points.length ? plan.points : fallback.points,
    featured: plan?.featured ?? fallback.featured,
  };
}

function normalizeInquiry(inquiry: Partial<ContactInquiry> | undefined, index: number): ContactInquiry {
  return {
    id: inquiry?.id || `inquiry-${index + 1}`,
    createdAt: inquiry?.createdAt || new Date(0).toISOString(),
    inquiryType: inquiry?.inquiryType || "웹 제작",
    plan: inquiry?.plan || "",
    serviceTypes: Array.isArray(inquiry?.serviceTypes) ? inquiry.serviceTypes.filter(Boolean) : [],
    message: inquiry?.message || "",
    name: inquiry?.name || "",
    phone: inquiry?.phone || "",
    attachments: Array.isArray(inquiry?.attachments) ? inquiry.attachments.filter(Boolean) : [],
  };
}

function normalizeFaqGroup(group: Partial<FaqGroup> | undefined, index: number): FaqGroup {
  const fallback = fallbackFaqGroups[index] || fallbackFaqGroups[0];
  const items = Array.isArray(group?.items) && group.items.length ? group.items : fallback.items;

  return {
    title: group?.title || fallback.title,
    items: items.map((item, itemIndex) => ({
      question: item?.question || fallback.items[itemIndex]?.question || `질문 ${itemIndex + 1}`,
      answer: item?.answer || fallback.items[itemIndex]?.answer || "",
    })),
  };
}

function normalizeChatWidgetSettings(settings: Partial<ChatWidgetSettings> | undefined): ChatWidgetSettings {
  const quickActions =
    Array.isArray(settings?.quickActions) && settings.quickActions.length
      ? settings.quickActions.map((item) => item.trim()).filter(Boolean)
      : fallbackChatWidget.quickActions;

  return {
    launcherLabel: settings?.launcherLabel || fallbackChatWidget.launcherLabel,
    panelTitle: settings?.panelTitle || fallbackChatWidget.panelTitle,
    panelDescription: settings?.panelDescription || fallbackChatWidget.panelDescription,
    welcomeMessage: settings?.welcomeMessage || fallbackChatWidget.welcomeMessage,
    quickActions: quickActions.length ? quickActions.slice(0, 6) : fallbackChatWidget.quickActions,
    privacyConsentLabel: settings?.privacyConsentLabel || fallbackChatWidget.privacyConsentLabel,
  };
}

function normalizeSiteContent(input: SiteContent | Partial<SiteContent>, fallback: SiteContent): SiteContent {
  const source = input || fallback;
  const sourceProjects = Array.isArray(source.projects) ? source.projects : fallback.projects;
  const normalizedProjects = sourceProjects.map((project, index) => normalizeProject(project, index));
  const fallbackCategories = Array.from(new Set(fallback.projects.map((project) => project.category)));
  const sourceCategories =
    Array.isArray(source.portfolioCategories) && source.portfolioCategories.length
      ? source.portfolioCategories.filter(Boolean)
      : Array.from(new Set(normalizedProjects.map((project) => project.category).filter(Boolean)));

  return {
    ...fallback,
    ...source,
    brand: {
      ...fallback.brand,
      ...source.brand,
      logo: source.brand?.logo || fallback.brand.logo,
    },
    hero: {
      ...fallback.hero,
      ...source.hero,
      media: source.hero?.media || fallback.hero.media || "",
      mediaPositionX: Number.isFinite(source.hero?.mediaPositionX) ? source.hero?.mediaPositionX : fallback.hero.mediaPositionX ?? 50,
      mediaPositionY: Number.isFinite(source.hero?.mediaPositionY) ? source.hero?.mediaPositionY : fallback.hero.mediaPositionY ?? 50,
      mediaScale: Number.isFinite(source.hero?.mediaScale) ? source.hero?.mediaScale : fallback.hero.mediaScale ?? 100,
      taglineFontSize: Number.isFinite(source.hero?.taglineFontSize) ? source.hero?.taglineFontSize : fallback.hero.taglineFontSize ?? 14,
      taglineFontWeight: source.hero?.taglineFontWeight || fallback.hero.taglineFontWeight || "700",
      titleFontSize: Number.isFinite(source.hero?.titleFontSize) ? source.hero?.titleFontSize : fallback.hero.titleFontSize ?? 62,
      titleFontWeight: source.hero?.titleFontWeight || fallback.hero.titleFontWeight || "700",
      descriptionFontSize: Number.isFinite(source.hero?.descriptionFontSize) ? source.hero?.descriptionFontSize : fallback.hero.descriptionFontSize ?? 15,
      descriptionFontWeight: source.hero?.descriptionFontWeight || fallback.hero.descriptionFontWeight || "500",
    },
    metrics: Array.isArray(source.metrics) && source.metrics.length ? source.metrics : fallback.metrics,
    servicesIntro: source.servicesIntro || fallback.servicesIntro,
    services: Array.isArray(source.services) && source.services.length ? source.services : fallback.services,
    projectsIntro: source.projectsIntro || fallback.projectsIntro,
    portfolioCategories: sourceCategories.length ? sourceCategories : fallbackCategories,
    projects: normalizedProjects,
    operatedServices: (
      Array.isArray(source.operatedServices) && source.operatedServices.length
        ? source.operatedServices
        : fallback.operatedServices ?? fallbackOperatedServices
    ).map((service, index) => normalizeOperatedService(service, index)),
    processTitle: source.processTitle || fallback.processTitle,
    processSteps: (
      Array.isArray(source.processSteps) && source.processSteps.length
        ? source.processSteps
        : fallback.processSteps
    ).map((step, index) => normalizeProcessStep(step, index)),
    pricing: {
      title: source.pricing?.title || fallback.pricing.title,
      description: source.pricing?.description || fallback.pricing.description,
      promo: {
        enabled: source.pricing?.promo?.enabled ?? fallback.pricing.promo.enabled,
        message: source.pricing?.promo?.message || fallback.pricing.promo.message,
      },
      plans: Array.from({ length: 3 }, (_, index) =>
        normalizePricingPlan(
          (Array.isArray(source.pricing?.plans) && source.pricing?.plans.length
            ? source.pricing?.plans
            : fallback.pricing.plans)[index],
          index,
        ),
      ),
    },
    faq: {
      title: source.faq?.title || fallback.faq.title,
      description: source.faq?.description || fallback.faq.description,
      groups: Array.from({ length: 3 }, (_, index) =>
        normalizeFaqGroup(
          (Array.isArray(source.faq?.groups) && source.faq?.groups.length
            ? source.faq.groups
            : fallback.faq.groups)[index],
          index,
        ),
      ),
    },
    contact: {
      ...fallback.contact,
      ...source.contact,
      privacyPolicy: source.contact?.privacyPolicy || fallback.contact.privacyPolicy,
      inquiries: Array.isArray(source.contact?.inquiries)
        ? source.contact.inquiries.map((inquiry, index) => normalizeInquiry(inquiry, index))
        : fallback.contact.inquiries,
    },
    chatWidget: normalizeChatWidgetSettings(source.chatWidget ?? fallback.chatWidget),
    dashboard: {
      stats:
        Array.isArray(source.dashboard?.stats) && source.dashboard.stats.length
          ? source.dashboard.stats
          : fallback.dashboard.stats,
      leads:
        Array.isArray(source.dashboard?.leads) && source.dashboard.leads.length
          ? source.dashboard.leads
          : fallback.dashboard.leads,
      notes:
        Array.isArray(source.dashboard?.notes) && source.dashboard.notes.length
          ? source.dashboard.notes
          : fallback.dashboard.notes,
    },
  };
}

async function readSiteContentUncached(): Promise<SiteContent> {
  const fallback = await readFileContent();

  if (!hasMongoConfig()) {
    try {
      const blobContent = await readBlobContent();
      if (blobContent) {
        return normalizeSiteContent(blobContent, fallback);
      }
    } catch {
      // Blob 읽기 실패 시 로컬 파일로 fallback
    }

    return normalizeSiteContent(fallback, fallback);
  }

  try {
    const db = await getMongoDatabase();
    const collection = db.collection<SiteContentDocument>(SITE_CONTENT_COLLECTION);
    const document = await collection.findOne({ _id: SITE_CONTENT_DOCUMENT_ID });

    if (document?.content) {
      return normalizeSiteContent(document.content, fallback);
    }
  } catch {
    // MongoDB 연결 실패 시 로컬 파일로 fallback
  }

  return normalizeSiteContent(fallback, fallback);
}

const readSiteContentCached = unstable_cache(readSiteContentUncached, [SITE_CONTENT_TAG], {
  tags: [SITE_CONTENT_TAG],
  revalidate: 60,
});

export async function readSiteContent(): Promise<SiteContent> {
  return readSiteContentCached();
}

export async function pushContactInquiry(inquiry: ContactInquiry) {
  if (hasMongoConfig()) {
    try {
      const db = await getMongoDatabase();
      const collection = db.collection<SiteContentDocument>(SITE_CONTENT_COLLECTION);
      await collection.updateOne(
        { _id: SITE_CONTENT_DOCUMENT_ID },
        {
          $push: { "content.contact.inquiries": { $each: [inquiry], $position: 0 } } as Record<string, unknown>,
          $set: { updatedAt: new Date() },
        },
        { upsert: true },
      );
    } catch (err) {
      throw new Error(`문의 저장에 실패했습니다. (${err instanceof Error ? err.message : "DB 오류"})`);
    }
    revalidateTag(SITE_CONTENT_TAG, "max");
    return;
  }

  // 파일 fallback
  const content = await readSiteContent();
  const fallback = await readFileContent();
  await writeFileContent(
    normalizeSiteContent(
      { ...content, contact: { ...content.contact, inquiries: [inquiry, ...content.contact.inquiries] } },
      fallback,
    ),
  );
  revalidateTag(SITE_CONTENT_TAG, "max");
}

export async function writeSiteContent(content: SiteContent) {
  const fallback = await readFileContent();
  const normalized = normalizeSiteContent(content, fallback);

  if (hasMongoConfig()) {
    try {
      const db = await getMongoDatabase();
      const collection = db.collection<SiteContentDocument>(SITE_CONTENT_COLLECTION);
      await collection.updateOne(
        { _id: SITE_CONTENT_DOCUMENT_ID },
        {
          $set: {
            content: normalized,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (err) {
      throw new Error(`콘텐츠 저장에 실패했습니다. 잠시 후 다시 시도해주세요. (${err instanceof Error ? err.message : "DB 오류"})`);
    }

    revalidateTag(SITE_CONTENT_TAG, "max");
    return;
  }

  if (hasBlobConfig()) {
    await writeBlobContent(normalized);
    revalidateTag(SITE_CONTENT_TAG, "max");
    return;
  }

  await writeFileContent(normalized);
  revalidateTag(SITE_CONTENT_TAG, "max");
}
