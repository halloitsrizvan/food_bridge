/**
 * Config-driven 7-slide pitch deck builder.
 *   node deck.cjs deck.config.json
 * Needs (installed in the working folder): pptxgenjs sharp react react-dom react-icons
 * Uses plain hex colours from the config theme, so no theme post-processing is needed.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const lu = require("react-icons/lu");

const cfgPath = path.resolve(process.argv[2] || "deck.config.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const baseDir = path.dirname(cfgPath);
const SHOTS = path.resolve(baseDir, cfg.shotsDir || "shots");
const OUT = path.resolve(baseDir, cfg.out || `${cfg.name}-Pitch.pptx`);
const URL = cfg.url || "localhost";
const T = cfg.theme;
const hex = (c) => c.replace("#", "");

// colour roles (hex only)
const C = {
  dark: hex(T.dark), primary: hex(T.primary), accent: hex(T.accent), info: hex(T.info), danger: hex(T.danger),
  ink: hex(T.ink), muted: hex(T.muted), light: hex(T.light), white: "FFFFFF", line: "E6E8E8",
};

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.theme = { headFontFace: T.font || "Calibri", bodyFontFace: T.font || "Calibri" };
pres.title = `${cfg.name}: pitch`;
pres.author = `${cfg.name} team`;

const sh = () => ({ type: "outer", color: C.dark, opacity: 0.14, blur: 10, offset: 2, angle: 90 });

async function icon(name, color = "#" + C.primary, size = 256) {
  const Ic = lu[name];
  if (!Ic) throw new Error(`Unknown icon "${name}". Use a react-icons/lu name such as LuGlobe, LuUsers, LuHouse.`);
  const svg = renderToStaticMarkup(React.createElement(Ic, { size, color, strokeWidth: 2 }));
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

async function shadowed(rounded, w, h, r, pad) {
  const shadow = await sharp({ create: { width: w + pad * 2, height: h + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="rgba(3,39,36,0.35)"/></svg>`), top: pad + Math.round(pad * 0.3), left: pad }])
    .blur(pad * 0.28).png().toBuffer();
  const out = await sharp(shadow).composite([{ input: rounded, top: pad, left: pad }]).png().toBuffer();
  return { data: "image/png;base64," + out.toString("base64"), w, h, pad };
}

/** Browser-style frame (rounded corners, top bar with URL, soft shadow). */
async function frame(file, { w = 1400, url = URL, crop } = {}) {
  const p = path.join(SHOTS, file);
  if (!fs.existsSync(p)) throw new Error(`Missing screenshot: ${p}`);
  let img = sharp(p);
  const meta = await img.metadata();
  if (crop) img = img.extract({ left: Math.round(crop.l * meta.width), top: Math.round(crop.t * meta.height), width: Math.round(crop.w * meta.width), height: Math.round(crop.h * meta.height) });
  const body = await img.resize({ width: w }).png().toBuffer();
  const bm = await sharp(body).metadata();
  const bar = Math.round(w * 0.04), r = Math.round(w * 0.018), pad = Math.round(w * 0.035), h = bm.height + bar;
  const dot = (cx, c) => `<circle cx="${cx}" cy="${bar / 2}" r="${bar * 0.17}" fill="${c}"/>`;
  const chrome = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${bar}"><rect width="${w}" height="${bar}" fill="#F5F5F5"/>${dot(bar * 0.55, "#FF5F57")}${dot(bar, "#FEBC2E")}${dot(bar * 1.45, "#28C840")}<rect x="${w * 0.2}" y="${bar * 0.2}" width="${w * 0.6}" height="${bar * 0.6}" rx="${bar * 0.3}" fill="#FFFFFF"/><text x="${w * 0.5}" y="${bar * 0.64}" font-family="Arial" font-size="${bar * 0.36}" fill="#667085" text-anchor="middle">${url}</text></svg>`);
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
  const card = await sharp({ create: { width: w, height: h, channels: 4, background: "#ffffff" } }).composite([{ input: chrome, top: 0, left: 0 }, { input: body, top: bar, left: 0 }]).png().toBuffer();
  const rounded = await sharp(card).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return shadowed(rounded, w, h, r, pad);
}

