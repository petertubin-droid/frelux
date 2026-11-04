/**
 * Colour mixing, description and FAQ text for the colour library.
 *
 * Everything here is computed from a colour's own stored HEX value. Nothing is
 * looked up in a manufacturer's formulation book, because no paint company
 * publishes those, so the outputs are labelled as a tint build the reader can
 * reproduce on a tinting machine rather than a factory recipe.
 *
 * The arithmetic:
 *  - pigments are mixed in linear light (the least wrong simple model for a
 *    tinting system building a colour from a white base and concentrated
 *    tinters),
 *  - the build is chosen by hill climbing on the mixing simplex until the
 *    mixed colour stops getting closer to the target in CIELAB,
 *  - the residual distance is reported, so a shade that can only be
 *    approximated says so instead of claiming an exact match.
 *
 * The same module feeds the React colour page and the prerenderer, so the
 * static HTML and the live page cannot disagree.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const normalizeHex = (value) => {
  const raw = String(value ?? "")
    .trim()
    .replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
};

export const hexToRgb = (hex) => {
  const clean = normalizeHex(hex);
  if (!clean) return null;
  return [1, 3, 5].map((i) => parseInt(clean.slice(i, i + 2), 16));
};

export const rgbToHex = (rgb) =>
  "#" +
  rgb
    .map((v) =>
      clamp(Math.round(v), 0, 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();

const srgbToLinear = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const linearToSrgb = (value) => {
  const c = clamp(value, 0, 1);
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(v * 255);
};

/** Linear light values, the space the mixing actually happens in. */
const toLinear = (rgb) => rgb.map(srgbToLinear);

export const rgbToLab = (rgb) => {
  const [r, g, b] = toLinear(rgb);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};

export const labDistance = (a, b) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

export const relativeLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = toLinear(rgb);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * A standard tinting set. These are pigment classes, not retail products: the
 * names describe what a tinting machine actually adds to a base.
 */
export const PIGMENTS = [
  { key: "white", name: "Titanium white base", hex: "#FFFFFF", family: "white" },
  { key: "black", name: "Carbon black", hex: "#111111", family: "black" },
  { key: "red", name: "Red oxide", hex: "#9E3B26", family: "red" },
  { key: "scarlet", name: "Naphthol red", hex: "#C0202E", family: "red" },
  { key: "magenta", name: "Quinacridone magenta", hex: "#A01B63", family: "red" },
  { key: "pink", name: "Rubine red", hex: "#E3218A", family: "red" },
  { key: "orange", name: "Molybdate orange", hex: "#E2611B", family: "orange" },
  { key: "tangerine", name: "Benzidine orange", hex: "#F5821F", family: "orange" },
  { key: "yellow", name: "Hansa yellow", hex: "#F2C11B", family: "yellow" },
  { key: "ochre", name: "Yellow ochre", hex: "#C2952F", family: "yellow" },
  { key: "green", name: "Phthalo green", hex: "#0E4B3A", family: "green" },
  { key: "leaf", name: "Leaf green", hex: "#3E7D3E", family: "green" },
  { key: "blue", name: "Phthalo blue", hex: "#123B72", family: "blue" },
  { key: "ultramarine", name: "Ultramarine", hex: "#2A3F8F", family: "blue" },
  { key: "cobalt", name: "Cobalt blue", hex: "#2B4FD8", family: "blue" },
  { key: "violet", name: "Dioxazine violet", hex: "#5A2A80", family: "violet" },
  { key: "umber", name: "Burnt umber", hex: "#4A2E22", family: "brown" },
  { key: "sienna", name: "Raw sienna", hex: "#B0793C", family: "brown" },
];

const PIGMENT_BY_KEY = new Map(PIGMENTS.map((p) => [p.key, p]));

/**
 * Kubelka-Munk single constant values per pigment. Mixing reflectance
 * directly washes colours out, because a real tinter hides the surface it is
 * added to far faster than its share of the area suggests. Mixing K/S instead
 * behaves the way a tinting machine does: a few millilitres of tinter move a
 * litre of white much further than proportion alone would allow.
 */
const toKs = (linear) => {
  const r = Math.min(0.98, Math.max(0.004, linear));
  return ((1 - r) * (1 - r)) / (2 * r);
};

const fromKs = (k) => 1 + k - Math.sqrt(k * k + 2 * k);

