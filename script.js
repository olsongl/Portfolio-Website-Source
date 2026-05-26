(function () {
  // -----------------------------
  // Navbar + misc
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
  // Animated orb display (canvas)
  // -----------------------------
  const canvas = document.getElementById("orbCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); // cap for performance
  let width = 0;
  let height = 0;

  const palette = [
    "rgba(124, 92, 255, 0.85)", // purple
    "rgba(0, 255, 209, 0.65)",  // teal
    "rgba(255, 108, 180, 0.55)",// pink
    "rgba(255, 214, 102, 0.45)",// warm
    "rgba(120, 210, 255, 0.45)" // blue
  ];

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  const orbs = [];
  let orbCount = 0;

  function makeOrb() {
    const r = rand(10, 46);
    const x = rand(r, width - r);
    const y = rand(r, height - r);

    // gentle speeds that still look alive
    const vx = rand(-0.55, 0.55);
    const vy = rand(-0.35, 0.35);

    return {
      x,
      y,
      vx,
      vy,
      r,
      color: palette[Math.floor(rand(0, palette.length))],
      // slight "breathing" effect
      wobble: rand(0, Math.PI * 2),
      wobbleSpeed: rand(0.004, 0.012),
      wobbleAmp: rand(0.6, 1.6)
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width * dpr));
    height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.width = width;
    canvas.height = height;

    // number of orbs scales with area, but clamp it
    const area = (rect.width * rect.height);
    orbCount = clamp(Math.floor(area / 22000), 10, 26);

    // rebuild orbs so it always looks balanced
    orbs.length = 0;
    for (let i = 0; i < orbCount; i++) orbs.push(makeOrb());
  }

  function drawBackground() {
    // transparent canvas
    ctx.clearRect(0, 0, width, height);

    // gentle vignette
    const g = ctx.createRadialGradient(
      width * 0.5, height * 0.35, Math.min(width, height) * 0.1,
      width * 0.5, height * 0.35, Math.min(width, height) * 0.9
    );
    g.addColorStop(0, "rgba(0,0,0,0.00)");
    g.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  function drawOrb(o) {
    // soft glow + fill
    ctx.save();
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.closePath();

    ctx.shadowBlur = 26 * dpr;
    ctx.shadowColor = o.color;
    ctx.fillStyle = o.color;
    ctx.fill();

    // subtle inner highlight
    const hl = ctx.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.35, 0, o.x, o.y, o.r);
    hl.addColorStop(0, "rgba(255,255,255,0.20)");
    hl.addColorStop(1, "rgba(255,255,255,0.00)");
    ctx.fillStyle = hl;
    ctx.fill();

    ctx.restore();
  }

  function step() {
    drawBackground();

    for (const o of orbs) {
      // wobble radius a tiny bit
      o.wobble += o.wobbleSpeed;
      const wobbleR = o.r + Math.sin(o.wobble) * o.wobbleAmp;

      // move
      o.x += o.vx * dpr;
      o.y += o.vy * dpr;

      // bounce with soft edges
      if (o.x < wobbleR) {
        o.x = wobbleR;
        o.vx *= -1;
      } else if (o.x > width - wobbleR) {
        o.x = width - wobbleR;
        o.vx *= -1;
      }

      if (o.y < wobbleR) {
        o.y = wobbleR;
        o.vy *= -1;
      } else if (o.y > height - wobbleR) {
        o.y = height - wobbleR;
        o.vy *= -1;
      }

      // draw
      drawOrb({ ...o, r: wobbleR });
    }

    requestAnimationFrame(step);
  }

  // -----------------------------
  // Carousel auto-scroll
  // -----------------------------
  const carousel = document.querySelector(".carousel");
  if (carousel) {
    // Clone all cards for seamless looping
    Array.from(carousel.querySelectorAll(".card")).forEach((card) =>
      carousel.appendChild(card.cloneNode(true))
    );

    let scrollPos = 0;
    let paused = false;
    let resumeTimer = null;
    const speed = 0.5;

    function getCardWidth() {
      const card = carousel.querySelector(".card");
      return card ? card.offsetWidth + 20 : 300;
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

    // Pause/resume on hover
    carousel.addEventListener("mouseenter", () => { paused = true; clearTimeout(resumeTimer); });
    carousel.addEventListener("mouseleave", () => { paused = false; });

    // Wheel → horizontal scroll
    carousel.addEventListener("wheel", (e) => {
      e.preventDefault();
      nudge(e.deltaY * 0.8);
    }, { passive: false });

    // Touch
    carousel.addEventListener("touchstart", () => { paused = true; clearTimeout(resumeTimer); }, { passive: true });
    carousel.addEventListener("touchend", () => {
      resumeTimer = setTimeout(() => (paused = false), 1500);
    }, { passive: true });

    // Prev / Next buttons
    const prevBtn = document.getElementById("carouselPrev");
    const nextBtn = document.getElementById("carouselNext");
    if (prevBtn) prevBtn.addEventListener("click", () => nudge(-getCardWidth()));
    if (nextBtn) nextBtn.addEventListener("click", () => nudge(getCardWidth()));

    // Arrow key navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") nudge(-getCardWidth());
      if (e.key === "ArrowRight") nudge(getCardWidth());
    });

    function tickCarousel() {
      if (!paused) {
        scrollPos += speed;
        if (scrollPos >= getLoopAt()) scrollPos -= getLoopAt();
        carousel.scrollLeft = scrollPos;
      }
      requestAnimationFrame(tickCarousel);
    }
    requestAnimationFrame(tickCarousel);
  }

  // init
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  // fallback (some browsers won’t fire immediately)
  resize();
  requestAnimationFrame(step);
})();