/** Portrait card/poster with rounded corners and shadow (no browser bar). */
async function plain(file, { w = 900 } = {}) {
  const p = path.join(SHOTS, file);
  if (!fs.existsSync(p)) throw new Error(`Missing image: ${p}`);
  const body = await sharp(p).resize({ width: w }).png().toBuffer();
  const bm = await sharp(body).metadata();
  const h = bm.height, r = Math.round(w * 0.04), pad = Math.round(w * 0.05);
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
  const rounded = await sharp(body).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return shadowed(rounded, w, h, r, pad);
}

/** Place a framed image so the visible frame starts at (x, y) and is wIn inches wide. Returns visible height (in). */
function put(slide, fr, x, y, wIn, name) {
  const k = wIn / fr.w;
  slide.addImage({ data: fr.data, x: x - fr.pad * k, y: y - fr.pad * k, w: (fr.w + fr.pad * 2) * k, h: (fr.h + fr.pad * 2) * k, altText: name, objectName: name });
  return fr.h * k;
}

function chip(slide, text, x, y, w, { fill = C.primary, color = C.white, size = 12 } = {}) {
  slide.addText(text, { x, y, w, h: 0.34, shape: pres.ShapeType.roundRect, rectRadius: 0.17, fill: { color: fill }, color, fontSize: size, bold: true, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "chip " + text.slice(0, 18) });
}

