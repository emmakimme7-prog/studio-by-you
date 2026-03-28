const app = document.querySelector("#app");
const page = document.body.dataset.page;
let siteState = readSiteState();

function isRemoteKey(key) {
  const value = String(key || "");
  return value.startsWith("mongo:") || value.startsWith("gfs:") || value.startsWith("s3:");
}

function sanitizeRichContentForPublic(html) {
  const markup = String(html || "").trim();
  if (!markup) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="detail-root">${markup}</div>`, "text/html");
  const root = doc.querySelector("#detail-root");
  if (!root) return markup;

  root.querySelectorAll("img, video").forEach((node) => {
    const key = node.getAttribute("data-media-key") || "";
    const src = node.getAttribute("src") || "";
    const shouldRemove =
      (key && !isRemoteKey(key)) ||
      src.startsWith("blob:") ||
      src.startsWith("data:");

    if (shouldRemove) {
      node.remove();
    }
  });

  return root.innerHTML;
}

function createGradient(palette = ["#111111", "#777777", "#f0f0f0"], angle = 145) {
  return `linear-gradient(${angle}deg, ${palette[0]}, ${palette[1]} 56%, ${palette[2]})`;
}

function mediaStyle(url, palette, angle) {
  if (url) return `background-image:url('${url}')`;
  return `background:${createGradient(palette, angle)}`;
}

function renderVideoMarkup(url) {
  return `<video src="${url}" autoplay muted loop playsinline webkit-playsinline preload="auto"></video>`;
}

function renderVideoMarkupWithPoster(url, posterUrl = "") {
  const posterImage = posterUrl
    ? `<img class="hero-video-poster" src="${posterUrl}" alt="" loading="eager" fetchpriority="high" decoding="async" />`
    : "";
  return `
    <div class="hero-video-shell" data-video-src="${url}" data-video-poster="${posterUrl}">
      ${posterImage}
    </div>
  `;
}

async function createVideoPosterFromUrl(url, maxWidth = 480, quality = 0.68) {
  if (!url) return "";

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = url;

    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const fallback = () => {
      cleanup();
      resolve("");
    };

    video.addEventListener(
      "loadeddata",
      () => {
        try {
          const ratio = Math.min(1, maxWidth / Math.max(video.videoWidth || 1, 1));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round((video.videoWidth || 1) * ratio));
          canvas.height = Math.max(1, Math.round((video.videoHeight || 1) * ratio));
          const context = canvas.getContext("2d");
          if (!context) {
            fallback();
            return;
          }
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          cleanup();
          resolve(dataUrl);
        } catch (error) {
          fallback();
        }
      },
      { once: true }
    );

    video.addEventListener("error", fallback, { once: true });
  });
}

async function dataUrlToFileFromMain(dataUrl, fileName = "poster.jpg") {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

function primeVideoElement(video, url) {
  if (!(video instanceof HTMLVideoElement) || !url) return;
  video.src = url;
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("loop", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("preload", "metadata");
  video.load();
  const tryPlay = () => video.play?.().catch(() => {});
  if (video.readyState >= 2) {
    tryPlay();
  } else {
    video.addEventListener("loadeddata", tryPlay, { once: true });
  }
}

function bootDeferredHeroVideos(root = document) {
  const shells = Array.from(root.querySelectorAll(".hero-video-shell[data-video-src]"));
  if (!shells.length) return;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const effectiveType = String(connection?.effectiveType || "");
  const baseDelay =
    connection?.saveData || effectiveType.includes("2g")
      ? 700
      : effectiveType.includes("3g")
        ? 300
        : 80;

  const mountVideo = (shell) => {
    if (!(shell instanceof HTMLElement)) return;
    if (shell.dataset.booted === "true") return;

    const url = shell.dataset.videoSrc || "";
    if (!url) return;

    shell.dataset.booted = "true";
    const video = document.createElement("video");
    const posterUrl = shell.dataset.videoPoster || "";
    if (posterUrl) {
      video.setAttribute("poster", posterUrl);
    }
    shell.appendChild(video);
    primeVideoElement(video, url);
    const reveal = () => shell.classList.add("is-ready");
    if (video.readyState >= 2) {
      reveal();
    } else {
      video.addEventListener("loadeddata", reveal, { once: true });
    }
  };

  const start = () => {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            window.setTimeout(() => mountVideo(entry.target), baseDelay);
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "800px 0px" }
      );
      shells.forEach((shell) => observer.observe(shell));
      return;
    }

    shells.forEach((shell, index) => {
      window.setTimeout(() => mountVideo(shell), baseDelay + index * 80);
    });
  };

  window.addEventListener(
    "load",
    () => {
      window.setTimeout(start, 60);
    },
    { once: true }
  );

  if (document.readyState === "complete") {
    window.setTimeout(start, 60);
  }
}

function renderHeroMedia(url, type, className, palette, angle) {
  const key =
    className === "page-hero-image"
      ? siteState.main.heroMediaKey
      : className === "about-hero-image"
        ? siteState.about.mediaKey
        : "";
  const posterKey =
    className === "page-hero-image"
      ? siteState.main.heroPosterKey
      : className === "about-hero-image"
        ? siteState.about.posterKey
        : "";

  if (isRemoteKey(key)) {
    const remoteUrl = readRemoteMediaUrl(key);
    if (type === "video") {
      const posterUrl = isRemoteKey(posterKey) ? readRemoteMediaUrl(posterKey) : url;
      return `<div class="${className} media-frame" style="${mediaStyle(url, palette, angle)}">${renderVideoMarkupWithPoster(
        remoteUrl,
        posterUrl
      )}</div>`;
    }

    return `<div class="${className} media-frame"><img src="${remoteUrl}" alt="" loading="eager" fetchpriority="high" decoding="async" /></div>`;
  }

  if (!url) {
    return `<div class="${className}" style="${mediaStyle("", palette, angle)}"></div>`;
  }

  if (type === "video") {
    return `<div class="${className} media-frame">${renderVideoMarkup(url)}</div>`;
  }

  return `<div class="${className} media-frame"><img src="${url}" alt="" loading="eager" fetchpriority="high" decoding="async" /></div>`;
}

async function hydrateStoredMedia(root = document) {
  const nodes = root.querySelectorAll("[data-media-key]");
  for (const node of nodes) {
    const key = node.getAttribute("data-media-key");
    const type = node.getAttribute("data-media-type") || "image";
    const url = await readMediaAssetUrl(key);
    if (!url) continue;
    if (node instanceof HTMLImageElement) {
      node.src = url;
      continue;
    }
    if (node instanceof HTMLVideoElement) {
      primeVideoElement(node, url);
      continue;
    }
    node.innerHTML =
      type === "video"
        ? renderVideoMarkup(url)
        : `<img src="${url}" alt="" />`;
    if (type === "video") {
      const video = node.querySelector("video");
      primeVideoElement(video, url);
    }
  }
}

async function backfillHeroPoster(section) {
  if (!isRemoteStorageEnabled()) return;

  const isMain = section === "main";
  const state = isMain ? siteState.main : siteState.about;
  const videoKey = isMain ? state.heroMediaKey : state.mediaKey;
  const posterKey = isMain ? state.heroPosterKey : state.posterKey;
  const mediaType = isMain ? state.heroMediaType : state.mediaType;

  if (mediaType !== "video" || !isRemoteKey(videoKey) || posterKey) return;

  try {
    const videoUrl = readRemoteMediaUrl(videoKey);
    const posterDataUrl = await createVideoPosterFromUrl(videoUrl);
    if (!posterDataUrl) return;

    const posterFile = await dataUrlToFileFromMain(
      posterDataUrl,
      `${(isMain ? state.heroImageName : state.imageName || "video").replace(/\.[^.]+$/, "")}-poster.jpg`
    );
    const nextPosterKey = await saveMediaAssetToRemote(posterFile);
    if (!nextPosterKey) return;

    if (isMain) {
      siteState.main.heroPosterKey = nextPosterKey;
      await remoteRequest("/site-media", {
        method: "POST",
        body: JSON.stringify({
          section: "main",
          payload: {
            heroImageName: siteState.main.heroImageName,
            heroMediaType: siteState.main.heroMediaType,
            heroMediaKey: siteState.main.heroMediaKey,
            heroPosterKey: nextPosterKey,
          },
        }),
      });
      const video = document.querySelector(".page-hero-image video");
      if (video) {
        video.setAttribute("poster", readRemoteMediaUrl(nextPosterKey));
      }
      return;
    }

    siteState.about.posterKey = nextPosterKey;
    await remoteRequest("/site-media", {
      method: "POST",
      body: JSON.stringify({
        section: "about",
        payload: {
          imageName: siteState.about.imageName,
          mediaType: siteState.about.mediaType,
          mediaKey: siteState.about.mediaKey,
          posterKey: nextPosterKey,
        },
      }),
    });
    const video = document.querySelector(".about-hero-image video");
    if (video) {
      video.setAttribute("poster", readRemoteMediaUrl(nextPosterKey));
    }
  } catch (error) {
    console.error("Failed to backfill hero poster", error);
  }
}

function extractFirstMedia(html) {
  const safeHtml = sanitizeRichContentForPublic(html);
  const imageMatch = String(safeHtml || "").match(/<img[^>]+src="([^"]+)"/i);
  if (imageMatch) return imageMatch[1];
  return "";
}

function productThumbnail(product) {
  return product.thumbnailUrl || extractFirstMedia(product.content);
}

function productCover(product) {
  return product.coverUrl || product.thumbnailUrl || extractFirstMedia(product.content);
}

function renderProductThumb(product) {
  const fallbackUrl = productThumbnail(product);
  if (isRemoteKey(product.thumbnailKey)) {
    return `<div class="tile-image media-frame"><img src="${readRemoteMediaUrl(product.thumbnailKey)}" alt="" /></div>`;
  }

  return `<div class="tile-image" style="${mediaStyle(fallbackUrl, product.palette, 145)}"></div>`;
}

function renderProductCover(product) {
  const fallbackUrl = productCover(product);
  if (isRemoteKey(product.coverKey)) {
    return `<div class="detail-cover media-frame"><img src="${readRemoteMediaUrl(product.coverKey)}" alt="" /></div>`;
  }

  return `<div class="detail-cover" style="${mediaStyle(fallbackUrl, product.palette, 135)}"></div>`;
}

function renderProductGallery(product) {
  const items = Array.isArray(product.gallery)
    ? product.gallery.filter((item) => item && item.url)
    : [];

  if (!items.length) return "";

  return `
    <div class="detail-gallery">
      ${items
        .map((item) => `<div class="tile-image" style="${mediaStyle(item.url, product.palette, 145)}"></div>`)
        .join("")}
    </div>
  `;
}

function renderFloatingSymbol() {
  const link = String(siteState.branding?.logoLink || "").trim();
  const logoMarkup = `<img class="floating-logo-image" src="./logo.png?v=3" alt="TY" />`;
  if (!link) {
    return `<div class="floating-mark" aria-hidden="true">${logoMarkup}</div>`;
  }

  return `<a class="floating-mark floating-mark-link" href="${link}" target="_blank" rel="noreferrer noopener" aria-label="외부 링크 열기">${logoMarkup}</a>`;
}

function renderHome() {
  const mainProducts = siteState.products.filter((product) => product.active && product.showOnMain);
  app.innerHTML = `
    <section class="home-main">
      ${renderHeroMedia(
        siteState.main.heroImageUrl,
        siteState.main.heroMediaType,
        "page-hero-image",
        siteState.main.heroBackground,
        135
      )}
      ${
        siteState.main.workListEnabled
          ? `
            <section class="work-main">
              <div class="work-grid">
                ${mainProducts
                  .map(
                    (product) => `
                      <a class="work-card" href="./work-detail.html?id=${product.slug}">
                        ${renderProductThumb(product)}
                        <strong>${product.name}</strong>
                        <p>${product.summary}</p>
                      </a>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
          : ""
      }
      ${renderFloatingSymbol()}
    </section>
  `;
  hydrateStoredMedia(app);
  bootDeferredHeroVideos(app);
}

function renderAbout() {
  if (!siteState.about.enabled) {
    app.innerHTML = "<main class='about-main'><p>About page is disabled.</p></main>";
    return;
  }

  app.innerHTML = `
    <main class="about-main">
      ${
        siteState.about.imageEnabled
          ? renderHeroMedia(
              siteState.about.imageUrl,
              siteState.about.mediaType,
              "about-hero-image",
              siteState.main.heroBackground,
              135
            )
          : ""
      }
      ${siteState.about.sections
        .map(
          (section) => `
            <section class="about-section">
              <h2>→ ${section.title}</h2>
              <div>
                <p>${section.content}</p>
                ${
                  section.chips.length
                    ? `<div class="chip-list">${section.chips
                        .map((chip) => `<span class="chip">${chip}</span>`)
                        .join("")}</div>`
                    : ""
                }
              </div>
            </section>
          `
        )
        .join("")}
      ${renderFloatingSymbol()}
    </main>
  `;
  hydrateStoredMedia(app);
  bootDeferredHeroVideos(app);
}

function renderContact() {
  app.innerHTML = `
    <section class="contact-main">
      <div>
        <h1>Contact with us</h1>
      </div>
      <form class="contact-form-public" id="public-contact-form">
        <label>브랜드 명<input type="text" name="brand" placeholder="브랜드 명을 입력해 주세요." required></label>
        <label>담당자 이름<input type="text" name="name" placeholder="담당자 이름을 입력해 주세요." required></label>
        <label>담당자 연락처<input type="text" name="contact" placeholder="연락처를 입력해 주세요." required></label>
        <label>내용<textarea name="message" rows="4" placeholder="촬영 시기, 레퍼런스, 예산 등을 입력해 주세요." required></textarea></label>
        <button class="primary-button" type="submit">문의 등록</button>
        <p class="contact-feedback" id="contact-feedback" aria-live="polite"></p>
      </form>
      ${renderFloatingSymbol()}
    </section>
  `;

  const form = document.querySelector("#public-contact-form");
  const feedback = document.querySelector("#contact-feedback");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    createInquiry({
      brand: String(data.get("brand") || "").trim(),
      name: String(data.get("name") || "").trim(),
      contact: String(data.get("contact") || "").trim(),
      message: String(data.get("message") || "").trim(),
    });
    form.reset();
    feedback.textContent = "문의가 등록되었습니다.";
  });
}

function renderWork() {
  const products = siteState.products.filter((product) => product.active);
  const categories = (siteState.categories || []).filter((category) =>
    products.some((product) => product.category === category)
  );
  const activeCategory = new URLSearchParams(location.search).get("category") || categories[0] || "";
  const filtered = products.filter((product) => product.category === activeCategory);

  app.innerHTML = `
    <main class="work-main">
      <div class="tab-bar">
        ${categories
          .map(
            (category) => `
              <a class="tab-link ${category === activeCategory ? "active" : ""}" href="./work.html?category=${encodeURIComponent(
                category
              )}">${category}</a>
            `
          )
          .join("")}
      </div>
      <div class="work-grid">
        ${filtered
          .map(
            (product) => `
              <a class="work-card" href="./work-detail.html?id=${product.slug}">
                ${renderProductThumb(product)}
                <strong>${product.name}</strong>
                <p>${product.summary}</p>
              </a>
            `
          )
          .join("")}
      </div>
      ${renderFloatingSymbol()}
    </main>
  `;
  hydrateStoredMedia(app);
}

function renderWorkDetail() {
  const slug = new URLSearchParams(location.search).get("id");
  const product = siteState.products.find((item) => item.slug === slug) || siteState.products[0];
  const safeContent = sanitizeRichContentForPublic(product.content);

  app.innerHTML = `
    <main class="detail-main">
      ${renderProductCover(product)}
      <h1>${product.name}</h1>
      <p>${product.summary}</p>
      <div class="detail-rich">${safeContent}</div>
      ${renderProductGallery(product)}
      ${renderFloatingSymbol()}
    </main>
  `;
  hydrateStoredMedia(app);
}

function renderPage() {
  if (page === "home") renderHome();
  if (page === "about") renderAbout();
  if (page === "contact") renderContact();
  if (page === "work") renderWork();
  if (page === "work-detail") renderWorkDetail();
}

async function bootPage() {
  renderPage();
  const remoteState = await refreshSiteStateFromRemote(page);
  siteState = await migrateSiteStateMediaToRemote(remoteState);
  renderPage();
  if (page === "home") backfillHeroPoster("main");
  if (page === "about") backfillHeroPoster("about");
}

bootPage();
