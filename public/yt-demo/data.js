const STORAGE_KEYS = {
  siteState: "fit_pick_site_state",
  siteStateVersion: "fit_pick_site_state_version",
  adminSession: "fit_pick_admin_session",
  adminCredentials: "fit_pick_admin_credentials",
};
const SITE_STATE_VERSION = "7";
const UNSPLASH = {
  hero: "https://unsplash.com/photos/ZRZwAwwnStk/download?force=true&w=2400",
  about: "https://unsplash.com/photos/Wj1-mP6_mLs/download?force=true&w=2000",
  luneThumb: "https://unsplash.com/photos/O8lxsc1RwCQ/download?force=true&w=1400",
  luneCover: "https://unsplash.com/photos/pt3EBzQcxP0/download?force=true&w=2000",
  luneGalleryA: "https://unsplash.com/photos/47mWzYUe-sA/download?force=true&w=1600",
  luneGalleryB: "https://unsplash.com/photos/DBUs2UaF-rg/download?force=true&w=1600",
  nomaThumb: "https://unsplash.com/photos/fJT25gnkJFo/download?force=true&w=1400",
  nomaCover: "https://unsplash.com/photos/ZRZwAwwnStk/download?force=true&w=2000",
  nomaGalleryA: "https://unsplash.com/photos/hJwgEyOBIko/download?force=true&w=1600",
  nomaGalleryB: "https://unsplash.com/photos/pt3EBzQcxP0/download?force=true&w=1600",
  monoThumb: "https://unsplash.com/photos/LCZ441AnJw0/download?force=true&w=1400",
  monoCover: "https://unsplash.com/photos/CK6Pyq2LpE8/download?force=true&w=2000",
  monoGalleryA: "https://unsplash.com/photos/ktFgitFPrqw/download?force=true&w=1600",
  monoGalleryB: "https://unsplash.com/photos/47mWzYUe-sA/download?force=true&w=1600",
};
const ADMIN_SESSION_DURATION_MS = 60 * 60 * 1000;
const MEDIA_DB_NAME = "fit_pick_media_db";
const MEDIA_STORE_NAME = "media_assets";
const STATE_DB_NAME = "fit_pick_state_db";
const STATE_STORE_NAME = "site_state";
const STATE_RECORD_KEY = "current";
let remoteSyncInFlight = null;

function isRemoteMediaKey(key) {
  const value = String(key || "");
  return value.startsWith("mongo:") || value.startsWith("gfs:") || value.startsWith("s3:");
}

