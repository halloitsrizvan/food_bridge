---
name: presentation
description: Build a short hackathon pitch deck (.pptx, 7 slides, about 4 to 5 minutes) for the finished web app in the current project. Analyses the real codebase, takes real screenshots of every page, and writes themed slides plus speaker notes. Use after development is complete, when the user says "make the presentation / pitch deck / ppt".
---

# presentation

Create a 7-slide pitch deck for the project in the current directory, in the project's own visual theme, using REAL screenshots and ONLY claims that are true of the current code.

The structure follows the winning-pitch outline in `reference/structure.md`. Read it first.

## What you produce

`docs/<AppName>-Pitch.pptx` (7 slides, speaker notes with timings), plus `docs/pitch/deck.config.json` (the editable source) so the deck can be rebuilt after the app changes.

| # | Slide | Content |
|---|---|---|
| 1 | Problem and icebreaker | one relatable question, who is hurt, hero screenshot |
| 2 | Evidence and cost | 3 sourced statistics + the one number that explains the urgency |
| 3 | Solution | 3 plain-language steps + home screen |
| 4 | Product tour (ONE slide) | a 2x3 grid of the key pages, numbered and labelled |
| 5 | The differentiator | the USP in depth: main screen + 1 or 2 supporting visuals + short chips |
| 6 | Before and after | the same task, "hours" vs "minutes", 3 points each |
| 7 | Limits, next steps, thank you | honest limits, roadmap, tech stack, thanks |

Never exceed 7 slides unless the user asks. About 35 seconds per slide.

## Workflow

Work through these in order. Do not skip step 1: stale or invented claims are the most common failure.

### 1. Analyse the project (read-only)

- Read `README.md`, `package.json`, the route/page files (for Next.js: `app/**/page.tsx`, `app/api/**/route.ts`), `git log --oneline | head -40`, and the theme tokens (`app/globals.css` or the Tailwind config) for colours and fonts.
- List: roles/users, every page, the core user journey, the unique selling point, integrations (AI, email, maps, payments), and anything planned but unbuilt.
- Derive the **limitations from the code, not from memory**: grep for in-memory stores, hard-coded constants, missing verification, optional integrations, English-only strings, straight-line vs road distance, manual steps, mocked or seeded data. A limitation is only listed if you can point at the code that causes it.
- Derive **next steps** from those real gaps (plus items the code already prepares for, e.g. an i18n file).
- Do not copy wording from an old deck without re-checking it against the code. If a previous deck exists, treat it as outdated.

### 2. Evidence (slide 2)

Pick 3 real, citable statistics about the problem (reports, UN/FAO/WHO/government or industry data). If you have a web tool, look them up. Otherwise use figures you are confident about, name the exact source and year, and tell the user in the final message to re-verify them. Never invent a number. Never use a company/government emblem or logo you have no right to use; use a neutral icon instead.

### 3. Set up a working folder

```bash
mkdir -p docs/pitch && cd docs/pitch
npm init -y >/dev/null
npm i pptxgenjs puppeteer-core sharp react react-dom react-icons
```

Keep `node_modules` out of git (add `docs/pitch/node_modules` to `.gitignore`). Copy `scripts/shots.cjs` and `scripts/deck.cjs` from this skill's folder next to your config:

```bash
cp "<skill dir>/scripts/shots.cjs" "<skill dir>/scripts/deck.cjs" .
```

### 4. Write `deck.config.json`

Use `reference/config-example.json` as the template. Fill every field from step 1 and 2. Rules:

- Colours come from the project theme tokens. Keep the dark background, the primary colour, one accent and one cool/danger colour.
- Text must be plain language a non-technical judge understands. No buzzwords. Titles under about 36 characters (they must fit one line at 30pt).
- 7 notes, one per slide, each starting with the time budget (e.g. "~35 sec.").
- `tour.tiles` has exactly 6 entries that cover every role (public, each user role, admin).

### 5. Capture real screenshots

Start the app (prefer a production build: `npm run build && npx next start -p 3100`; dev mode is slower and shows overlays). Make sure it has believable demo data (run the project's seed script if it has one; refresh expired demo records first).

Edit the `CONFIG` block at the top of `shots.cjs` (base URL, login method per role, the shot list with URL, viewport, wait and optional actions), then:

```bash
node shots.cjs
```

Then LOOK at the images (open a few). Retake anything that shows a loading skeleton, an error page, empty states, a dev overlay, or private data. Use the project's light theme if the deck background is light. Any temporary records you create to reach a screen (for example a pending request) must be deleted afterwards.

### 6. Build and validate

```bash
node deck.cjs deck.config.json
```

If a `pptx` skill is available, also run its validator:

```bash
python <pptx skill>/scripts/office/validate.py docs/<AppName>-Pitch.pptx
python <pptx skill>/scripts/slide_text.py   docs/<AppName>-Pitch.pptx
```

Render check: if LibreOffice (`soffice`) exists, convert to PDF and view every slide image. If it does not, say clearly that the slides could not be rendered and review geometry by hand: titles one line, no text beyond a card, nothing in the bottom 0.4 inch (footer), tour captions clear of the next row.

### 7. Hand over

Reply briefly with: file path, the 7 slides in one table, which numbers need re-verifying, what was not verified (rendering), and anything you could not capture. Do not push or deploy unless asked. If the target `.pptx` is open in PowerPoint (a `~$` lock file exists) write to a new filename instead of failing.

## Quality rules (apply to every deck)

- Every slide has a visual (screenshot, icon, stat, shape). No text-only slides.
- One message per slide. Body text 14pt or larger, captions 10pt or larger.
- Only the project's own screens, real data, no stock art, no fake logos.
- Be honest on slide 7: limitations are real and specific, not generic hedging, and not outdated.
- Do not claim live metrics you did not measure; call design targets "target".
- Keep speaker notes useful: what to say, what to click if demoing live, and where the numbers come from.
