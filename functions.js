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

  const sectionIds = ["home", "about", "works"];
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

  // Works spotlight: homepage #works grid only (not portfolio page)
  const grid = document.querySelector("#works .worksGrid");
  if (!grid) return;

  let activeCard = null;

  function setSpot(x, y) {
    document.body.style.setProperty("--spot-x", `${Math.round(x)}px`);
    document.body.style.setProperty("--spot-y", `${Math.round(y)}px`);
  }

  function activate(card, x, y) {
    if (!(card instanceof HTMLElement)) return;

    if (activeCard && activeCard !== card) activeCard.classList.remove("isSpotlit");
    activeCard = card;
    activeCard.classList.add("isSpotlit");

    document.body.classList.add("spotlightOn");

    if (typeof x === "number" && typeof y === "number") {
      setSpot(x, y);
      return;
    }

    const r = card.getBoundingClientRect();
    setSpot(r.left + r.width / 2, r.top + r.height / 2);
  }

  function deactivate() {
    document.body.classList.remove("spotlightOn");
    if (activeCard) activeCard.classList.remove("isSpotlit");
    activeCard = null;
  }

  const isCoarsePointer =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  if (isCoarsePointer) {
    grid.addEventListener("pointerdown", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const card = target ? target.closest(".workCard") : null;
      if (!(card instanceof HTMLElement)) return;

      if (activeCard === card && document.body.classList.contains("spotlightOn")) {
        deactivate();
        return;
      }

      activate(card);
    });

    document.addEventListener("pointerdown", (e) => {
      if (!document.body.classList.contains("spotlightOn")) return;
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      if (target.closest("#works .worksGrid")) return;
      deactivate();
    });

    window.addEventListener(
      "scroll",
      () => {
        if (document.body.classList.contains("spotlightOn")) deactivate();
      },
      { passive: true }
    );
  }

  grid.addEventListener("mousemove", (e) => {
    const card = e.target instanceof Element ? e.target.closest(".workCard") : null;
    if (!card) return;
    activate(card, e.clientX, e.clientY);
  });

  grid.addEventListener("mouseleave", () => {
    deactivate();
  });

  grid.addEventListener("focusin", (e) => {
    const card = e.target instanceof Element ? e.target.closest(".workCard") : null;
    if (!card) return;
    activate(card);
  });

  grid.addEventListener("focusout", (e) => {
    const next = e.relatedTarget instanceof Element ? e.relatedTarget : null;
    if (next && grid.contains(next) && next.closest(".workCard")) return;
    deactivate();
  });
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

/* runtime Only JS for work detail modal */

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

  function stripThumbClasses(el) {
    for (const c of THUMB_CLASSES) el.classList.remove(c);
  }

  function openWorkModal(card) {
    if (!(card instanceof HTMLElement)) return;

    const title = card.getAttribute("data-work-title") || "";
    const meta = card.getAttribute("data-work-meta") || "";
    const desc = card.getAttribute("data-work-desc") || "";
    const thumb = card.getAttribute("data-work-thumb") || "thumbA";

    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    heroEl.className = "workDetailHero workThumb";
    stripThumbClasses(heroEl);
    if (THUMB_CLASSES.includes(thumb)) heroEl.classList.add(thumb);

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
    if (lastFocused) lastFocused.focus();
    lastFocused = null;
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