const defaultSiteState = {
  main: {
    enabled: true,
    workListEnabled: true,
    heroTitle: "TY",
    heroImageName: "main.jpg",
    heroMediaType: "image",
    heroMediaKey: "",
    heroPosterKey: "",
    heroImageUrl: UNSPLASH.hero,
    heroBackground: ["#f2f1ee", "#d8d7d3", "#ffffff"],
  },
  about: {
    enabled: true,
    imageEnabled: true,
    imageName: "main.mp4",
    mediaType: "image",
    mediaKey: "",
    posterKey: "",
    imageUrl: UNSPLASH.about,
    sections: [
      {
        id: "about",
        title: "About",
        content:
          "TY(teamyezi)는 패션 브랜드의 첫 인상과 시즌 무드를 시각적으로 설계하는 크리에이티브 팀입니다. 룩북, 캠페인, 제품 상세, SNS 비주얼까지 하나의 톤으로 연결해 브랜드가 더 선명하게 기억되도록 만듭니다.",
        chips: ["패션 브랜딩", "룩북 디렉팅", "캠페인 비주얼", "콘텐츠 스타일링"],
      },
      {
        id: "services",
        title: "Services",
        content:
          "브랜드 컨셉 정리부터 스타일링, 촬영 디렉팅, 아트웍, 온라인 콘텐츠 패키지까지 패션 브랜드 운영에 필요한 시각 자산을 제안합니다. 단순히 예쁜 컷이 아니라 판매와 브랜딩에 함께 쓰일 수 있는 결과물을 만드는 데 집중합니다.",
        chips: ["Brand Identity", "Editorial Shoot", "Campaign Art Direction", "SNS Package"],
      },
      {
        id: "contact-us",
        title: "Contact us",
        content:
          "시즌 룩북, 브랜드 런칭, 리브랜딩, 온라인 상세 비주얼 등 현재 필요한 작업 범위를 알려주시면 TY가 적합한 제작 방식과 진행 흐름을 먼저 제안드립니다.",
        chips: ["문의 접수", "무드 체크", "견적 제안", "프리프로덕션", "촬영 진행", "후반 작업"],
      },
    ],
  },
  branding: {
    logoLink: "",
  },
  categories: ["Visual branding", "Creative directing"],
  products: [
    {
      id: "atelier-monde",
      slug: "atelier-monde",
      category: "Visual branding",
      active: true,
      showOnMain: true,
      name: "ATELIER MONDE",
      summary: "여성복 브랜드 런칭 시즌을 위해 로고, 룩북 썸네일, 브랜드 무드컷을 함께 정리한 비주얼 브랜딩 프로젝트",
      content:
        `
          <p>ATELIER MONDE는 런칭 초기에 브랜드가 어떤 스타일의 여성을 상상하는지부터 정리해야 했던 프로젝트였습니다. TY는 시즌 키워드와 룩북 무드를 먼저 설정하고, 그 흐름이 로고, 컬러, 비주얼 톤까지 자연스럽게 이어지도록 작업했습니다.</p>
          <p>행거 컷, 룩북 표지, 상세페이지 메인 컷이 따로 놀지 않도록 구성했고, 첫 공개 시즌부터 브랜드의 결이 느껴지는 화면을 만드는 데 집중했습니다.</p>
          <img src="${UNSPLASH.luneCover}" alt="ATELIER MONDE fashion rack" />
          <p>런칭 시즌의 핵심은 브랜드의 첫인상이 한 장면으로 설명되는 것이었습니다. 의상 톤과 공간 무드를 최대한 절제해 제품과 실루엣이 먼저 보이도록 정리했습니다.</p>
          <img src="${UNSPLASH.about}" alt="ATELIER MONDE mood board" />
        `,
      thumbnailName: "atelier-thumb.jpg",
      thumbnailKey: "",
      thumbnailUrl: UNSPLASH.luneThumb,
      coverName: "atelier-cover.jpg",
      coverKey: "",
      coverUrl: UNSPLASH.luneCover,
      gallery: [
        { id: "g1", name: "atelier-detail-1.jpg", url: UNSPLASH.luneCover },
        { id: "g2", name: "atelier-detail-2.jpg", url: UNSPLASH.luneGalleryA },
        { id: "g3", name: "atelier-detail-3.jpg", url: UNSPLASH.luneGalleryB },
      ],
      palette: ["#181615", "#8d7a6d", "#f3ece5"],
      createdAt: "2026-03-21 14:00:00",
    },
    {
      id: "sienne-archive",
      slug: "sienne-archive",
      category: "Creative directing",
      active: true,
      showOnMain: true,
      name: "SIENNE Archive Campaign",
      summary: "빈티지 무드 여성복 컬렉션을 위해 스타일링, 촬영 동선, SNS 공개용 컷을 함께 구성한 캠페인 디렉팅 프로젝트",
      content:
        `
          <p>SIENNE Archive는 제품만 보여주는 컷보다 브랜드의 공기와 움직임이 드러나는 비주얼이 더 중요했던 프로젝트였습니다. TY는 의상 톤과 배경 질감, 모델 무드까지 하나의 장면 안에서 보이도록 촬영 방향을 설계했습니다.</p>
          <p>룩북 메인 컷, 컬렉션 소개용 배너, SNS 공개용 세로 컷까지 확장 가능한 구조로 정리해 캠페인 전체의 톤을 일관되게 유지했습니다.</p>
          <img src="${UNSPLASH.nomaCover}" alt="SIENNE archive fashion team" />
          <p>모델 컷과 제품 정보 컷 사이의 간극을 줄이기 위해, 에디토리얼 이미지와 온라인 판매 이미지를 자연스럽게 넘나드는 방향으로 장면을 설계했습니다.</p>
          <img src="${UNSPLASH.nomaThumb}" alt="SIENNE archive boutique rack" />
        `,
      thumbnailName: "sienne-thumb.jpg",
      thumbnailKey: "",
      thumbnailUrl: UNSPLASH.nomaThumb,
      coverName: "sienne-cover.jpg",
      coverKey: "",
      coverUrl: UNSPLASH.nomaCover,
      gallery: [
        { id: "g1", name: "sienne-detail-1.jpg", url: UNSPLASH.nomaCover },
        { id: "g2", name: "sienne-detail-2.jpg", url: UNSPLASH.nomaGalleryA },
        { id: "g3", name: "sienne-detail-3.jpg", url: UNSPLASH.nomaGalleryB },
      ],
      palette: ["#171515", "#6f5d52", "#efe3d8"],
      createdAt: "2026-03-22 11:20:00",
    },
    {
      id: "frame-note",
      slug: "frame-note",
      category: "Visual branding",
      active: true,
      showOnMain: true,
      name: "FRAME NOTE",
      summary: "패션 브랜드 프리프로덕션 단계에서 무드보드, 런칭 페이지, 컬렉션 소개 톤을 함께 정리한 컨셉 디자인 프로젝트",
      content:
        `
          <p>FRAME NOTE는 실제 판매 전 단계에서 브랜드의 첫 화면을 어떻게 보여줄지 고민하던 패션 팀과 함께 진행한 작업입니다. 무드보드와 스타일 키워드를 먼저 정리한 뒤, 웹 첫 화면과 컬렉션 소개 영역의 톤을 함께 구성했습니다.</p>
          <p>브랜드가 전달하고 싶은 섬세함과 현대적인 무드를 모두 담기 위해 타이포와 레이아웃은 절제하고, 이미지는 에디토리얼 감도로 정리해 결과물을 완성했습니다.</p>
          <img src="${UNSPLASH.monoCover}" alt="FRAME NOTE fashion studio collaboration" />
          <p>디자이너 작업 과정과 실제 결과물이 분리되어 보이지 않도록, 스튜디오 장면 자체를 브랜드의 일부로 느끼게 하는 톤을 만드는 데 초점을 맞췄습니다.</p>
          <img src="${UNSPLASH.monoThumb}" alt="FRAME NOTE designer in studio" />
        `,
      thumbnailName: "frame-thumb.jpg",
      thumbnailKey: "",
      thumbnailUrl: UNSPLASH.monoThumb,
      coverName: "frame-cover.jpg",
      coverKey: "",
      coverUrl: UNSPLASH.monoCover,
      gallery: [
        { id: "g1", name: "frame-detail-1.jpg", url: UNSPLASH.monoCover },
        { id: "g2", name: "frame-detail-2.jpg", url: UNSPLASH.monoGalleryA },
        { id: "g3", name: "frame-detail-3.jpg", url: UNSPLASH.monoGalleryB },
      ],
      palette: ["#111111", "#7b7470", "#f2efec"],
      createdAt: "2026-03-24 09:40:00",
    },
  ],
  inquiries: [
    {
      id: "inq-1",
      status: "완료",
      brand: "Maison Rue",
      name: "박유진",
      contact: "010-2481-5562",
      content: "시즌 룩북 촬영과 브랜드 첫 공개용 SNS 비주얼을 함께 진행할 수 있는지 문의드립니다.",
      receivedAt: "2026-03-25 10:00:00",
      completedAt: "2026-03-25 12:40:00",
      manager: "김정원",
      memo: "1차 통화 완료, 4월 첫째 주 룩북 미팅 예정",
    },
    {
      id: "inq-2",
      status: "대기",
      brand: "NOMA Studio",
      name: "이도현",
      contact: "010-9012-1108",
      content: "브랜드 리뉴얼 이후 제품 착장 컷과 상세페이지용 비주얼을 동시에 진행하고 싶습니다. 가능한 일정 확인 부탁드립니다.",
      receivedAt: "2026-03-26 13:00:00",
      completedAt: "",
      manager: "",
      memo: "",
    },
    {
      id: "inq-3",
      status: "진행중",
      brand: "Frame Note",
      name: "정서연",
      contact: "010-7788-2403",
      content: "컬렉션 공개 전 무드보드와 웹 런칭 배너, 브랜드 소개용 비주얼까지 묶어서 진행 가능한지 문의드립니다.",
      receivedAt: "2026-03-27 09:30:00",
      completedAt: "",
      manager: "박수빈",
      memo: "레퍼런스 수신 완료, 시즌 컨셉 정리 중",
    },
  ],
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeProduct(product, index) {
  const palette = Array.isArray(product.palette) && product.palette.length === 3
    ? [...product.palette]
    : ["#111111", "#666666", "#f0f0f0"];

  return {
    id: product.id || `product-${index + 1}`,
    slug: product.slug || product.id || `product-${index + 1}`,
    category: product.category || "Visual branding",
    active: Boolean(product.active),
    showOnMain: Boolean(product.showOnMain),
    name: product.name || "Untitled",
    summary: product.summary || "",
    content: product.content || "",
    thumbnailName: product.thumbnailName || "main.jpg",
    thumbnailKey: product.thumbnailKey || "",
    thumbnailUrl: product.thumbnailUrl || "",
    coverName: product.coverName || "cover.jpg",
    coverKey: product.coverKey || "",
    coverUrl: product.coverUrl || "",
    gallery: Array.isArray(product.gallery) && product.gallery.length
      ? product.gallery.map((item, galleryIndex) => ({
          id: item.id || `g-${galleryIndex + 1}`,
          name: item.name || `detail-${galleryIndex + 1}.jpg`,
          url: item.url || "",
        }))
      : [],
    palette,
    createdAt: product.createdAt || "",
  };
}

function normalizeSection(section, index) {
  return {
    id: section.id || `section-${index + 1}`,
    title: section.title || "",
    content: section.content || "",
    chips: Array.isArray(section.chips) ? [...section.chips] : [],
  };
}

function normalizeInquiry(inquiry, index) {
  return {
    id: inquiry.id || `inq-${index + 1}`,
    status: inquiry.status || "대기",
    brand: inquiry.brand || "",
    name: inquiry.name || "",
    contact: inquiry.contact || "",
    content: inquiry.content || "",
    receivedAt: inquiry.receivedAt || "",
    completedAt: inquiry.completedAt || "",
    manager: inquiry.manager || "",
    memo: inquiry.memo || "",
  };
}

function normalizeSiteState(state) {
  const next = deepClone(defaultSiteState);
  const merged = { ...next, ...(state || {}) };

  merged.main = {
    ...next.main,
    ...(state?.main || {}),
    heroMediaType: state?.main?.heroMediaType || next.main.heroMediaType,
    heroMediaKey: state?.main?.heroMediaKey || next.main.heroMediaKey,
    heroPosterKey: state?.main?.heroPosterKey || next.main.heroPosterKey,
  };

  merged.about = {
    ...next.about,
    ...(state?.about || {}),
    mediaType: state?.about?.mediaType || next.about.mediaType,
    mediaKey: state?.about?.mediaKey || next.about.mediaKey,
    posterKey: state?.about?.posterKey || next.about.posterKey,
    sections: Array.isArray(state?.about?.sections)
      ? state.about.sections.map(normalizeSection)
      : next.about.sections.map(normalizeSection),
  };

  merged.branding = {
    ...next.branding,
    ...(state?.branding || {}),
  };

  merged.categories = Array.isArray(state?.categories) && state.categories.length
    ? state.categories.map((category) => String(category || "").trim()).filter(Boolean)
    : [...next.categories];

  merged.products = Array.isArray(state?.products)
    ? state.products.map((product, index) => {
        const normalized = normalizeProduct(product, index);
        if (!merged.categories.includes(normalized.category)) {
          merged.categories.push(normalized.category);
        }
        return normalized;
      })
    : next.products.map(normalizeProduct);

  merged.inquiries = Array.isArray(state?.inquiries)
    ? state.inquiries.map(normalizeInquiry)
    : next.inquiries.map(normalizeInquiry);

  return merged;
}

function migrateLegacyProjects() {
  try {
    const legacy = localStorage.getItem("ty_studio_projects");
    if (!legacy) return null;

    const parsed = JSON.parse(legacy);
    if (!Array.isArray(parsed) || !parsed.length) return null;

    return parsed.map((project, index) =>
      normalizeProduct(
        {
          id: project.id,
          slug: project.id,
          category: project.label || "Visual branding",
          active: true,
          showOnMain: Boolean(project.featured),
          name: project.title,
          summary: project.summary,
          content: project.summary,
          thumbnailName: "main.jpg",
          thumbnailKey: "",
          coverName: "cover.jpg",
          coverKey: "",
          palette: project.palette,
          createdAt: "2026-03-26 14:00:00",
        },
        index
      )
    );
  } catch (error) {
    return null;
  }
}

function readSiteState() {
  try {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.siteStateVersion);
    const raw = localStorage.getItem(STORAGE_KEYS.siteState);
    if (savedVersion !== SITE_STATE_VERSION) {
      localStorage.setItem(STORAGE_KEYS.siteStateVersion, SITE_STATE_VERSION);

      if (raw) {
        return sanitizeStateForStorage(JSON.parse(raw));
      }

      const migratedProducts = migrateLegacyProjects();
      if (migratedProducts) {
        return sanitizeStateForStorage({ ...defaultSiteState, products: migratedProducts });
      }

      return sanitizeStateForStorage(defaultSiteState);
    }

    if (!raw) {
      const migratedProducts = migrateLegacyProjects();
      if (migratedProducts) {
        return sanitizeStateForStorage({ ...defaultSiteState, products: migratedProducts });
      }

      return sanitizeStateForStorage(defaultSiteState);
    }

    return sanitizeStateForStorage(JSON.parse(raw));
  } catch (error) {
    return sanitizeStateForStorage(defaultSiteState);
  }
}