const PIGMENT_KS = new Map(
  PIGMENTS.map((p) => [p.key, toLinear(hexToRgb(p.hex)).map(toKs)]),
);

/** Which tinters a given hue can plausibly be built from. */
const candidatesFor = (hue, saturation, lightness) => {
  const keys = ["white", "black"];
  if (saturation < 8) return [...keys, "umber"];
  if (hue === null) return [...keys, "ochre"];
  if (hue < 25 || hue >= 330) keys.push("pink", "scarlet", "red", "magenta");
  else if (hue < 45) keys.push("tangerine", "orange", "scarlet", "ochre");
  else if (hue < 70) keys.push("ochre", "yellow", "orange");
  else if (hue < 100) keys.push("yellow", "ochre", "leaf");
  else if (hue < 160) keys.push("leaf", "green", "yellow");
  else if (hue < 200) keys.push("blue", "green", "ultramarine");
  else if (hue < 250) keys.push("cobalt", "blue", "ultramarine", "violet");
  else if (hue < 285) keys.push("violet", "ultramarine", "magenta");
  else keys.push("magenta", "violet", "red");
  if (lightness < 45) keys.push("umber");
  return [...new Set(keys)];
};

const hueOf = (rgb) => {
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { hue: 0, saturation: 0, lightness: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;
  return { hue: hue * 360, saturation: s * 100, lightness: l * 100 };
};

const mixedRgb = (weights) => {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (weight <= 0) continue;
    const [pr, pg, pb] = PIGMENT_KS.get(key);
    r += pr * weight;
    g += pg * weight;
    b += pb * weight;
  }
  return [
    linearToSrgb(fromKs(r)),
    linearToSrgb(fromKs(g)),
    linearToSrgb(fromKs(b)),
  ];
};

/**
 * The tint build for a colour, as parts per hundred of the total mix.
 *
 * Returns components sorted heaviest first, each with the millilitres needed
 * in one litre of mixed paint, plus the residual colour distance so the caller
 * can describe how close the build lands.
 */
export function mixRecipe(hex) {
  const target = hexToRgb(hex);
  if (!target) return null;
  const targetLab = rgbToLab(target);

  const { hue, saturation, lightness } = hueOf(target);
  const candidates = candidatesFor(hue, saturation, lightness);

  // Try every small combination of the plausible tinters and settle each one
  // by continuous coordinate descent on the mixing simplex. Looking at whole
  // combinations avoids the dead end a single greedy walk falls into, and
  // keeping the sets small keeps the printed build something a shop can weigh.
  const combinations = [];
  for (let i = 0; i < candidates.length; i += 1) {
    combinations.push([candidates[i]]);
    for (let j = i + 1; j < candidates.length; j += 1) {
      combinations.push([candidates[i], candidates[j]]);
      for (let k = j + 1; k < candidates.length; k += 1) {
        combinations.push([candidates[i], candidates[j], candidates[k]]);
      }
    }
  }

  const distanceOf = (w) => labDistance(rgbToLab(mixedRgb(w)), targetLab);
  let weights = {};
  let bestDistance = Infinity;

  for (const combo of combinations) {
    let trial = {};
    combo.forEach((key, index) => {
      trial[key] = index === 0 ? 1 - (combo.length - 1) * 0.004 : 0.004;
    });
    let trialDistance = distanceOf(trial);

    for (let step = 0.04; step >= 0.0002; step /= 2) {
      let improved = true;
      let guard = 0;
      while (improved && guard < 400) {
        improved = false;
        guard += 1;
        for (const from of Object.keys(trial)) {
          if (trial[from] < step - 1e-9) continue;
          for (const to of Object.keys(trial)) {
            if (to === from) continue;
            const candidate = { ...trial, [from]: trial[from] - step };
            candidate[to] = candidate[to] + step;
            const distance = distanceOf(candidate);
            if (distance < trialDistance - 1e-9) {
              trial = candidate;
              trialDistance = distance;
              improved = true;
            }
          }
        }
      }
    }

    if (trialDistance < bestDistance) {
      bestDistance = trialDistance;
      weights = trial;
    }
  }

  const total = Object.values(weights).reduce((sum, w) => sum + w, 0) || 1;
  const components = Object.entries(weights)
    .filter(([, w]) => w / total >= 0.0004)
    .sort((a, b) => b[1] - a[1])
    .map(([key, w]) => {
      const pigment = PIGMENT_BY_KEY.get(key);
      return {
        key,
        name: pigment.name,
        hex: pigment.hex,
        millilitresPerLitre: Math.round((w / total) * 1000),
      };
    })
    .filter((c) => c.millilitresPerLitre > 0);

  // Rounding to whole millilitres can leave the build a millilitre short of a
  // litre; the base pigment absorbs it so the printed dose always adds up.
  if (components.length > 0) {
    const sum = components.reduce((s, c) => s + c.millilitresPerLitre, 0);
    components[0].millilitresPerLitre += 1000 - sum;
  }

  const residual = labDistance(rgbToLab(mixedRgb(weights)), targetLab);
  return {
    components,
    deltaE: Math.round(residual * 10) / 10,
    closeness:
      residual <= 4 ? "close" : residual <= 7 ? "approximate" : "out of reach",
    /** Whether a white base plus standard tinters can actually land the shade. */
    reachable: residual <= 7,
    mixedHex: rgbToHex(mixedRgb(weights)),
  };
}

