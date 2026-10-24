(() => {
  "use strict";

  const canvas = document.getElementById("love-heart");
  const context = canvas?.getContext("2d", { alpha: false });
  if (!canvas || !context) return;

  const SIZE = 800;
  const HEART_SCALE = 21;
  const HEART_Y_OFFSET = 20;
  const BACKGROUND = "#060208";
  const SIZES = [9, 10, 11, 12];
  const GAP = 7;
  const DRAW_DURATION = 10_000;
  const ENTRANCE_DURATION = 672;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
  const LANGUAGES = [
    "I love you",
    "Seni seviyorum",
    "Te amo",
    "Je t'aime",
    "Ich liebe dich",
    "Ti amo",
    "Eu te amo",
    "Я тебя люблю",
    "사랑해",
    "愛してる",
    "我爱你",
    "मैं तुमसे प्यार करता हूँ",
    "Σ' αγαπώ",
    "Ik hou van jou",
    "Jag älskar dig",
    "Kocham cię",
    "ฉันรักเธอ",
    "Anh yêu em",
    "Aku cinta kamu",
    "Я тебе кохаю",
  ];

  const rng = createRandom(11);
  const polygon = Array.from({ length: 720 }, (_, index) => {
    const angle = (2 * Math.PI * index) / 720;
    const x = 16 * Math.sin(angle) ** 3;
    const y =
      13 * Math.cos(angle) -
      5 * Math.cos(2 * angle) -
      2 * Math.cos(3 * angle) -
      Math.cos(4 * angle);
    return [x * HEART_SCALE, y * HEART_SCALE + HEART_Y_OFFSET];
  });
  const edges = polygon.map((point, index) => [point, polygon[(index + 1) % polygon.length]]);
  const Y_MAX = Math.max(...polygon.map((point) => point[1]));
  const Y_MIN = Math.min(...polygon.map((point) => point[1]));
  const CENTER_Y = (Y_MAX + Y_MIN) / 2;
  const ink = hexToRgb(BACKGROUND);

  let composition = [];
  let cssSize = 0;
  let animationStart = 0;
  let lastShimmerAt = 0;
  let frameId = 0;

  function createRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const other = Math.floor(rng() * (index + 1));
      [copy[index], copy[other]] = [copy[other], copy[index]];
    }
    return copy;
  }

  function hexToRgb(hex) {
    return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  }

  function toHex(color) {
    return `#${color
      .map((component) => Math.round(clamp(component) * 255).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  function mix(from, to, amount) {
    return from.map((value, index) => value + (to[index] - value) * amount);
  }

  function dim(color, amount) {
    return color.map((value) => value * amount);
  }

  function fontFor(size) {
    return `700 ${size}px Arial, Helvetica, sans-serif`;
  }

  function measure(text, size) {
    context.font = fontFor(size);
    return context.measureText(text).width;
  }

  function horizontalSpans(y) {
    const intersections = [];
    for (const [[x1, y1], [x2, y2]] of edges) {
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    intersections.sort((a, b) => a - b);
    const spans = [];
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      spans.push([intersections[index], intersections[index + 1]]);
    }
    return spans;
  }

  function overlapSpans(first, second) {
    const overlaps = [];
    for (const [firstStart, firstEnd] of first) {
      for (const [secondStart, secondEnd] of second) {
        const start = Math.max(firstStart, secondStart);
        const end = Math.min(firstEnd, secondEnd);
        if (end - start > 14) overlaps.push([start, end]);
      }
    }
    return overlaps;
  }

  function chooseSizeThatFits(phrase, available) {
    for (const size of shuffle(SIZES)) {
      const width = measure(phrase, size);
      if (width <= available) return { size, width };
    }
    return null;
  }

  function generateComposition() {
    const largestMetrics = (() => {
      context.font = fontFor(Math.max(...SIZES));
      return context.measureText("Mg");
    })();
    const lineHeight =
      (largestMetrics.actualBoundingBoxAscent || 9) +
      (largestMetrics.actualBoundingBoxDescent || 3) +
      4;
    const halfLine = lineHeight / 2;
    const unseen = new Set(LANGUAGES);
    const repeatingPhrases = shuffledPhraseCycle();
    const placed = [];

    let y = Y_MAX - halfLine;
    while (y > Y_MIN + halfLine) {
      const intervals = overlapSpans(
        horizontalSpans(y + halfLine),
        horizontalSpans(y - halfLine),
      );

      for (const [rawLeft, rawRight] of intervals) {
        const left = rawLeft + 4;
        const right = rawRight - 4;
        if (right - left < 24) continue;

        let cursor = left + rng() * 8;
        const row = [];

        while (cursor < right - 10) {
          const remaining = right - cursor;
          let selected = null;

          if (unseen.size > 0) {
            for (const phrase of shuffle([...unseen])) {
              const fit = chooseSizeThatFits(phrase, remaining);
              if (fit) {
                selected = { phrase, ...fit };
                unseen.delete(phrase);
                break;
              }
            }
          } else {
            for (let attempt = 0; attempt < LANGUAGES.length * 2; attempt += 1) {
              const phrase = repeatingPhrases.next().value;
              const size = SIZES[Math.floor(rng() * SIZES.length)];
              const width = measure(phrase, size);
              if (width <= remaining) {
                selected = { phrase, size, width };
                break;
              }
            }
          }

          if (!selected) break;
          row.push({
            x: cursor + selected.width / 2,
            y,
            phrase: selected.phrase,
            size: selected.size,
            width: selected.width,
            edge: false,
          });
          cursor += selected.width + GAP;
        }

        if (row.length === 0) continue;
        if (row.length > 1) {
          const remainingSpace = right - (row[row.length - 1].x + row[row.length - 1].width / 2);
          row.forEach((item, index) => {
            item.x += (remainingSpace * index) / (row.length - 1);
          });
        } else {
          row[0].x = (left + right) / 2;
        }
        row[0].edge = true;
        row[row.length - 1].edge = true;
        placed.push(...row);
      }
      y -= lineHeight;
    }

    const wine = [0.58, 0, 0.09];
    const crimson = [0.9, 0.05, 0.14];
    const blood = [0.98, 0.1, 0.16];

    for (const item of placed) {
      const radius = Math.min(
        1,
        Math.hypot(item.x / (16 * HEART_SCALE), (item.y - CENTER_Y) / (14.5 * HEART_SCALE)),
      );
      let color = mix(wine, crimson, 0.25 + 0.75 * radius);
      color = mix(color, blood, rng() * 0.35 + (item.edge ? 0.3 : 0));
      item.color = color.map((component) => Math.min(1, component));
      item.offsetX = rng() * 20 - 10;
      item.screenX = SIZE / 2 + item.x;
      item.screenY = SIZE / 2 - item.y;
    }

    const outline = placed.filter((item) => item.edge).sort(
      (a, b) => Math.atan2(a.x, a.y - CENTER_Y) - Math.atan2(b.x, b.y - CENTER_Y),
    );
    const interior = placed.filter((item) => !item.edge).sort((a, b) => b.y - a.y);
    return [...outline, ...interior];
  }

  function* shuffledPhraseCycle() {
    while (true) yield* shuffle(LANGUAGES);
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const nextCssSize = Math.max(1, bounds.width);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelSize = Math.round(nextCssSize * ratio);
    cssSize = nextCssSize;
    if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
      canvas.width = pixelSize;
      canvas.height = pixelSize;
    }
  }

  function drawPhrase(item, now, index) {
    const entrance = REDUCED_MOTION.matches
      ? 1
      : clamp((now - item.appearsAt) / ENTRANCE_DURATION);
    if (entrance <= 0) return;

    const eased = 1 - (1 - entrance) ** 3;
    const x = item.screenX + item.offsetX * (1 - eased);
    const y = item.screenY - 34 * (1 - eased);
    const elapsed = now - animationStart;
    const allVisibleAt = animationStart + DRAW_DURATION + ENTRANCE_DURATION;
    const shimmerAge = now - (item.shimmerStartedAt ?? Number.NEGATIVE_INFINITY);
    const shimmer = !REDUCED_MOTION.matches && now >= allVisibleAt
      ? 0.6 * (1 - clamp(shimmerAge / 260))
      : 0;
    const flash = 0.75 * Math.sin(Math.PI * clamp((entrance - 0.55) / 0.45));
    const baseColor = mix(ink, item.color, eased ** 1.5);
    const foreground = mix(baseColor, [1, 0.78, 0.78], Math.max(flash, shimmer));

    context.save();
    context.font = fontFor(item.size);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.globalAlpha = clamp(eased * 1.15);

    context.shadowColor = toHex(dim(item.color, 0.32));
    context.shadowBlur = 5 + 8 * eased + 9 * shimmer;
    context.fillStyle = BACKGROUND;
    context.fillText(item.phrase, x + 2, y + 3);

    context.shadowColor = toHex(dim(item.color, 0.2));
    context.shadowBlur = 4 + 10 * eased;
    context.fillStyle = toHex(mix(ink, dim(item.color, 0.2), eased * eased));
    context.fillText(item.phrase, x, y);

    context.shadowColor = toHex(mix(item.color, [1, 0.72, 0.76], shimmer));
    context.shadowBlur = 2 + 10 * eased + 12 * shimmer;
    context.fillStyle = toHex(foreground);
    context.fillText(item.phrase, x, y);
    context.restore();

    // Keep the elapsed-time read explicit so the entrance schedule remains tied to one start.
    void elapsed;
  }

  function render(now) {
    if (cssSize === 0) resizeCanvas();
    const scale = canvas.width / SIZE;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, SIZE, SIZE);

    if (composition.length > 0) {
      const interval = DRAW_DURATION / composition.length;
      composition.forEach((item, index) => {
        item.appearsAt = animationStart + index * interval;
        drawPhrase(item, now, index);
      });

      const lastEntranceEnds = animationStart + DRAW_DURATION + ENTRANCE_DURATION;
      if (!REDUCED_MOTION.matches && now >= lastEntranceEnds && now - lastShimmerAt >= 140) {
        const target = composition[Math.floor(rng() * composition.length)];
        target.shimmerStartedAt = now;
        lastShimmerAt = now;
      }
    }

    frameId = REDUCED_MOTION.matches ? 0 : window.requestAnimationFrame(render);
  }

  function start() {
    resizeCanvas();
    composition = generateComposition();
    animationStart = performance.now();
    if (composition.length === 0) {
      context.fillStyle = BACKGROUND;
      context.fillRect(0, 0, SIZE, SIZE);
      return;
    }
    frameId = window.requestAnimationFrame(render);
  }

  const observer = new ResizeObserver(resizeCanvas);
  observer.observe(canvas);
  window.addEventListener("resize", resizeCanvas, { passive: true });
  REDUCED_MOTION.addEventListener?.("change", () => {
    if (frameId) window.cancelAnimationFrame(frameId);
    if (composition.length) frameId = window.requestAnimationFrame(render);
  });
  start();
})();