function sanitizeStateForStorage(siteState) {
  const normalized = normalizeSiteState(siteState);
  if (isRemoteMediaKey(normalized.main.heroMediaKey)) {
    normalized.main.heroImageUrl = "";
  }

  if (isRemoteMediaKey(normalized.about.mediaKey)) {
    normalized.about.imageUrl = "";
  }

  normalized.products = normalized.products.map((product) => {
    const nextProduct = { ...product };
    if (isRemoteMediaKey(nextProduct.thumbnailKey)) {
      nextProduct.thumbnailUrl = "";
    }
    if (isRemoteMediaKey(nextProduct.coverKey)) {
      nextProduct.coverUrl = "";
    }
    return nextProduct;
  });

  return normalized;
}

function writeSiteState(siteState) {
  const sanitized = sanitizeStateForStorage(siteState);
  try {
    localStorage.setItem(STORAGE_KEYS.siteStateVersion, SITE_STATE_VERSION);
    localStorage.setItem(STORAGE_KEYS.siteState, JSON.stringify(sanitized));
  } catch (error) {
    console.error("Failed to write localStorage state", error);
  }
  saveStateSnapshotToIndexedDb(sanitized);
  queueRemoteStateSave(siteState);
}

async function uploadInlineDataUrlToRemote(dataUrl, fileName = "media-inline.jpg") {
  if (!isRemoteStorageEnabled()) return "";
  if (!String(dataUrl || "").startsWith("data:")) return "";

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], fileName, {
      type: blob.type || "application/octet-stream",
    });
    return await saveMediaAssetToRemote(file);
  } catch (error) {
    console.error("Failed to upload inline data URL to remote", error);
    return "";
  }
}

