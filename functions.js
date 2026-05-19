function getFocusableElements(container) {
  if (!(container instanceof HTMLElement)) return [];
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) =>
      el instanceof HTMLElement && !el.hasAttribute("disabled") && el.offsetParent !== null
  );
}

/* runtime Only JS for smooth scrolling and active section highlighting */
(() => {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getHeaderOffset() {
    const header = document.querySelector(".siteHeader");
    if (!header) return 0;
    const rect = header.getBoundingClientRect();
    return Math.ceil(rect.height);
  }

  function smoothScrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const offset = getHeaderOffset() + 12;
    const top = window.scrollY + el.getBoundingClientRect().top - offset;

    window.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  const sectionIds = ["home", "works", "contact-cta"];
  const navLinks = Array.from(document.querySelectorAll(".nav .navLink[data-scroll]")).filter((a) => {
    const href = a.getAttribute("href") || "";
    return sectionIds.some((id) => href === `#${id}`);
  });

  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter((el) => el instanceof HTMLElement);

  function setNavAriaCurrentForSection(activeId) {
    if (!sectionIds.includes(activeId)) return;
    for (const link of navLinks) {
      const isCurrent = link.getAttribute("href") === `#${activeId}`;
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }

  function updateActiveSectionFromScroll() {
    if (!sections.length || !navLinks.length) return;

    const scannerY = getHeaderOffset() + window.innerHeight * 0.25;
    let activeId = sectionIds[0];

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!(el instanceof HTMLElement)) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= scannerY) activeId = id;
    }

    setNavAriaCurrentForSection(activeId);
  }

  let scrollSpyTicking = false;
  function requestScrollSpyUpdate() {
    if (!sections.length || !navLinks.length) return;
    if (scrollSpyTicking) return;
    scrollSpyTicking = true;
    window.requestAnimationFrame(() => {
      scrollSpyTicking = false;
      updateActiveSectionFromScroll();
    });
  }

  if (sections.length && navLinks.length) {
    window.addEventListener("scroll", requestScrollSpyUpdate, { passive: true });
    window.addEventListener("resize", requestScrollSpyUpdate);
    window.addEventListener("load", requestScrollSpyUpdate);
    requestScrollSpyUpdate();
  }

  // Smooth scrolling for internal links
  document.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest("a[data-scroll]") : null;
    if (!a) return;

    const href = a.getAttribute("href") || "";
    if (href === "#" || a.getAttribute("aria-disabled") === "true") {
      e.preventDefault();
      return;
    }
    if (!href.startsWith("#")) return;

    const id = href.slice(1);
    if (!id) return;

    e.preventDefault();
    if (sectionIds.includes(id)) setNavAriaCurrentForSection(id);
    smoothScrollToId(id);
  });

})();

/* Gallery marquee — seamless continuous scroll */
(() => {
  const wrap = document.querySelector("[data-gallery-marquee]");
  if (!wrap) return;

  const track = wrap.querySelector(".galleryTrackAuto");
  const sets = Array.from(wrap.querySelectorAll(".galleryTrackSet")).filter(
    (el) => el instanceof HTMLElement
  );
  if (!(track instanceof HTMLElement) || sets.length < 2) return;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const speedPxPerSec = 52;
  let offset = 0;
  let loopWidth = 0;
  let lastTime = 0;
  let rafId = 0;

  function measureLoopWidth() {
    const first = sets[0];
    const second = sets[1];
    loopWidth = second.offsetLeft - first.offsetLeft;
    if (loopWidth <= 0) loopWidth = first.offsetWidth + 20;
  }

  function tick(time) {
    if (!lastTime) lastTime = time;
    const deltaSec = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    offset += speedPxPerSec * deltaSec;
    if (loopWidth > 0 && offset >= loopWidth) {
      offset %= loopWidth;
    }

    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    rafId = window.requestAnimationFrame(tick);
  }

  measureLoopWidth();
  window.addEventListener("resize", measureLoopWidth);
  window.addEventListener("load", measureLoopWidth);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(rafId);
      lastTime = 0;
    } else {
      rafId = window.requestAnimationFrame(tick);
    }
  });

  rafId = window.requestAnimationFrame(tick);
})();