const dose = (millilitres) => `${millilitres} ml`;

/** One sentence a buyer can act on. */
export function recipeSentence(name, recipe) {
  if (!recipe || recipe.components.length === 0) return "";
  if (recipe.components.length === 1) {
    const only = recipe.components[0];
    return `${name} takes no tinter at all: it is ${only.name.toLowerCase()} straight from the can.`;
  }
  const build = recipe.components
    .map((c) => `${dose(c.millilitresPerLitre)} ${c.name.toLowerCase()}`)
    .join(", ");
  return `One litre of the mix takes ${build}.`;
}

export function recipeCaveat(recipe) {
  if (!recipe) return "";
  const base =
    "These are tint proportions worked out from the colour's own values against a standard tinter set, not a manufacturer formula. Give them to a tinting machine or scale a one litre test pot, and check the finish in the room before buying the full quantity.";
  if (recipe.closeness === "close") return base;
  if (recipe.closeness === "approximate") {
    return `${base} At these proportions the mix lands within a few points of the shade, so expect to adjust the strongest tinter by eye.`;
  }
  return `This shade is brighter or more saturated than a white base and standard tinters reach, so buy it ready mixed and treat the proportions below as the nearest build rather than a match. ${base}`;
}

/** A short profile used by descriptions, FAQs and metadata. */
export function colourProfile(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { hue, saturation, lightness } = hueOf(rgb);
  const lrv = Math.round(relativeLuminance(hex) * 100);
  const family = (() => {
    if (saturation < 8) return lightness > 90 ? "white" : lightness < 20 ? "black" : "grey";
    if (hue < 15 || hue >= 345) return "red";
    if (hue < 40) return "orange and terracotta";
    if (hue < 68) return "yellow and ochre";
    if (hue < 95) return "yellow green";
    if (hue < 160) return "green";
    if (hue < 200) return "teal";
    if (hue < 250) return "blue";
    if (hue < 285) return "violet";
    return "magenta and plum";
  })();
  const light = rgbToLab(rgb)[0];
  const toneWord =
    light >= 85
      ? "light"
      : light >= 70
        ? "off white to pale"
        : light >= 55
          ? "mid tone"
          : light >= 40
            ? "strong mid tone"
            : "deep";
  return {
    hex: normalizeHex(hex),
    rgb,
    hue: Math.round(hue),
    saturation: Math.round(saturation),
    lightness: Math.round(lightness),
    lrv,
    lightnessLab: Math.round(rgbToLab(rgb)[0]),
    family,
    toneWord,
    warm: hue < 90 || hue >= 300,
    neutral: saturation < 12,
    lab: rgbToLab(rgb),
  };
}