async function promoteStateInlineMedia(siteState) {
  if (!isRemoteStorageEnabled()) return sanitizeStateForStorage(siteState);

  const nextState = sanitizeStateForStorage(siteState);

  if (!nextState.main.heroMediaKey && String(nextState.main.heroImageUrl || "").startsWith("data:")) {
    const key = await uploadInlineDataUrlToRemote(nextState.main.heroImageUrl, nextState.main.heroImageName || "main-image.jpg");
    if (key) {
      nextState.main.heroMediaKey = key;
      nextState.main.heroMediaType = "image";
      nextState.main.heroImageUrl = "";
    }
  }

  if (!nextState.about.mediaKey && String(nextState.about.imageUrl || "").startsWith("data:")) {
    const key = await uploadInlineDataUrlToRemote(nextState.about.imageUrl, nextState.about.imageName || "about-image.jpg");
    if (key) {
      nextState.about.mediaKey = key;
      nextState.about.mediaType = "image";
      nextState.about.imageUrl = "";
    }
  }

  nextState.products = await Promise.all(
    nextState.products.map(async (product) => {
      const nextProduct = { ...product };

      if (!nextProduct.thumbnailKey && String(nextProduct.thumbnailUrl || "").startsWith("data:")) {
        const key = await uploadInlineDataUrlToRemote(
          nextProduct.thumbnailUrl,
          nextProduct.thumbnailName || `${nextProduct.slug || nextProduct.id || "product"}-thumb.jpg`
        );
        if (key) {
          nextProduct.thumbnailKey = key;
          nextProduct.thumbnailUrl = "";
        }
      }

      if (!nextProduct.coverKey && String(nextProduct.coverUrl || "").startsWith("data:")) {
        const key = await uploadInlineDataUrlToRemote(
          nextProduct.coverUrl,
          nextProduct.coverName || `${nextProduct.slug || nextProduct.id || "product"}-cover.jpg`
        );
        if (key) {
          nextProduct.coverKey = key;
          nextProduct.coverUrl = "";
        }
      }

      return nextProduct;
    })
  );

  return sanitizeStateForStorage(nextState);
}