(async () => {
  // ---------- layouts
  const footer = [
    { ellipse: { x: 0.5, y: 5.27, w: 0.17, h: 0.17, fill: { color: C.primary }, line: { color: C.primary, width: 0 } } },
    { text: { text: cfg.name, options: { x: 0.72, y: 5.22, w: 2.4, h: 0.27, fontSize: 11, bold: true, color: C.primary, margin: 0, valign: "middle" } } },
  ];
  const titlePh = { options: { name: "title", type: "title", x: 0.5, y: 0.28, w: 9, h: 0.7, fontSize: 30, bold: true, color: C.dark, align: "left", valign: "middle", margin: 0 }, text: "" };
  const num = { x: 9.1, y: 5.22, w: 0.4, h: 0.27, fontSize: 10, color: C.muted, align: "right" };
  pres.defineSlideMaster({ title: "LIGHT", background: { color: C.white }, objects: [...footer, { placeholder: titlePh }], slideNumber: num });
  pres.defineSlideMaster({ title: "GRAY", background: { color: C.light }, objects: [...footer, { placeholder: titlePh }], slideNumber: num });
  pres.defineSlideMaster({ title: "DARK", background: { color: C.dark }, objects: [{ placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.25, w: 5.1, h: 2.1, fontSize: 34, bold: true, color: C.white, align: "left", valign: "top", margin: 0 }, text: "" } }] });

  const N = cfg.notes || [];
  let s;

  async function iconRow(slide, name, title, body, x, y, w, color = C.primary) {
    slide.addShape(pres.ShapeType.ellipse, { x, y, w: 0.46, h: 0.46, fill: { color }, line: { color, width: 0 }, objectName: "icon bg " + title });
    slide.addImage({ data: await icon(name, "#FFFFFF"), x: x + 0.1, y: y + 0.1, w: 0.26, h: 0.26, altText: title, objectName: "icon " + title });
    slide.addText([{ text: title, options: { bold: true, fontSize: 15, color: C.dark, breakLine: true } }, { text: body, options: { fontSize: 13, color: C.ink } }], { x: x + 0.6, y: y - 0.04, w: w - 0.6, h: 0.9, valign: "top", margin: 0, isTextBox: true, objectName: "text " + title });
  }

  // ============ 1. Problem and icebreaker
  const P = cfg.problem;
  s = pres.addSlide({ masterName: "DARK" });
  s.addShape(pres.ShapeType.ellipse, { x: 0.6, y: 0.45, w: 0.46, h: 0.46, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, objectName: "logo bg" });
  s.addImage({ data: await icon(cfg.logoIcon || "LuSoup", "#FFFFFF"), x: 0.71, y: 0.56, w: 0.24, h: 0.24, altText: cfg.name + " logo", objectName: "logo icon" });
  s.addText(cfg.name, { x: 1.15, y: 0.45, w: 3.5, h: 0.46, fontSize: 20, bold: true, color: C.white, valign: "middle", margin: 0, isTextBox: true, objectName: "logo text" });
  s.addText(P.question, { placeholder: "title" });
  s.addText(P.line, { x: 0.6, y: 3.5, w: 5.0, h: 0.95, fontSize: 16, color: C.light, margin: 0, valign: "top", isTextBox: true, objectName: "problem line" });
  chip(s, P.badge, 0.6, 4.6, 3.8, { fill: C.accent, color: C.dark });
  put(s, await frame(P.heroShot, { w: 1500 }), 5.95, 1.35, 3.6, "Hero screenshot");
  s.addNotes(N[0] || "");

  // ============ 2. Evidence and cost
  const E = cfg.evidence;
  s = pres.addSlide({ masterName: "LIGHT" });
  s.addText(E.title, { placeholder: "title" });
  for (let i = 0; i < 3; i++) {
    const st = E.stats[i], x = 0.5 + i * 3.075;
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.15, w: 2.85, h: 2.5, rectRadius: 0.12, fill: { color: C.white }, line: { color: C.line, width: 1 }, shadow: sh(), objectName: "evidence card " + (i + 1) });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.22, y: 1.3, w: 0.5, h: 0.5, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, objectName: "ev icon bg " + i });
    s.addImage({ data: await icon(st.icon, "#FFFFFF"), x: x + 0.33, y: 1.41, w: 0.28, h: 0.28, altText: st.number, objectName: "ev icon " + i });
    s.addText(st.number, { x: x + 0.22, y: 1.9, w: 2.45, h: 0.5, fontSize: 26, bold: true, color: C.primary, margin: 0, valign: "middle", isTextBox: true, objectName: "ev number " + i });
    s.addText(st.text, { x: x + 0.22, y: 2.45, w: 2.45, h: 0.75, fontSize: 14, color: C.ink, margin: 0, valign: "top", isTextBox: true, objectName: "ev text " + i });
    s.addText(st.source, { x: x + 0.22, y: 3.2, w: 2.45, h: 0.38, fontSize: 10, italic: true, color: C.muted, margin: 0, valign: "top", isTextBox: true, objectName: "ev source " + i });
  }
  s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 3.85, w: 9, h: 1.25, rectRadius: 0.12, fill: { color: C.dark }, line: { color: C.dark, width: 0 }, objectName: "clock band" });
  s.addText(E.clock.big, { x: 0.75, y: 3.9, w: 1.7, h: 1.15, fontSize: 48, bold: true, color: C.accent, margin: 0, valign: "middle", isTextBox: true, objectName: "clock number" });
  s.addText([{ text: E.clock.text, options: { fontSize: 17, bold: true, color: C.white, breakLine: true } }, { text: E.clock.sub, options: { fontSize: 12, color: C.light } }], { x: 2.5, y: 3.9, w: 6.8, h: 1.15, margin: 0, valign: "middle", isTextBox: true, objectName: "clock text" });
  s.addNotes(N[1] || "");

  // ============ 3. Solution
  const S = cfg.solution;
  s = pres.addSlide({ masterName: "GRAY" });
  s.addText(S.title, { placeholder: "title" });
  for (let i = 0; i < 3; i++) {
    const y = 1.2 + i * 1.08;
    s.addShape(pres.ShapeType.ellipse, { x: 0.5, y, w: 0.56, h: 0.56, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, objectName: "step circle " + (i + 1) });
    s.addText(String(i + 1), { x: 0.5, y, w: 0.56, h: 0.56, fontSize: 20, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "step number " + (i + 1) });
    s.addText([{ text: S.steps[i].title, options: { bold: true, fontSize: 20, color: C.dark, breakLine: true } }, { text: S.steps[i].text, options: { fontSize: 14, color: C.ink } }], { x: 1.25, y: y - 0.06, w: 3.7, h: 1.0, valign: "top", margin: 0, isTextBox: true, objectName: "step text " + (i + 1) });
  }
  (S.chips || []).slice(0, 2).forEach((t, i) => chip(s, t, 0.5, 4.45 + i * 0.4, 4.4, { fill: i === 0 ? C.accent : C.primary, color: i === 0 ? C.dark : C.white }));
  put(s, await frame(S.shot, { w: 1500 }), 5.25, 1.2, 4.3, "Home screen screenshot");
  s.addNotes(N[2] || "");

  // ============ 4. Product tour (one slide)
  const TR = cfg.tour;
  s = pres.addSlide({ masterName: "LIGHT" });
  s.addText(TR.title, { placeholder: "title" });
  for (let i = 0; i < 6; i++) {
    const t = TR.tiles[i], col = i % 3, row = Math.floor(i / 3);
    const x = [0.6, 3.65, 6.7][col], y = 1.05 + row * 2.05;
    const fh = put(s, await frame(t.shot, { w: 1100, url: URL + t.path, crop: { l: 0, t: 0, w: 1, h: 0.8 } }), x, y, 2.7, "Tour: " + t.label);
    s.addShape(pres.ShapeType.ellipse, { x, y: y + fh + 0.09, w: 0.26, h: 0.26, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, objectName: "tour num bg " + (i + 1) });
    s.addText(String(i + 1), { x, y: y + fh + 0.09, w: 0.26, h: 0.26, fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "tour num " + (i + 1) });
    s.addText(t.label, { x: x + 0.34, y: y + fh + 0.07, w: 2.36, h: 0.3, fontSize: 12, bold: true, color: C.dark, margin: 0, valign: "middle", isTextBox: true, objectName: "tour label " + (i + 1) });
  }
  s.addNotes(N[3] || "");

  // ============ 5. Differentiator
  const U = cfg.usp;
  s = pres.addSlide({ masterName: "GRAY" });
  s.addText(U.title, { placeholder: "title" });
  put(s, await frame(U.mainShot, { w: 1500, url: URL + (U.mainPath || "") }), 0.5, 1.15, 4.6, "Main screen screenshot");
  const c1 = await plain(U.cards[0], { w: 800 });
  const c2 = await plain(U.cards[1], { w: 800 });
  const h1 = put(s, c1, 5.4, 1.15, 1.95, "Card 1");
  const h2 = put(s, c2, 7.55, 1.15, 2.0, "Card 2");
  s.addText(U.captions[0], { x: 5.4, y: 1.15 + h1 + 0.06, w: 1.95, h: 0.26, fontSize: 11, color: C.muted, align: "center", margin: 0, isTextBox: true, objectName: "caption 1" });
  s.addText(U.captions[1], { x: 7.55, y: 1.15 + h2 + 0.06, w: 2.0, h: 0.26, fontSize: 11, color: C.muted, align: "center", margin: 0, isTextBox: true, objectName: "caption 2" });
  const ch = U.chips;
  chip(s, ch[0], 0.5, 4.78, 2.2, { size: 11 });
  chip(s, ch[1], 2.8, 4.78, 2.3, { size: 11 });
  chip(s, ch[2], 5.4, 4.45, 2.1, { fill: C.info, size: 11 });
  chip(s, ch[3], 7.6, 4.45, 1.95, { fill: C.info, size: 11 });
  chip(s, ch[4], 5.4, 4.85, 4.15, { fill: C.dark, size: 11 });
  s.addNotes(N[4] || "");

  // ============ 6. Before and after
  const BA = cfg.beforeAfter;
  s = pres.addSlide({ masterName: "LIGHT" });
  s.addText(BA.title, { placeholder: "title" });
  const panel = async (x, tone, head, big, items, icn) => {
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.2, w: 4.2, h: 3.75, rectRadius: 0.14, fill: { color: C.white }, line: { color: tone, width: 2 }, shadow: sh(), objectName: head + " panel" });
    s.addText(head.toUpperCase(), { x: x + 0.3, y: 1.38, w: 3.6, h: 0.3, fontSize: 13, bold: true, color: tone, margin: 0, isTextBox: true, objectName: head + " label" });
    s.addText(big, { x: x + 0.3, y: 1.7, w: 3.6, h: 0.85, fontSize: 46, bold: true, color: tone, margin: 0, valign: "middle", isTextBox: true, objectName: head + " big" });
    let y = 2.7;
    for (const it of items) {
      s.addImage({ data: await icon(icn, "#" + tone), x: x + 0.3, y: y + 0.03, w: 0.24, h: 0.24, altText: it, objectName: head + " icon" });
      s.addText(it, { x: x + 0.65, y: y - 0.03, w: 3.35, h: 0.62, fontSize: 14, color: C.ink, margin: 0, valign: "top", isTextBox: true, objectName: head + " " + it.slice(0, 12) });
      y += 0.7;
    }
  };
  await panel(0.5, C.danger, "Before", BA.before.big, BA.before.items, "LuX");
  await panel(5.3, C.primary, "After", BA.after.big, BA.after.items, "LuCheck");
  s.addShape(pres.ShapeType.ellipse, { x: 4.58, y: 2.65, w: 0.84, h: 0.84, fill: { color: C.accent }, line: { color: C.white, width: 3 }, objectName: "arrow bg" });
  s.addImage({ data: await icon("LuArrowRight", "#" + C.dark), x: 4.8, y: 2.87, w: 0.4, h: 0.4, altText: "to", objectName: "arrow icon" });
  s.addNotes(N[5] || "");

  // ============ 7. Limits, next steps, thank you
  const CL = cfg.closing;
  s = pres.addSlide({ masterName: "GRAY" });
  s.addText(CL.title, { placeholder: "title" });
  const cols = [["Honest limits", "LuTriangleAlert", C.danger, CL.limits], ["Next steps", "LuRocket", C.primary, CL.next], ["Built with", "LuCode", C.info, CL.stack]];
  for (let i = 0; i < 3; i++) {
    const x = 0.5 + i * 3.075, [title, ic, color, items] = cols[i];
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.2, w: 2.85, h: 2.85, rectRadius: 0.12, fill: { color: C.white }, line: { color: C.line, width: 1 }, shadow: sh(), objectName: "col " + title });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.2, y: 1.38, w: 0.44, h: 0.44, fill: { color }, line: { color, width: 0 }, objectName: "col icon bg " + i });
    s.addImage({ data: await icon(ic, "#FFFFFF"), x: x + 0.3, y: 1.48, w: 0.24, h: 0.24, altText: title, objectName: "col icon " + i });
    s.addText(title, { x: x + 0.75, y: 1.38, w: 2, h: 0.44, fontSize: 17, bold: true, color: C.dark, margin: 0, valign: "middle", isTextBox: true, objectName: "col title " + i });
    s.addText(items.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < items.length - 1, paraSpaceAfter: 6 } })), { x: x + 0.2, y: 2.0, w: 2.5, h: 1.95, fontSize: 13, color: C.ink, valign: "top", margin: 0, isTextBox: true, objectName: "col list " + i });
  }
  s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 4.25, w: 9, h: 0.85, rectRadius: 0.12, fill: { color: C.dark }, line: { color: C.dark, width: 0 }, objectName: "thank you band" });
  s.addText(CL.thanks, { x: 0.8, y: 4.25, w: 5.6, h: 0.85, fontSize: 20, bold: true, color: C.white, margin: 0, valign: "middle", isTextBox: true, objectName: "thanks" });
  s.addText(URL, { x: 6.4, y: 4.25, w: 2.9, h: 0.85, fontSize: 14, bold: true, color: C.accent, align: "right", margin: 0, valign: "middle", isTextBox: true, objectName: "url" });
  s.addNotes(N[6] || "");

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await pres.writeFile({ fileName: OUT });
  console.log("written", OUT);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