/* FAQ accordion */
(() => {
  const list = document.querySelector("[data-faq-list]");
  if (!list) return;

  const triggers = Array.from(list.querySelectorAll(".faqQuestion")).filter(
    (el) => el instanceof HTMLButtonElement
  );
  if (!triggers.length) return;

  function closeItem(btn) {
    const panelId = btn.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    btn.setAttribute("aria-expanded", "false");
    if (panel) panel.hidden = true;
  }

  function openItem(btn) {
    const panelId = btn.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    btn.setAttribute("aria-expanded", "true");
    if (panel) panel.hidden = false;
  }

  for (const btn of triggers) {
    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      for (const other of triggers) {
        if (other !== btn) closeItem(other);
      }
      if (isOpen) closeItem(btn);
      else openItem(btn);
    });
  }
})();

(() => {
  const form = document.getElementById("contactForm");
  const modal = document.getElementById("contactModal");
  if (!(form instanceof HTMLFormElement) || !(modal instanceof HTMLElement)) return;

  const titleEl = document.getElementById("contactModalTitle");
  const descEl = document.getElementById("contactModalDesc");
  const statusEl = form.querySelector(".formStatus");
  const submitBtn = form.querySelector('button[type="submit"]');
  const inputs = Array.from(form.querySelectorAll("input, textarea")).filter(
    (el) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
  );

  let lastFocused = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || "";
  }

  function setSending(isSending) {
    form.classList.toggle("isSending", isSending);
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = isSending;
  }

  function validate() {
    let ok = true;
    for (const el of inputs) {
      const isValid = el.checkValidity();
      el.setAttribute("aria-invalid", String(!isValid));
      if (!isValid && ok) {
        ok = false;
        el.focus();
      }
    }
    return ok;
  }

  function openModal({ title, desc }) {
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;

    modal.classList.add("isOpen");
    modal.setAttribute("aria-hidden", "false");

    const focusables = getFocusableElements(modal);
    (focusables[0] || modal).focus?.();
  }

  function closeModal() {
    modal.classList.remove("isOpen");
    modal.setAttribute("aria-hidden", "true");
    if (lastFocused) lastFocused.focus();
    lastFocused = null;
  }

  modal.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest("[data-modal-close]")) closeModal();
  });

  form.addEventListener("input", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el) return;
    if (el.matches("input, textarea")) el.removeAttribute("aria-invalid");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    if (!validate()) {
      setStatus("Please check the highlighted fields.");
      return;
    }

    setSending(true);
    setStatus("Sending…");

    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });

      if (res.ok) {
        form.reset();
        setStatus("");
        openModal({
          title: "Message sent",
          desc: "Thanks — I’ll get back to you soon.",
        });
      } else {
        openModal({
          title: "Something went wrong",
          desc: "Your message didn’t send. Please try again in a moment.",
        });
      }
    } catch {
      openModal({
        title: "Network error",
        desc: "You appear to be offline. Please check your connection and try again.",
      });
    } finally {
      setSending(false);
    }
  });
})();

/* Work detail modal — images from data-work-images; carousel when multiple */