async function persistSiteStateNow(siteState) {
  const sanitized = await promoteStateInlineMedia(siteState);
  try {
    localStorage.setItem(STORAGE_KEYS.siteStateVersion, SITE_STATE_VERSION);
    localStorage.setItem(STORAGE_KEYS.siteState, JSON.stringify(sanitized));
  } catch (error) {
    console.error("Failed to write localStorage state", error);
  }

  await saveStateSnapshotToIndexedDb(sanitized);
  return await saveRemoteState(sanitized);
}

function resetSiteState() {
  localStorage.setItem(STORAGE_KEYS.siteStateVersion, SITE_STATE_VERSION);
  localStorage.removeItem(STORAGE_KEYS.siteState);
  return normalizeSiteState(defaultSiteState);
}

function readAdminCredentials() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.adminCredentials);
    if (!raw) return { email: "admin@ty", password: "fitpick123!" };

    const parsed = JSON.parse(raw);
    if (!parsed?.email || !parsed?.password) {
      return { email: "admin@ty", password: "fitpick123!" };
    }

    return parsed;
  } catch (error) {
    return { email: "admin@ty", password: "fitpick123!" };
  }
}

function writeAdminCredentials(credentials) {
  localStorage.setItem(STORAGE_KEYS.adminCredentials, JSON.stringify(credentials));
}

function readAdminSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.adminSession);
    if (!raw) return null;

    if (raw === "authenticated") {
      const legacySession = {
        authenticated: true,
        expiresAt: Date.now() + ADMIN_SESSION_DURATION_MS,
      };
      localStorage.setItem(STORAGE_KEYS.adminSession, JSON.stringify(legacySession));
      return legacySession;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.authenticated || typeof parsed.expiresAt !== "number") {
      localStorage.removeItem(STORAGE_KEYS.adminSession);
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEYS.adminSession);
      return null;
    }

    return parsed;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEYS.adminSession);
    return null;
  }
}

