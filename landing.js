(() => {
  const reminderInterval = 90_000;
  const trigger = document.querySelector(".news-trigger");
  const announcement = document.querySelector("#newsletter");
  const close = announcement.querySelector(".dismiss");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const movingParts = [document.querySelector(".identity"), document.querySelector(".newsletter-band")];
  const layoutMotions = new Map();
  let cardMotion = null;
  let remaining = reminderInterval;
  let startedAt = 0;
  let timer = null;

  const root = document.documentElement;
  function syncEntrance() {
    root.classList.toggle("entry-paused", document.hidden || document.readyState !== "complete");
  }

  // The collective intro starts once the loaded page is visible.
  syncEntrance();
  root.classList.add("entry-active");
  window.addEventListener("load", syncEntrance, { once: true });

  function pauseReminder() {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
  }

  function startReminder() {
    if (document.hidden || trigger.getAttribute("aria-expanded") === "true" || timer !== null) return;
    startedAt = performance.now();
    timer = setTimeout(() => {
      timer = null;
      remaining = 0;
      if (!document.hidden) openAnnouncement();
    }, remaining);
  }

  function changeLayout(open) {
    const before = movingParts.map(part => part.getBoundingClientRect());
    for (const motion of layoutMotions.values()) motion.cancel();
    layoutMotions.clear();
    announcement.hidden = !open;
    if (reducedMotion.matches) return;

    // Start at the last painted position, including a partially completed move.
    movingParts.forEach((part, i) => {
      const from = before[i];
      const to = part.getBoundingClientRect();
      if (!from.width || !to.width || !to.height) return;
      if (from.x === to.x && from.y === to.y && from.width === to.width && from.height === to.height) return;
      const offset = `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.width / to.width}, ${from.height / to.height})`;
      const motion = part.animate([
        { transform: offset, transformOrigin: "0 0" },
        { transform: "none", transformOrigin: "0 0" }
      ], { duration: 580, easing: "cubic-bezier(.33, 0, .17, 1)" });
      layoutMotions.set(part, motion);
      motion.onfinish = () => { if (layoutMotions.get(part) === motion) layoutMotions.delete(part); };
    });
  }

  function fadeCard(open, entering = false) {
    const style = getComputedStyle(announcement);
    const from = entering ? { opacity: 0, translate: "0 6px" }
                          : { opacity: Number(style.opacity), translate: style.translate };
    cardMotion?.cancel();
    cardMotion = null;
    if (reducedMotion.matches || (!open && from.opacity === 0)) {
      if (!open) changeLayout(false);
      return;
    }
    const motion = announcement.animate([from, { opacity: open ? 1 : 0, translate: open ? "0 0" : "0 4px" }], {
      duration: open ? 330 : 210,
      delay: entering ? 260 : 0,
      easing: "ease-in-out",
      fill: "both"
    });
    cardMotion = motion;
    motion.onfinish = () => {
      if (cardMotion !== motion) return;
      if (!open) changeLayout(false);
      motion.cancel();
      cardMotion = null;
    };
  }

  function openAnnouncement(moveFocus = false) {
    pauseReminder();
    const entering = announcement.hidden;
    if (entering) changeLayout(true);
    announcement.inert = false;
    trigger.setAttribute("aria-expanded", "true");
    fadeCard(true, entering);
    if (moveFocus) close.focus({ preventScroll: true });
  }

  function dismissAnnouncement(returnFocus = announcement.contains(document.activeElement)) {
    trigger.setAttribute("aria-expanded", "false");
    if (returnFocus) trigger.focus({ preventScroll: true });
    announcement.inert = true;
    fadeCard(false);
    remaining = reminderInterval;
    startReminder();
  }

  trigger.hidden = false;
  trigger.addEventListener("click", () => {
    if (trigger.getAttribute("aria-expanded") === "false") openAnnouncement(true);
    else dismissAnnouncement();
  });
  close.addEventListener("click", () => dismissAnnouncement(true));
  announcement.querySelector(".acknowledge").addEventListener("click", () => dismissAnnouncement(true));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !announcement.hidden && !announcement.inert) dismissAnnouncement();
  });
  document.addEventListener("click", event => {
    if (!announcement.hidden && !announcement.inert && !announcement.contains(event.target) && !trigger.contains(event.target)) {
      dismissAnnouncement();
    }
  });

  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) return;
    for (const motion of layoutMotions.values()) motion.finish();
    cardMotion?.finish();
  });

  document.addEventListener("visibilitychange", () => {
    syncEntrance();
    if (document.hidden) pauseReminder();
    else startReminder();
  });
  window.addEventListener("pagehide", pauseReminder);
  window.addEventListener("pageshow", event => {
    if (event.persisted) {
      root.classList.remove("entry-active");
      // Commit the idle styles before replaying on a back/forward cache restore.
      root.getBoundingClientRect();
      root.classList.add("entry-active");
    }
    syncEntrance();
    startReminder();
  });
  startReminder();
})();
