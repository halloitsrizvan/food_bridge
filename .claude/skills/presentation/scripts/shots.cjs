/**
 * Config-driven screenshot capture.  node shots.cjs
 * Needs: puppeteer-core. Edit the CONFIG block for the project, then run against a running app.
 * Output PNGs go to ./shots (the names must match deck.config.json).
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

// ================= CONFIG: edit per project =================
const CONFIG = {
  base: "http://localhost:3100",
  chrome: "C:/Program Files/Google/Chrome/Application/chrome.exe", // any Chrome/Edge path
  out: path.join(__dirname, "shots"),
  geo: { latitude: 11.2588, longitude: 75.7804 }, // used if the app asks for location; remove if not
  // Roles -> how to log in. "cookies" returns puppeteer cookie objects (or [] for public).
  // Supabase example: password-grant, then set the sb-<ref>-auth-token cookie (chunked at 3000 chars).
  // For a form login, use "form": { path, emailSel, passSel, submitSel, email, password } instead.
  roles: {
    // giver: { form: { path: "/login", emailSel: 'input[type=email]', passSel: 'input[type=password]', submitSel: 'button[type=submit]', email: "a@b.c", password: "..." } },
  },
  // Each shot: name (file), role (key above or null), url, and optional w,h,scale,wait,scrollTo,clickText,full
  shots: [
    { name: "landing-hero", role: null, url: "/", h: 860 },
    // { name: "landing-feed", role: null, url: "/", h: 980, scrollTo: "#live", clickText: "Food + requests" },
    // { name: "dashboard", role: "giver", url: "/dashboard", h: 1000, wait: 5000 },
  ],
};
// ============================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page, role) {
  const spec = CONFIG.roles[role];
  if (!spec) throw new Error(`Unknown role "${role}"`);
  if (spec.cookies) return page.setCookie(...(await spec.cookies()));
  const f = spec.form;
  await page.goto(CONFIG.base + f.path, { waitUntil: "networkidle2" });
  await page.type(f.emailSel, f.email);
  await page.type(f.passSel, f.password);
  await Promise.all([page.click(f.submitSel), page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {})]);
}

(async () => {
  fs.mkdirSync(CONFIG.out, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CONFIG.chrome, headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
  for (const s of CONFIG.shots) {
    const ctx = await browser.createBrowserContext(); // fresh session per shot = no cross-role leakage
    try {
      await ctx.overridePermissions(CONFIG.base, ["geolocation"]);
      const page = await ctx.newPage();
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
      await page.setViewport({ width: s.w || 1440, height: s.h || 900, deviceScaleFactor: s.scale || 1.5 });
      if (CONFIG.geo) await page.setGeolocation(CONFIG.geo);
      if (s.role) await login(page, s.role);
      await page.goto(CONFIG.base + s.url, { waitUntil: "networkidle2", timeout: 60000 }).catch(() => console.log("goto timeout (continuing)", s.name));
      await sleep(1500);
      // wait for loading skeletons to disappear
      await page.waitForFunction(() => !document.querySelector('[aria-busy="true"], .shimmer, .animate-pulse'), { timeout: 70000 }).catch(() => console.log("  still loading:", s.name));
      await sleep(s.wait || 2500);
      if (s.clickText) {
        for (const b of await page.$$("button, a")) {
          const t = await page.evaluate((e) => e.textContent, b);
          if (t && t.includes(s.clickText)) { await b.click(); break; }
        }
        await sleep(2500);
      }
      if (s.scrollTo) await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ block: "start" }); window.scrollBy(0, -140); }, s.scrollTo);
      await sleep(1000);
      await page.screenshot({ path: path.join(CONFIG.out, s.name + ".png"), fullPage: !!s.full });
      console.log("shot", s.name);
    } catch (e) {
      console.log("FAILED", s.name, e.message);
    } finally {
      await ctx.close();
    }
  }
  await browser.close();
})();