function isAdminAuthenticated() {
  return Boolean(readAdminSession());
}

function getAdminSessionRemainingMs() {
  const session = readAdminSession();
  if (!session) return 0;
  return Math.max(0, session.expiresAt - Date.now());
}

function setAdminAuthenticated(authenticated) {
  if (authenticated) {
    localStorage.setItem(
      STORAGE_KEYS.adminSession,
      JSON.stringify({
        authenticated: true,
        expiresAt: Date.now() + ADMIN_SESSION_DURATION_MS,
      })
    );
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.adminSession);
}

function extendAdminSession() {
  const session = readAdminSession();
  if (!session) return false;

  localStorage.setItem(
    STORAGE_KEYS.adminSession,
    JSON.stringify({
      authenticated: true,
      expiresAt: Date.now() + ADMIN_SESSION_DURATION_MS,
    })
  );

  return true;
}

function createInquiry(payload) {
  const siteState = readSiteState();
  const nextInquiry = normalizeInquiry(
    {
      id: `inq-${Date.now()}`,
      status: "대기",
      brand: payload.brand,
      name: payload.name,
      contact: payload.contact,
      content: payload.message,
      receivedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      completedAt: "",
      manager: "",
      memo: "",
    },
    siteState.inquiries.length
  );

  siteState.inquiries.unshift(nextInquiry);
  writeSiteState(siteState);
  return nextInquiry;
}

function openMediaDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        db.createObjectStore(MEDIA_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveMediaAsset(file) {
  if (isRemoteStorageEnabled()) {
    const remoteKey = await saveMediaAssetToRemote(file);
    return remoteKey || "";
  }

  const db = await openMediaDb();
  const key = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE_NAME, "readwrite");
    tx.objectStore(MEDIA_STORE_NAME).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return key;
}