(() => {
  const grid = document.querySelector(".portfolioGrid");
  const modal = document.getElementById("workDetailModal");
  const heroEl = document.getElementById("workDetailHero");
  const titleEl = document.getElementById("workDetailTitle");
  const metaEl = document.getElementById("workDetailMeta");
  const descEl = document.getElementById("workDetailDesc");

  if (!grid || !modal || !heroEl || !titleEl || !metaEl || !descEl) return;

  const THUMB_CLASSES = ["thumbA", "thumbB", "thumbC", "thumbD", "thumbE", "thumbF"];

  let lastFocused = null;
  let carouselCleanup = null;
  let flipbookCleanup = null;
  let flipbookLoadId = 0;

  const PDF_JS =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDF_WORKER =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const PAGE_FLIP =
    "https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js";

  const FLIPBOOK_CACHE_PREFIX = "smb-flipbook:";
  const FLIPBOOK_CACHE_VERSION = 1;
  const FLIPBOOK_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  const VIDEO_EXT = /\.(mov|mp4|webm|m4v|ogg)(\?.*)?$/i;

  function isVideoSrc(src) {
    return VIDEO_EXT.test(src);
  }

  function parseMediaList(raw) {
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /** Grid card thumbnail — data-work-images */
  function parseWorkImages(card) {
    return parseMediaList(card.getAttribute("data-work-images"));
  }

  /** Modal when clicked — data-work-detail-images (falls back to data-work-images) */
  function parseWorkDetailImages(card) {
    const detail = card.getAttribute("data-work-detail-images");
    if (detail) return parseMediaList(detail);
    return parseWorkImages(card);
  }

  function firstImageSrc(urls) {
    return urls.find((src) => !isVideoSrc(src)) || urls[0] || "";
  }

  function stripThumbClasses(el) {
    for (const c of THUMB_CLASSES) el.classList.remove(c);
  }

  function setCardPreview(card) {
    const media = card.querySelector(".caseCardMedia");
    if (!(media instanceof HTMLElement)) return;

    const images = parseWorkImages(card);
    const preview = firstImageSrc(images);
    if (preview && !isVideoSrc(preview)) {
      media.style.backgroundImage = `url("${preview}")`;
      media.style.backgroundSize = "cover";
      media.style.backgroundPosition = "center";
      stripThumbClasses(media);
      return;
    }

    const thumb = card.getAttribute("data-work-thumb");
    if (thumb && THUMB_CLASSES.includes(thumb)) {
      stripThumbClasses(media);
      media.classList.add(thumb);
      media.style.backgroundImage = "";
    }
  }

  function createWorkCarousel(mediaUrls, title) {
    let index = 0;
    const root = document.createElement("div");
    root.className = "workDetailCarousel";

    const viewport = document.createElement("div");
    viewport.className = "workDetailCarouselViewport";

    const track = document.createElement("div");
    track.className = "workDetailCarouselTrack";

    const slides = mediaUrls.map((src, i) => {
      const slide = document.createElement("div");
      slide.className = "workDetailCarouselSlide";
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      const label = isVideoSrc(src) ? "video" : "image";
      slide.setAttribute("aria-label", `${label} ${i + 1} of ${mediaUrls.length}`);

      if (isVideoSrc(src)) {
        const video = document.createElement("video");
        video.src = encodeURI(src);
        video.controls = true;
        video.playsInline = true;
        video.preload = i === 0 ? "metadata" : "none";
        video.setAttribute("aria-label", title ? `${title} — film` : "Project film");
        slide.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.src = src;
        img.alt = title ? `${title} — image ${i + 1} of ${mediaUrls.length}` : "";
        img.loading = i === 0 ? "eager" : "lazy";
        slide.appendChild(img);
      }

      track.appendChild(slide);
      return slide;
    });

    viewport.appendChild(track);

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "workDetailCarouselBtn workDetailCarouselBtn--prev";
    prevBtn.setAttribute("aria-label", "Previous slide");
    prevBtn.textContent = "‹";

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "workDetailCarouselBtn workDetailCarouselBtn--next";
    nextBtn.setAttribute("aria-label", "Next slide");
    nextBtn.textContent = "›";

    const dots = document.createElement("div");
    dots.className = "workDetailCarouselDots";
    dots.setAttribute("role", "tablist");
    dots.setAttribute("aria-label", "Choose slide");

    const dotButtons = mediaUrls.map((src, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "workDetailCarouselDot";
      dot.setAttribute("role", "tab");
      dot.setAttribute(
        "aria-label",
        isVideoSrc(src) ? `Video ${i + 1}` : `Image ${i + 1}`
      );
      dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
      dots.appendChild(dot);
      return dot;
    });

    function pauseVideos() {
      for (const video of root.querySelectorAll("video")) {
        if (video instanceof HTMLVideoElement) video.pause();
      }
    }

    function goTo(nextIndex) {
      pauseVideos();
      index = (nextIndex + mediaUrls.length) % mediaUrls.length;
      track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
      for (let i = 0; i < slides.length; i++) {
        const active = i === index;
        slides[i].classList.toggle("isActive", active);
        dotButtons[i].setAttribute("aria-selected", active ? "true" : "false");
        dotButtons[i].classList.toggle("isActive", active);
      }
    }

    prevBtn.addEventListener("click", () => goTo(index - 1));
    nextBtn.addEventListener("click", () => goTo(index + 1));
    dotButtons.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));

    const onKeydown = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      }
    };
    root.addEventListener("keydown", onKeydown);

    root.append(viewport, prevBtn, nextBtn, dots);
    goTo(0);

    return {
      el: root,
      cleanup() {
        pauseVideos();
        root.removeEventListener("keydown", onKeydown);
      },
    };
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") resolve();
        else existing.addEventListener("load", () => resolve(), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      document.head.appendChild(script);
    });
  }

  async function ensureFlipbookLibs() {
    await loadScriptOnce(PDF_JS);
    await loadScriptOnce(PAGE_FLIP);
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
    }
  }

  function flipbookCacheKey(pdfUrl) {
    return `${FLIPBOOK_CACHE_PREFIX}v${FLIPBOOK_CACHE_VERSION}:${pdfUrl}`;
  }

  function readFlipbookCache(pdfUrl) {
    try {
      const key = flipbookCacheKey(pdfUrl);
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const data = JSON.parse(raw);
      const expired =
        !data?.savedAt || Date.now() - data.savedAt > FLIPBOOK_CACHE_MAX_AGE_MS;
      const invalid =
        !Array.isArray(data?.pageImages) || !data.pageImages.length;

      if (expired || invalid) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  function clearOldFlipbookCaches(keepKey) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(FLIPBOOK_CACHE_PREFIX) && key !== keepKey) {
        keys.push(key);
      }
    }
    for (const key of keys) localStorage.removeItem(key);
  }

  function writeFlipbookCache(pdfUrl, payload) {
    const key = flipbookCacheKey(pdfUrl);
    const entry = {
      pdfUrl,
      pageImages: payload.pageImages,
      bookWidth: payload.bookWidth,
      bookHeight: payload.bookHeight,
      pageCount: payload.pageCount,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(entry));
      return true;
    } catch (err) {
      if (err?.name !== "QuotaExceededError") return false;
      clearOldFlipbookCaches(key);
      try {
        localStorage.setItem(key, JSON.stringify(entry));
        return true;
      } catch {
        return false;
      }
    }
  }

  function mountPdfFlipbook(pageImages, bookWidth, bookHeight) {
    const PageFlip = window.St?.PageFlip || window.PageFlip;
    if (!PageFlip) {
      throw new Error("Flipbook library failed to load");
    }

    const root = document.createElement("div");
    root.className = "workPdfFlipbook";

    const hint = document.createElement("p");
    hint.className = "workPdfFlipbookHint";
    hint.textContent = "Drag a page corner or click the edges to flip.";

    const bookEl = document.createElement("div");
    bookEl.className = "workPdfFlipbookBook";
    root.append(hint, bookEl);

    const pageFlip = new PageFlip(bookEl, {
      width: bookWidth,
      height: bookHeight,
      size: "stretch",
      minWidth: 280,
      maxWidth: 720,
      minHeight: 360,
      maxHeight: 900,
      showCover: true,
      mobileScrollSupport: false,
      usePortrait: true,
    });

    pageFlip.loadFromImages(pageImages);

    return {
      el: root,
      cleanup() {
        try {
          pageFlip.destroy();
        } catch {
          /* already destroyed */
        }
      },
    };
  }

  async function renderPdfToImages(pdfUrl, onProgress) {
    const { pdfjsLib } = window;
    if (!pdfjsLib) throw new Error("PDF.js failed to load");

    const pdf = await pdfjsLib.getDocument(encodeURI(pdfUrl)).promise;
    const pageImages = [];
    let bookWidth = 420;
    let bookHeight = 594;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (onProgress) onProgress(`Rendering page ${pageNum} of ${pdf.numPages}…`);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.35 });
      if (pageNum === 1) {
        bookWidth = Math.round(Math.min(viewport.width, 520));
        bookHeight = Math.round(Math.min(viewport.height, 720));
      }
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) continue;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      pageImages.push(canvas.toDataURL("image/jpeg", 0.85));
    }

    return { pageImages, bookWidth, bookHeight, pageCount: pdf.numPages };
  }

  async function createPdfFlipbook(pdfUrl, title, onProgress) {
    await ensureFlipbookLibs();

    const cached = readFlipbookCache(pdfUrl);
    if (cached) {
      if (onProgress) onProgress("Loading flipbook from cache…");
      return mountPdfFlipbook(cached.pageImages, cached.bookWidth, cached.bookHeight);
    }

    const rendered = await renderPdfToImages(pdfUrl, onProgress);
    writeFlipbookCache(pdfUrl, rendered);

    return mountPdfFlipbook(
      rendered.pageImages,
      rendered.bookWidth,
      rendered.bookHeight
    );
  }

  function openPdfFlipbookInHero(pdfUrl, title) {
    const loadId = ++flipbookLoadId;

    heroEl.className = "workDetailHero workDetailHero--flipbook";
    heroEl.removeAttribute("aria-hidden");
    heroEl.innerHTML = "";

    const loading = document.createElement("p");
    loading.className = "workPdfFlipbookLoading";
    loading.textContent = "Loading flipbook…";
    heroEl.appendChild(loading);

    createPdfFlipbook(pdfUrl, title, (message) => {
      if (loadId !== flipbookLoadId) return;
      loading.textContent = message;
    })
      .then((flipbook) => {
        if (loadId !== flipbookLoadId) {
          flipbook.cleanup();
          return;
        }
        heroEl.innerHTML = "";
        heroEl.appendChild(flipbook.el);
        flipbookCleanup = flipbook.cleanup;
      })
      .catch(() => {
        if (loadId !== flipbookLoadId) return;
        heroEl.innerHTML = "";
        const err = document.createElement("p");
        err.className = "workPdfFlipbookError";
        err.textContent =
          "Could not load the flipbook. Check your connection, or open the PDF directly.";
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "workPdfFlipbookLink";
        link.textContent = "Open PDF in new tab";
        heroEl.append(err, link);
      });
  }

  function resetWorkHero() {
    flipbookLoadId += 1;
    if (flipbookCleanup) {
      flipbookCleanup();
      flipbookCleanup = null;
    }
    if (carouselCleanup) {
      carouselCleanup();
      carouselCleanup = null;
    }
    heroEl.innerHTML = "";
    heroEl.className = "workDetailHero workThumb thumbA";
    stripThumbClasses(heroEl);
    heroEl.setAttribute("aria-hidden", "true");
  }

  function openWorkModal(card) {
    if (!(card instanceof HTMLElement)) return;

    const title = card.getAttribute("data-work-title") || "";
    const meta = card.getAttribute("data-work-meta") || "";
    const desc = card.getAttribute("data-work-desc") || "";
    const thumb = card.getAttribute("data-work-thumb") || "thumbA";
    const embedUrl = card.getAttribute("data-work-embed");
    const pdfUrl = card.getAttribute("data-work-pdf");
    const images = parseWorkDetailImages(card);

    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    heroEl.innerHTML = "";
    stripThumbClasses(heroEl);
    if (carouselCleanup) {
      carouselCleanup();
      carouselCleanup = null;
    }

    if (embedUrl) {
      heroEl.className = "workDetailHero workDetailHero--embed";
      heroEl.removeAttribute("aria-hidden");

      const iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.title = title ? `${title} — interactive prototype` : "Interactive prototype";
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute(
        "sandbox",
        "allow-same-origin allow-scripts allow-pointer-lock allow-forms allow-popups allow-popups-to-escape-sandbox"
      );
      heroEl.appendChild(iframe);
    } else if (pdfUrl) {
      openPdfFlipbookInHero(pdfUrl, title);
    } else if (images.length > 1 && images.some(isVideoSrc)) {
      heroEl.className = "workDetailHero workDetailHero--carousel";
      heroEl.removeAttribute("aria-hidden");
      const carousel = createWorkCarousel(images, title);
      heroEl.appendChild(carousel.el);
      carouselCleanup = carousel.cleanup;
    } else if (images.length >= 1) {
      const src = firstImageSrc(images);
      heroEl.className = "workDetailHero workDetailHero--image";
      heroEl.removeAttribute("aria-hidden");
      if (isVideoSrc(src)) {
        const video = document.createElement("video");
        video.src = encodeURI(src);
        video.controls = true;
        video.playsInline = true;
        video.setAttribute("aria-label", title ? `${title} — film` : "Project film");
        heroEl.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.src = src;
        img.alt = title || "Project image";
        heroEl.appendChild(img);
      }
    } else {
      heroEl.className = "workDetailHero workThumb";
      if (THUMB_CLASSES.includes(thumb)) heroEl.classList.add(thumb);
      heroEl.setAttribute("aria-hidden", "true");
    }

    titleEl.textContent = title;
    metaEl.textContent = meta;
    descEl.textContent = desc;

    modal.classList.add("isOpen");
    modal.setAttribute("aria-hidden", "false");
    modal.scrollTop = 0;

    const closeBtn = modal.querySelector(".workDetailClose[data-modal-close]");
    if (closeBtn instanceof HTMLElement) {
      closeBtn.focus();
    } else {
      const fallback = modal.querySelector("[data-modal-close]");
      if (fallback instanceof HTMLElement) fallback.focus();
    }
  }

  function closeWorkModal() {
    modal.classList.remove("isOpen");
    modal.setAttribute("aria-hidden", "true");
    resetWorkHero();
    if (lastFocused) lastFocused.focus();
    lastFocused = null;
  }

  for (const card of grid.querySelectorAll(".portfolioCard")) {
    if (card instanceof HTMLElement) setCardPreview(card);
  }

  grid.addEventListener("click", (e) => {
    const card = e.target instanceof Element ? e.target.closest(".portfolioCard") : null;
    if (!(card instanceof HTMLElement)) return;
    openWorkModal(card);
  });

  grid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target instanceof Element ? e.target.closest(".portfolioCard") : null;
    if (!(card instanceof HTMLElement)) return;
    e.preventDefault();
    openWorkModal(card);
  });

  modal.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest("[data-modal-close]")) closeWorkModal();
  });
})();

