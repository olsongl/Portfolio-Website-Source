(function () {
  // -----------------------------
  // Navbar
  // -----------------------------
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // -----------------------------
  // Resume modal
  // -----------------------------
  const resumeModal = document.getElementById("resumeModal");
  if (resumeModal) {
    const pdfFrame = resumeModal.querySelector(".modal__pdf");
    const pdfUrl = "assets/GavinLOlson_Resume_2026.pdf";
    let lastFocus = null;

    function openResume(triggerEl) {
      lastFocus = triggerEl || document.activeElement;
      // Always point the iframe at the PDF — assigning "" on close resolves to the
      // page URL, so a guarded set would skip on subsequent opens.
      if (pdfFrame) pdfFrame.src = pdfUrl;
      resumeModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      const closeBtn = resumeModal.querySelector(".modal__close");
      if (closeBtn) closeBtn.focus();
    }

    function closeResume() {
      resumeModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      if (pdfFrame) pdfFrame.src = "about:blank";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    document.querySelectorAll('[data-open="resume"]').forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        // Honor Cmd/Ctrl/middle-click to keep "open in new tab" working
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        openResume(trigger);
      });
    });

    resumeModal.querySelectorAll("[data-modal-close]").forEach((el) => {
      el.addEventListener("click", closeResume);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && resumeModal.getAttribute("aria-hidden") === "false") {
        closeResume();
      }
    });
  }

  // -----------------------------
  // Project carousel
  // -----------------------------
  const carousel = document.querySelector(".carousel");
  if (!carousel) return;

  // Clone all cards once for seamless looping
  Array.from(carousel.querySelectorAll(".card")).forEach((card) =>
    carousel.appendChild(card.cloneNode(true))
  );

  let scrollPos = 0;
  let paused = false;
  let resumeTimer = null;
  const speed = 0.5;

  // Drag state (declared up top so the mouseleave handler can read it safely)
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartScroll = 0;
  let activePointerId = null;
  let horizontalDrag = false;
  const DRAG_THRESHOLD = 6;

  // Momentum / coast state
  let velocity = 0;            // px per frame (16.67ms), positive = finger moving right
  let lastMoveX = 0;
  let lastMoveTime = 0;
  let coasting = false;
  const FRICTION = 0.94;       // per-frame decay (~50% retained after ~11 frames)
  const COAST_STOP = 0.3;      // px/frame below which we stop coasting
  const FLICK_THRESHOLD = 1.2; // px/frame minimum to trigger a coast

  function getCardWidth() {
    const card = carousel.querySelector(".card");
    return card ? card.offsetWidth + 18 : 300;
  }
  function getLoopAt() {
    return carousel.scrollWidth / 2;
  }
  function nudge(delta) {
    paused = true;
    clearTimeout(resumeTimer);
    const loop = getLoopAt();
    scrollPos = ((scrollPos + delta) % loop + loop) % loop;
    carousel.scrollLeft = scrollPos;
    resumeTimer = setTimeout(() => (paused = false), 2000);
  }

  // Hover pause
  carousel.addEventListener("mouseenter", () => {
    paused = true;
    clearTimeout(resumeTimer);
  });
  carousel.addEventListener("mouseleave", () => {
    if (!dragging) paused = false;
  });

  // Wheel: only intercept horizontal-dominant scrolls (trackpad two-finger left/right
  // or shift+wheel). Vertical scrolls fall through to the page.
  carousel.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        nudge(e.deltaX * 0.8);
      }
    },
    { passive: false }
  );

  // Drag-to-swipe (mouse + touch + pen, unified via Pointer Events)
  carousel.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Stop any in-progress coast — user is grabbing again
    coasting = false;
    dragging = true;
    dragMoved = false;
    horizontalDrag = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartScroll = scrollPos;
    activePointerId = e.pointerId;
    velocity = 0;
    lastMoveX = e.clientX;
    lastMoveTime = performance.now();
    paused = true;
    clearTimeout(resumeTimer);
  });

  carousel.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== activePointerId) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (!dragMoved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      // Vertical-dominant touch gestures should let the page scroll.
      if (Math.abs(dy) > Math.abs(dx) && e.pointerType !== "mouse") {
        dragging = false;
        activePointerId = null;
        resumeTimer = setTimeout(() => (paused = false), 1200);
        return;
      }
      dragMoved = true;
      horizontalDrag = true;
      carousel.classList.add("is-dragging");
      try { carousel.setPointerCapture(activePointerId); } catch (_) {}
    }

    if (horizontalDrag) {
      e.preventDefault();
      const loop = getLoopAt();
      scrollPos = (((dragStartScroll - dx) % loop) + loop) % loop;
      carousel.scrollLeft = scrollPos;

      // Sample velocity (smoothed) — px/frame, positive = finger moving right
      const now = performance.now();
      const dtMs = now - lastMoveTime;
      if (dtMs > 0) {
        const instVel = ((e.clientX - lastMoveX) / dtMs) * 16.6667;
        velocity = velocity * 0.4 + instVel * 0.6;
      }
      lastMoveX = e.clientX;
      lastMoveTime = now;
    }
  });

  function endDrag(e) {
    if (!dragging) return;
    if (e && activePointerId !== null && e.pointerId !== activePointerId) return;
    const wasMoved = dragMoved;
    const wasHorizontal = horizontalDrag;
    const releaseVelocity = velocity;
    dragging = false;
    dragMoved = false;
    horizontalDrag = false;
    try {
      if (activePointerId !== null) carousel.releasePointerCapture(activePointerId);
    } catch (_) {}
    activePointerId = null;
    carousel.classList.remove("is-dragging");

    // If the user flicked, coast with momentum; otherwise resume auto-scroll after a beat.
    if (wasMoved && wasHorizontal && Math.abs(releaseVelocity) >= FLICK_THRESHOLD) {
      startCoast(releaseVelocity);
    } else {
      resumeTimer = setTimeout(() => (paused = false), 1500);
    }

    // Swallow the click that follows a real drag so links inside cards don't fire.
    if (wasMoved) {
      const swallow = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        carousel.removeEventListener("click", swallow, true);
      };
      carousel.addEventListener("click", swallow, true);
      setTimeout(() => carousel.removeEventListener("click", swallow, true), 300);
    }
  }

  function startCoast(initialVelocity) {
    coasting = true;
    paused = true;
    clearTimeout(resumeTimer);
    let v = initialVelocity;
    function step() {
      if (!coasting) return; // a new pointerdown cancelled us
      const loop = getLoopAt();
      // Drag-right (positive v) should keep moving content right, which means scrollPos decreases.
      scrollPos = (((scrollPos - v) % loop) + loop) % loop;
      carousel.scrollLeft = scrollPos;
      v *= FRICTION;
      if (Math.abs(v) < COAST_STOP) {
        coasting = false;
        resumeTimer = setTimeout(() => (paused = false), 800);
        return;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  carousel.addEventListener("pointerup", endDrag);
  carousel.addEventListener("pointercancel", endDrag);
  carousel.addEventListener("dragstart", (e) => e.preventDefault());

  // Prev / Next buttons
  const prevBtn = document.getElementById("carouselPrev");
  const nextBtn = document.getElementById("carouselNext");
  if (prevBtn) prevBtn.addEventListener("click", () => nudge(-getCardWidth()));
  if (nextBtn) nextBtn.addEventListener("click", () => nudge(getCardWidth()));

  // Arrow keys
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") nudge(-getCardWidth());
    if (e.key === "ArrowRight") nudge(getCardWidth());
  });

  // Auto-scroll
  function tick() {
    if (!paused) {
      scrollPos += speed;
      if (scrollPos >= getLoopAt()) scrollPos -= getLoopAt();
      carousel.scrollLeft = scrollPos;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