async function readMediaAssetBlob(key) {
  if (!key || isRemoteMediaKey(key)) return null;
  const db = await openMediaDb();
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE_NAME, "readonly");
    const request = tx.objectStore(MEDIA_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

async function readMediaAssetUrl(key) {
  if (!key) return "";
  if (isRemoteMediaKey(key)) {
    return readRemoteMediaUrl(key);
  }
  const blob = await readMediaAssetBlob(key);
  return blob ? URL.createObjectURL(blob) : "";
}

function openStateDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STATE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STATE_STORE_NAME)) {
        db.createObjectStore(STATE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveStateSnapshotToIndexedDb(siteState) {
  try {
    const db = await openStateDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE_NAME, "readwrite");
      tx.objectStore(STATE_STORE_NAME).put(siteState, STATE_RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch (error) {
    console.error("Failed to save state snapshot", error);
    return false;
  }
}

async function readStateSnapshotFromIndexedDb() {
  try {
    const db = await openStateDb();
    const state = await new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE_NAME, "readonly");
      const request = tx.objectStore(STATE_STORE_NAME).get(STATE_RECORD_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state ? normalizeSiteState(state) : null;
  } catch (error) {
    console.error("Failed to read state snapshot", error);
    return null;
  }
}

function getRemoteConfig() {
  const config = window.TY_CONFIG || {};
  return {
    apiBase: String(config.remoteApiBase || "/api").trim() || "/api",
  };
}

function isRemoteStorageEnabled() {
  if ((window.TY_CONFIG || {}).remoteApiBase === null) return false;
  return Boolean(window.fetch && window.location?.protocol !== "file:");
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function blobToBase64(blob) {
  const dataUrl = await blobToDataUrl(blob);
  return dataUrl.split(",", 2)[1] || "";
}

async function remoteRequest(path, options = {}) {
  const { apiBase } = getRemoteConfig();
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Remote request failed: ${response.status}`);
  }

  return response.json();
}

async function refreshSiteStateFromRemote(pageHint = "") {
  if (!isRemoteStorageEnabled()) {
    const indexedDbState = await readStateSnapshotFromIndexedDb();
    if (indexedDbState) {
      try {
        localStorage.setItem(STORAGE_KEYS.siteState, JSON.stringify(indexedDbState));
      } catch (error) {
        console.error("Failed to refresh local cache from indexedDB", error);
      }
      return indexedDbState;
    }
    return readSiteState();
  }
  if (remoteSyncInFlight) return remoteSyncInFlight;

  remoteSyncInFlight = (async () => {
    try {
      const query = pageHint ? `?page=${encodeURIComponent(pageHint)}` : "";
      const result = await remoteRequest(`/site-state${query}`);
      if (result?.payload) {
        const baseState = readSiteState();
        const nextState = result.partial
          ? normalizeSiteState({
              ...baseState,
              ...result.payload,
              main: {
                ...baseState.main,
                ...(result.payload.main || {}),
              },
              about: {
                ...baseState.about,
                ...(result.payload.about || {}),
              },
              branding: {
                ...baseState.branding,
                ...(result.payload.branding || {}),
              },
              categories: Array.isArray(result.payload.categories)
                ? result.payload.categories
                : baseState.categories,
              products: Array.isArray(result.payload.products)
                ? result.payload.products
                : baseState.products,
            })
          : normalizeSiteState(result.payload);
        localStorage.setItem(STORAGE_KEYS.siteState, JSON.stringify(nextState));
        return nextState;
      }
    } catch (error) {
      console.error("Failed to refresh remote state", error);
    } finally {
      remoteSyncInFlight = null;
    }

    return readSiteState();
  })();

  return remoteSyncInFlight;
}

async function saveRemoteState(siteState) {
  if (!isRemoteStorageEnabled()) return false;

  try {
    const payload = normalizeSiteState(siteState);
    await remoteRequest("/site-state", {
      method: "POST",
      body: JSON.stringify({ payload }),
    });
    return true;
  } catch (error) {
    console.error("Failed to save remote state", error);
    return false;
  }
}

function queueRemoteStateSave(siteState) {
  if (!isRemoteStorageEnabled()) return;
  saveRemoteState(siteState);
}

async function migrateLocalMediaKeyToRemote(key, fileName = "media-file") {
  if (!key || isRemoteMediaKey(key)) return key;
  if (!isRemoteStorageEnabled()) return key;

  const blob = await readMediaAssetBlob(key);
  if (!blob) return key;

  const file = new File([blob], fileName, {
    type: blob.type || "application/octet-stream",
  });

  const remoteKey = await saveMediaAssetToRemote(file);
  return remoteKey || key;
}

async function migrateContentMediaKeysToRemote(html, filePrefix = "editor-image") {
  if (!html || (!html.includes('data-media-key="media-') && !html.includes('src="data:'))) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="content-root">${html}</div>`, "text/html");
  const root = doc.querySelector("#content-root");
  if (!root) return html;

  const mediaNodes = root.querySelectorAll("[data-media-key]");
  for (const [index, node] of Array.from(mediaNodes).entries()) {
    const key = node.getAttribute("data-media-key") || "";
    if (!key.startsWith("media-")) continue;
    const nextKey = await migrateLocalMediaKeyToRemote(key, `${filePrefix}-${index + 1}`);
    if (nextKey && nextKey !== key) {
      node.setAttribute("data-media-key", nextKey);
      node.setAttribute("src", readRemoteMediaUrl(nextKey));
    }
  }

  const inlineImages = root.querySelectorAll('img[src^="data:"]:not([data-media-key])');
  for (const [index, node] of Array.from(inlineImages).entries()) {
    try {
      const response = await fetch(node.getAttribute("src") || "");
      const blob = await response.blob();
      const file = new File([blob], node.getAttribute("alt") || `${filePrefix}-inline-${index + 1}.jpg`, {
        type: blob.type || "image/jpeg",
      });
      const nextKey = await saveMediaAssetToRemote(file);
      if (nextKey) {
        node.setAttribute("data-media-key", nextKey);
        node.setAttribute("data-media-type", "image");
        node.setAttribute("src", readRemoteMediaUrl(nextKey));
      }
    } catch (error) {
      console.error("Failed to migrate inline content image", error);
    }
  }

  return root.innerHTML;
}

async function migrateSiteStateMediaToRemote(siteState) {
  if (!isRemoteStorageEnabled()) return siteState;

  let changed = false;
  const nextState = normalizeSiteState(siteState);

  const nextHeroKey = await migrateLocalMediaKeyToRemote(nextState.main.heroMediaKey, nextState.main.heroImageName || "main-media");
  if (nextHeroKey !== nextState.main.heroMediaKey) {
    nextState.main.heroMediaKey = nextHeroKey;
    changed = true;
  }

  const nextAboutKey = await migrateLocalMediaKeyToRemote(nextState.about.mediaKey, nextState.about.imageName || "about-media");
  if (nextAboutKey !== nextState.about.mediaKey) {
    nextState.about.mediaKey = nextAboutKey;
    changed = true;
  }

  for (const product of nextState.products) {
    const nextThumbKey = await migrateLocalMediaKeyToRemote(product.thumbnailKey, product.thumbnailName || `${product.slug}-thumb`);
    if (nextThumbKey !== product.thumbnailKey) {
      product.thumbnailKey = nextThumbKey;
      changed = true;
    }

    const nextCoverKey = await migrateLocalMediaKeyToRemote(product.coverKey, product.coverName || `${product.slug}-cover`);
    if (nextCoverKey !== product.coverKey) {
      product.coverKey = nextCoverKey;
      changed = true;
    }

    const nextContent = await migrateContentMediaKeysToRemote(product.content, product.slug || product.id || "product");
    if (nextContent !== product.content) {
      product.content = nextContent;
      changed = true;
    }
  }

  if (!changed) return siteState;

  try {
    localStorage.setItem(STORAGE_KEYS.siteState, JSON.stringify(nextState));
  } catch (error) {
    console.error("Failed to update local storage during media migration", error);
  }

  await saveStateSnapshotToIndexedDb(nextState);
  await saveRemoteState(nextState);
  return nextState;
}

async function importLocalStateToRemote() {
  if (!isRemoteStorageEnabled()) return false;

  try {
    const localState = readSiteState();
    return await saveRemoteState(localState);
  } catch (error) {
    console.error("Failed to import local state to remote", error);
    return false;
  }
}

async function saveMediaAssetToRemote(file) {
  if (!isRemoteStorageEnabled()) return "";

  try {
    const chunkSize = 768 * 1024;
    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

    if (totalChunks === 1) {
      const dataUrl = await blobToDataUrl(file);
      const result = await remoteRequest("/media", {
        method: "POST",
        body: JSON.stringify({
          action: "single",
          name: file.name,
          type: file.type || "application/octet-stream",
          dataUrl,
        }),
      });
      return result?.key || "";
    }

    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      const base64 = await blobToBase64(chunk);
      await remoteRequest("/media", {
        method: "POST",
        body: JSON.stringify({
          action: "chunk",
          uploadId,
          name: file.name,
          type: file.type || "application/octet-stream",
          totalChunks,
          chunkIndex: index,
          base64,
        }),
      });
    }

    const result = await remoteRequest("/media", {
      method: "POST",
      body: JSON.stringify({
        action: "complete",
        uploadId,
        name: file.name,
        type: file.type || "application/octet-stream",
        totalChunks,
      }),
    });

    return result?.key || "";
  } catch (error) {
    console.error("Failed to upload remote media", error);
    return "";
  }
}

function readRemoteMediaUrl(key) {
  if (!isRemoteMediaKey(key)) return "";
  const { apiBase } = getRemoteConfig();
  return `${apiBase}/media-file?key=${encodeURIComponent(key)}`;
}

function countLegacyMediaReferences(siteState) {
  const state = normalizeSiteState(siteState);
  let count = 0;

  if (state.main.heroMediaKey && !isRemoteMediaKey(state.main.heroMediaKey)) count += 1;
  if (state.about.mediaKey && !isRemoteMediaKey(state.about.mediaKey)) count += 1;

  for (const product of state.products) {
    if (product.thumbnailKey && !isRemoteMediaKey(product.thumbnailKey)) count += 1;
    if (product.coverKey && !isRemoteMediaKey(product.coverKey)) count += 1;

    const legacyMatches = String(product.content || "").match(/data-media-key="media-[^"]+"/g);
    if (legacyMatches?.length) count += legacyMatches.length;

    const inlineMatches = String(product.content || "").match(/<img[^>]+src="data:[^"]+"/g);
    if (inlineMatches?.length) count += inlineMatches.length;
  }

  return count;
}

function getLegacyMediaIssues(siteState) {
  const state = normalizeSiteState(siteState);
  const issues = [];

  if (state.main.heroMediaKey && !isRemoteMediaKey(state.main.heroMediaKey)) {
    issues.push({ area: "main", label: "대문 미디어", name: state.main.heroImageName || "대문 파일" });
  }

  if (state.about.mediaKey && !isRemoteMediaKey(state.about.mediaKey)) {
    issues.push({ area: "about", label: "회사 소개 미디어", name: state.about.imageName || "회사 소개 파일" });
  }

  for (const product of state.products) {
    if (product.thumbnailKey && !isRemoteMediaKey(product.thumbnailKey)) {
      issues.push({ area: "product", productId: product.id, label: "썸네일", name: `${product.name} / ${product.thumbnailName || "thumbnail"}` });
    }

    if (product.coverKey && !isRemoteMediaKey(product.coverKey)) {
      issues.push({ area: "product", productId: product.id, label: "커버", name: `${product.name} / ${product.coverName || "cover"}` });
    }

    const legacyKeyMatches = String(product.content || "").match(/data-media-key="media-[^"]+"/g) || [];
    legacyKeyMatches.forEach((_, index) => {
      issues.push({ area: "product", productId: product.id, label: "본문 이미지", name: `${product.name} / 본문 이미지 ${index + 1}` });
    });

    const inlineMatches = String(product.content || "").match(/<img[^>]+src="(?:blob:|data:)[^"]+"/g) || [];
    inlineMatches.forEach((_, index) => {
      issues.push({ area: "product", productId: product.id, label: "본문 이미지", name: `${product.name} / 본문 이미지 ${index + 1}` });
    });
  }

  return issues;
}