/* runtime Only JS for mobile menu */
(() => {
  const mq = window.matchMedia("(max-width: 768px)");
  const toggle = document.querySelector(".navToggle");
  const nav = document.getElementById("primaryNav");
  const backdrop = document.querySelector("[data-nav-backdrop]");
  if (!toggle || !nav) return;

  function isMobileNav() {
    return mq.matches;
  }

  function isModalOpen() {
    return Boolean(document.querySelector(".modal.isOpen"));
  }

  function setNavInertAndHidden(mobileClosed) {
    if (!isMobileNav()) {
      nav.removeAttribute("aria-hidden");
      if ("inert" in nav) nav.inert = false;
      return;
    }
    if (mobileClosed) {
      nav.setAttribute("aria-hidden", "true");
      if ("inert" in nav) nav.inert = true;
    } else {
      nav.setAttribute("aria-hidden", "false");
      if ("inert" in nav) nav.inert = false;
    }
  }

  function closeMenu() {
    document.body.classList.remove("isNavOpen");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    if (backdrop instanceof HTMLElement) {
      backdrop.setAttribute("aria-hidden", "true");
    }
    setNavInertAndHidden(true);
  }

  function openMenu() {
    document.body.classList.add("isNavOpen");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    if (backdrop instanceof HTMLElement) {
      backdrop.setAttribute("aria-hidden", "false");
    }
    setNavInertAndHidden(false);
    const first = nav.querySelector("a");
    if (first instanceof HTMLElement) {
      window.requestAnimationFrame(() => first.focus());
    }
  }

  function getHeaderFocusTrapOrder() {
    const brand = document.querySelector(".headerInner .brand");
    const links = Array.from(nav.querySelectorAll(".navLink"));
    const ordered = [];
    if (brand instanceof HTMLElement) ordered.push(brand);
    ordered.push(toggle);
    for (const a of links) {
      if (a instanceof HTMLElement) ordered.push(a);
    }
    return ordered;
  }

  function syncBreakpoint() {
    if (!isMobileNav()) {
      closeMenu();
      setNavInertAndHidden(false);
      return;
    }
    setNavInertAndHidden(!document.body.classList.contains("isNavOpen"));
  }

  mq.addEventListener("change", syncBreakpoint);
  window.addEventListener("load", syncBreakpoint);
  syncBreakpoint();

  toggle.addEventListener("click", () => {
    if (!isMobileNav()) return;
    if (document.body.classList.contains("isNavOpen")) {
      closeMenu();
      toggle.focus();
    } else {
      openMenu();
    }
  });

  if (backdrop instanceof HTMLElement) {
    backdrop.addEventListener("click", () => {
      if (!isMobileNav()) return;
      closeMenu();
      toggle.focus();
    });
  }

  nav.addEventListener("click", (e) => {
    if (!isMobileNav() || !document.body.classList.contains("isNavOpen")) return;
    if (e.target instanceof Element && e.target.closest("a")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!isMobileNav() || !document.body.classList.contains("isNavOpen")) return;
    if (isModalOpen()) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      toggle.focus();
      return;
    }

    if (e.key !== "Tab") return;
    const focusables = getHeaderFocusTrapOrder().filter(
      (el) => el instanceof HTMLElement && !el.hasAttribute("disabled") && el.offsetParent !== null
    );
    if (focusables.length < 2) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });
})();
