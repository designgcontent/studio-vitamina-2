(() => {
  // Background and wordmark, in the page order of COLORES WEB OK (sRGB).
  const palette = [
    ["#b3d7ff", "#88fa4e"], ["#88fa4e", "#f0afdf"], ["#f9dde9", "#8cb7f3"],
    ["#16e7cf", "#ffd1dc"], ["#fff67c", "#a7c9f6"], ["#006c65", "#c9b5e0"],
    ["#ff95ca", "#8df1c7"], ["#95b5f2", "#b4efc5"], ["#d8ebd0", "#ffd1dc"],
    ["#ffd7b5", "#c9b5e0"], ["#38b3a9", "#eea5a9"], ["#b7a6fc", "#65d6d7"],
    ["#ff42a1", "#8df3c7"], ["#c3fcc3", "#cab4e0"], ["#eec4e4", "#8cb7f3"],
    ["#73fdea", "#c9b5e0"], ["#b7a6fc", "#8df1c7"], ["#f4ff7d", "#89e69c"],
    ["#d41876", "#ffd1dc"], ["#8facca", "#fffae4"], ["#e2ff59", "#ffd7b6"],
    ["#ffede6", "#f0afdf"], ["#bde1d7", "#fe96ac"], ["#970e53", "#20c48e"]
  ].map(pair => pair.map(hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16))));

  const stage = document.querySelector(".stage");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const rapid = document.documentElement.dataset.motion === "cuts";
  const stepMs = 12000;
  const videoFrames = 146;

  function luminance(rgb) {
    const [r, g, b] = rgb.map(channel => {
      const v = channel / 255;
      return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
  }

  function frame([paper, ink], offset) {
    const a = luminance(paper), b = luminance(ink);
    const contrast = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    return {
      offset,
      "--stage-color": `rgb(${paper.join(" ")})`,
      "--wordmark-color": `rgb(${ink.join(" ")})`,
      "--outline-opacity": .27 * Math.min(1, Math.max(0, (3 - contrast) / 1.4))
    };
  }

  function smoothCycle() {
    const frames = [];
    palette.forEach((pair, index) => {
      const next = palette[(index + 1) % palette.length];
      frames.push(frame(pair, index / palette.length));
      // Sample the blend so the hairline also follows contrast between swatches.
      for (let sample = 0; sample < 12; sample++) {
        const t = sample / 12;
        const blend = t * t * (3 - 2 * t);
        const colours = pair.map((rgb, side) => rgb.map((v, c) =>
          Math.round(v + (next[side][c] - v) * blend)));
        frames.push(frame(colours, (index + .76 + .24 * t) / palette.length));
      }
    });
    return [...frames, frame(palette[0], 1)];
  }

  function cutCycle() {
    // The 30 fps reference cuts at frames 7, 13, 19 ... 139 and loops at 146.
    const frames = palette.map((pair, i) => ({
      ...frame(pair, i === 0 ? 0 : (6 * i + 1) / videoFrames),
      easing: "steps(1, end)"
    }));
    return [...frames, frame(palette[0], 1)];
  }

  let cycle;
  function syncMotion() {
    cycle?.cancel();
    stage.classList.toggle("wash-running", !rapid && !reducedMotion.matches);
    if (reducedMotion.matches) return;
    cycle = stage.animate(rapid ? cutCycle() : smoothCycle(), {
      duration: rapid ? videoFrames * 1000 / 30 : stepMs * palette.length,
      iterations: Infinity
    });
  }

  const intro = document.querySelector(".brand-intro");
  Promise.allSettled(intro.getAnimations().map(animation => animation.finished)).then(() => {
    syncMotion();
    reducedMotion.addEventListener("change", syncMotion);
  });
})();