/** Two short paragraphs: what the colour is, and how to reproduce it. */
export function colourDescription(name, hex) {
  const p = colourProfile(hex);
  if (!p) return "";
  const recipe = mixRecipe(hex);
  const familyLine = p.neutral
    ? `${name} is a ${p.toneWord} neutral, so it holds its own without reading as a colour.`
    : `${name} is a ${p.toneWord} ${p.family}${p.warm ? " with a warm cast" : " with a cool cast"}.`;
  const lrvLine = `Its light reflectance works out at about ${p.lrv} of 100, ${
    p.lrv >= 62
      ? "so a wall in it throws daylight back into the room and the space reads brighter than the swatch suggests"
      : p.lrv >= 40
        ? "so it holds the light without bouncing it, which is why it suits living rooms used in the evening"
        : p.lrv >= 24
          ? "so it reads as a colour rather than a background, which is why it is often used on one wall or on joinery with lighter walls around it"
          : "so it takes more light than it gives back and belongs on joinery, a feature wall, or a room that already has plenty of daylight"
  }.`;
  const mixLine = recipe
    ? ` ${recipeSentence(name, recipe)}`
    : "";
  return `${familyLine} ${lrvLine}${mixLine}`;
}

/** Four questions a decorator or homeowner actually asks, answered from the data. */
export function colourFaq(name, hex) {
  const p = colourProfile(hex);
  const recipe = mixRecipe(hex);
  if (!p || !recipe) return [];
  const build = recipe.components
    .map((c) => `${c.parts} parts ${c.name.toLowerCase()} (${c.millilitresPerLitre} ml per litre)`)
    .join(", ");

  const answers = [
    {
      question: `What colours do you mix to get ${name}?`,
      answer: `For one litre of mixed paint, measure ${build}. The doses are worked out from the colour's own HEX value against a standard tinter set, so treat them as a tint build for a machine or a test pot rather than a manufacturer formula.${
        recipe.reachable
          ? ""
          : " This shade sits outside what a white base and standard tinters can reach, so the painted result is best bought ready mixed."
      }`,
    },
    {
      question: `Is ${name} warm or cool?`,
      answer: `${name} sits at a hue of about ${p.hue} degrees with ${p.saturation} per cent saturation, which puts it in the ${p.family} family on the ${p.warm ? "warm" : "cool"} side of the wheel. ${
        p.neutral
          ? "Its saturation is low, so it behaves as a neutral and takes its cast from the light in the room."
          : "At this saturation the colour stays recognisably itself, and it shifts gently as the light changes through the day."
      }`,
    },
    {
      question: `How bright will ${name} look on a wall?`,
      answer: `The estimated light reflectance value is ${p.lrv} of 100, which makes it a ${p.toneWord} colour. ${
        p.lrv >= 62
          ? "That is bright enough to carry a whole room, including a small one that gets little direct sun."
          : p.lrv >= 40
            ? "That is mid range: comfortable across a whole room in good light, and better on one or two walls in a darker one."
            : "At this depth it works as a feature or joinery colour, and it needs daylight around it to show its hue."
      }`,
    },
    {
      question: `How much paint does ${name} need per coat?`,
      answer: `Budget on about 10 square metres per litre, which is 200 square metres from a 20 litre bucket in one coat, or half that at the two coats FRELUX treats as standard. A 4 by 4 metre room with 2.4 metre walls and one door takes roughly 34 square metres of wall.${
        p.lrv < 46
          ? " Deeper colours usually need the extra coat that lighter tones get away without."
          : ""
      } The paint calculator does this per room and returns the buckets to buy.`,
    },
  ];
  return answers;
}

/** Title and description for the page head. */
export function colourSeo(name, hex) {
  const p = colourProfile(hex);
  const code = normalizeHex(hex);
  if (!p || !code) {
    return { title: `${name} Paint Colour | FRELUX`, description: `${name} paint colour with HEX values, undertone and room advice from FRELUX.` };
  }
  const recipe = mixRecipe(hex);
  const build = recipe
    ? recipe.components.map((c) => c.name.toLowerCase()).join(", ")
    : "";
  // A description is read in a results page: name the tinters when they fit,
  // and describe the build rather than overrun the line.
  const mention =
    build && build.length <= 48
      ? `the tinters that build it (${build})`
      : recipe
        ? `a ${recipe.components.length} tinter build to reproduce it`
        : "its colour values";
  return {
    title: `${name} (${code}) Paint Colour, Mix Recipe and LRV | FRELUX`,
    description: `${name} ${code}: ${mention}, HEX and HSL values, light reflectance ${p.lrv} of 100, undertone, pairings and the rooms it suits.`,
  };
}

/** FAQPage structured data, so the questions can be read by a search engine. */
export function colourFaqJsonLd(faq) {
  if (!faq || faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}
