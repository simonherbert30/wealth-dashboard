# Wealth Dashboard — project guide for Claude

A personal, single‑file, client‑side‑encrypted wealth dashboard for Simon (owner:
`simonherbert30`, simon.cedric.herbert@gmail.com). This file is auto‑loaded by Claude
Code — read it first. For the full narrative of how the app was built and every decision
behind it, see [`docs/CONTEXT.md`](docs/CONTEXT.md).

## What it is
- **`index.html`** — the entire app: one HTML file with an inline `<script>` and inline
  `<style>`. No build step, no framework. Deployed as a static site on **Vercel** from this
  GitHub repo (`simonherbert30/wealth-dashboard`), auto‑deploying on push to `main`.
- Password‑gated. All user state is **AES‑GCM encrypted (PBKDF2, 250k iters)** in the
  browser before it is stored or synced — it never leaves the browser readable.
- **Sync**: serverless `api/state.js` ⇄ Vercel Blob (`wealthdash/<key>.json`). The sync key
  is `kdfHex(password)`. Code pushes never touch user data.
- Tabs: **01 Net worth · 02 Investments · 03 Salva 40 · 04 Gifts · 05 Wealth · 06 Expenses
  · 07 Income**. "Salva 40" is Simon's flat and has sub‑tabs: Property & mortgage / Costs &
  upkeep / Market & value.

## Repo layout
- `index.html` — the app (the only thing you normally edit).
- `api/state.js` — sync serverless function. **MUST stay git‑tracked** (see gotcha below).
- `package.json` — dep `@vercel/blob`; `npm run check` runs the syntax checker.
- `scripts/check-syntax.mjs` — parses the inline script; run before every push.
- `site.webmanifest`, `apple-touch-icon.png`, `favicon-32.png`, `icon-192.png`,
  `icon-512.png` — PWA / iOS home‑screen icons (gold gradient, dark ascending bars).
- `CLAUDE.md` (this file), `docs/CONTEXT.md` — context for future sessions.

## Deploy flow
**In a cloud session (working directly in this git repo):**
1. Edit `index.html`.
2. `npm run check` — must print `check-syntax: OK`.
3. Sanity: `<div>`/`</div>` counts must balance (`grep -o '<div' index.html | wc -l` ==
   `grep -o '</div>' index.html | wc -l`).
4. Confirm `git ls-files api/state.js` still lists it.
5. Bump the build tag (see below), commit, push to `main`. Vercel auto‑deploys; check
   status via `gh api repos/simonherbert30/wealth-dashboard/deployments`.

**In the local desktop session:** the source of truth is the OneDrive working copy
`…/Wealth Dashboard/index (1).html` (that folder is **not** a git repo). The flow is: edit
that file → clone the repo to a scratch dir → copy it over `index.html` → check → push.

⚠️ **Keeping local and cloud in sync:** `index.html` in git is canonical. If you edit in the
cloud, then before working locally again copy git's `index.html` back onto the OneDrive
`index (1).html` first, or local edits will clobber the cloud changes on the next push.

## Gotchas (these have bitten before)
- **`api/state.js` must stay tracked.** Copying only `index.html` into a fresh clone and
  running `git add -A` can silently stage the *deletion* of `api/state.js` if the clone
  lacks it → sync 404s → app shows "Device only · sync down". Always verify with
  `git ls-files api/state.js` before pushing; restore with `git checkout <goodsha> -- api/state.js`.
  Blob data survives regardless — only the function goes missing.
- **Build tag**: a visible build string lives in the gate note near the bottom of
  `index.html` (search `Build ` + a date, e.g. `Build 16 Sep 2026 · …`). Bump it every
  deploy so the user can confirm a fresh build loaded.
- **`.card` has no padding** of its own — only variants like `.mort-panel` / `.own-card` do.
  A bare `.card` needs its own `padding`.
- **iOS auto‑zoom**: any focused text input with `font-size < 16px` makes iOS Safari zoom in
  and stay zoomed. All gate + modal inputs are set to **16px** — keep them there.
- **`normNum()`** parses European numbers; comma with ≤2 trailing digits = decimal (so
  "5000,5" → 5000.5, not 50005).
- **Numbers/format**: European (`.` thousands, `,` decimal). Helpers: `$(id)`,
  `set(id,txt)` (null‑safe, uses `textContent`), `eur()`/`eur0()`, `V('--var')`, `clone()`.
- The scratchpad clone's `.git` has repeatedly gone missing between local sessions — just
  re‑clone fresh (`git clone --depth 1 …`) when that happens.

## Key domain facts
- **Salva 40** = flat at Carrer de Salvà 40, Poble‑sec, Barcelona. Bought 24 Apr 2026 for
  €340k, 50/50 with Luciana, €272k CaixaBank mortgage. Surfaces: 67,45 m² útil / 75–76 m²
  registry / ~86 m² built. TINSA appraisal **€380.564** (24 Feb 2026); Simon's 50% =
  **€190.281,85**, marked across the whole net‑worth history (`propRevalV1` migration).
- **Deployment plan** (Investments): €30k (Jun 2026), €15k (Jul), €15k (Aug) done, then €5k
  VWCE/month + €2k bonds + €1k gold for the first 5 forward months. Anchored to a fixed
  `_doneThru` date (Sep 2026 deployed) so month labels don't drift; bump `_doneThru` as each
  month is deployed.
- **Gifts** total €163k (dad €146k + grandmother €17k); €7k (cash + undated) never
  prescribes. ISD prescription = gift date + 30 business days + 4 years (STS 30‑11‑2020).
  **€155k is "safe" ≈ 6 Nov 2028** (all 2023–2024 gifts prescribed) — the Gifts tab has a
  live countdown card to that date.
- **Friends login was REMOVED (16 Sep 2026)** — the unlock screen is password‑only. Dead
  `friendMode` / `FRIEND_PW` / `publishFriendMirror` code remains but is unreachable.
