# Wealth Dashboard — build context & chat history

This document preserves the context of the Claude Code chats that built and refined the
dashboard, so a fresh session (cloud or local) can pick up without re‑deriving everything.
The concise operational guide is in [`../CLAUDE.md`](../CLAUDE.md); this file is the
narrative and the reasoning behind decisions.

---

## Architecture recap

- **Single file** `index.html`: inline `<style>` at top, all markup, then one inline
  `<script>`. Sub‑tabs use `.subpanel`/`.subpanel.active`; a generic handler toggles panels
  per `.subtabs` bar via `data-sub` = target panel id.
- **Encryption**: `encState`/`decState` (AES‑GCM, PBKDF2 250k). Password gate at
  `#gate`; `unlock()` tries the local encrypted copy (`localStorage` LS2) and the remote
  blob, picks the newest, and boots.
- **Sync**: `persist()` encrypts and `schedulePush()`es to `/api/state?k=<kdfHex(pass)>`.
  `remoteGet()` pulls. Round‑trip confirmed working (HTTP 200 PUT/GET).
- **State shape**: `state.accounts`, `state.history` (net‑worth snapshots), `state.degiro`
  (+`degiroCash`), `state.propertyCosts` / `state.recurringCosts` / `state.utilities`
  (Costs & upkeep), `state.expenses`, `state.income`. Migrations run in `boot()` guarded by
  one‑shot flags (`propRevalV1`, `incomeV2`, …).
- **Charts**: hand‑rolled inline SVG (net‑worth line chart, Salva sale‑price `mktSvg` with a
  `SERIES` array, gifts prescription chart, rental bar chart, deployment "rungs"/"gbars").
- **Verification**: `npm run check` (`scripts/check-syntax.mjs`) parses the inline script.
  Always also eyeball `<div>`/`</div>` balance — an unbalanced tag once reparented whole
  sub‑panels outside their tab and made them render under every tab.

## Key figures (as built)
- Net worth ≈ €234k (assets ≈ €369k − debt ≈ €135k) as of mid‑Sep 2026.
- Property (Salva 40): appraisal €380.564; Simon's 50% = €190.281,85. Property‑equity KPI =
  190,3k − 134,9k mortgage ≈ 55,3k.
- Gifts: €163k total, €7k never prescribes, €155k safe ≈ 6 Nov 2028.

---

## Chat history (reverse‑chronological by theme)

### Sep 2026 session — refinements
1. **Rental market section** (Salva 40 → Market & value). Added from a newspaper article
   (Zona Sec, Sept 2026; Generalitat/INCASÒL + Observatori Metropolità). It is **rental**
   (lloguer) data, deliberately distinct from the existing **sale** €/m² content: Poble‑sec
   new‑contract rent **17,70 €/m²/mo (Q1 2026, +23,3% vs 2019)**, a 2019→2026 bar chart, an
   implied rent (17,70 × 76 m² ≈ €1.345/mo) and gross yield (≈4,2% vs the €380.564
   appraisal), a vs‑city comparison (BCN 16,89 · Sants‑Montjuïc 16,69), and the offer mix
   (residential 57,6% / seasonal 26,4% / tourist 15,9%).
2. **Deployment plan month labels** were off by one (anchored to `now+1`). Re‑anchored to a
   fixed calendar month; then marked **September deployed** by splitting the "deployed" flag
   from the lump‑sum‑vs‑recurring split and driving it off a `_doneThru` date. Now: Jun 30k /
   Jul 15k / Aug 15k / Sep (5k+2k+1k) done, Oct first to‑deploy.
3. **Property‑equity KPI** subtext now shows the 50% appraisal share with one decimal
   (**190,3k**, not 190k), matching the mortgage figure.
4. **Gifts "155k safe" countdown card** — a prominent, live countdown at the top of the
   4‑year‑clock section. Segmented tiles (days / hrs / min / sec, gradient hero number), a
   progress bar across the prescription journey (first gift 25 Apr 2023 → 6 Nov 2028), and
   an animated glow. It reuses the existing `bulkSafe` prescription date (last 2024 gift),
   which is exactly when €155k of the €163k is prescribed (the €1.000 Oct‑2025 gift + €7k
   cash/undated stay exposed). Note: a plain `.card` has no padding, so the card sets its own.
5. **Costs & upkeep made editable** — every row in the one‑off, recurring and utility tables
   got a ✎ edit button that reopens the Add modal in edit mode (prefilled, title/button
   relabelled) and updates in place. Mirrors the Expenses tab's `open*(id)` + edit‑id +
   update‑or‑insert pattern; added `pushUndo` to cost/recurring saves.
6. **Friends login removed** — unlock screen is password‑only. Deleted the `gateUser` input
   and the `u===FRIEND_PW && p===FRIEND_PW` branch, and stopped calling `publishFriendMirror()`
   in `persist()`. Vestigial friend code remains but is unreachable. Any friend‑mirror blob
   published before removal still exists on Vercel Blob (not deleted) but is unreachable via
   the UI.
7. **iOS login zoom fixed** — gate + modal inputs were `font-size:14px`, triggering iOS
   Safari's auto‑zoom on focus (logging in left the whole app zoomed). Bumped to **16px**.
8. **Costs & upkeep KPIs simplified** — removed the "Recurring / month" card; "Recurring /
   year" now = recurring annualised (monthly ×12, quarterly ×4, yearly ×1) **+ utilities**.
   Grid `k4` → `k3`.

### Earlier work (summarized)
- **Income tab** built from ~60 parsed payslips (net take‑home + Edenred meal vouchers);
  annual gross/IRPF from the Certificado de Retenciones.
- **TINSA appraisal** integrated into Market & value (€380.564, comparables method, valuer
  details) and used to mark the property to market across the net‑worth history
  (`propRevalV1`: +€20.281,85 vs the old €170k basis).
- **Degiro** account derived from its holdings (secVal + cash) via `saveDegiro` + boot
  reconcile; removed from the manual ＋Update list to avoid KPI/holdings mismatch.
- **12‑month deployment plan** (3 done + 9 forward), cumulative to ~€120k, with a
  cash‑after‑deployment note; yellow = deployed, grey = to‑deploy.
- **PWA / iOS home‑screen icon**: gold gradient background with bold dark ascending bars
  (Pillow‑generated); manifest + apple‑touch‑icon etc.
- **Bug fixed**: a stray `</div>` (from an appraisal‑tooltip edit) broke HTML nesting so
  Costs/Market sub‑panels reparented outside `tab-salva` and rendered under every tab. Fixed
  by restoring the tag; confirmed via div‑balance. (Lesson: always check div balance.)

---

## Build‑tag history (most recent last)
`icon-v2` → `rental-v1` → `plan-fix` → `sep-deployed` → `propeq-decimal` →
`safe-countdown` → `countdown-v2` → `costs-editable` → `password-only · no-zoom · costs-yearly`.

## How to update this file
When you finish a meaningful change, add a bullet under the current session in the chat
history above and note the new build tag. Keep `CLAUDE.md` (the operational guide) concise;
put the narrative and reasoning here.
