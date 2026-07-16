# CourseFlyer — 課程傳單 (Save as PDF)

Not a CRUD entity — a read-only, print-oriented view built from an existing
`Course` record. Design doc: `/office-hours` session 2026-07-15 (Approach B).
Wireframe: `spec/course/course-flyer-wireframe.png`.

## What it is

A WYSIWYG A4 flyer preview at `courses/:id/flyer`, reachable via a 列印傳單
button on the Course detail page toolbar. A 儲存 PDF button calls
`window.print()` — the browser's native print engine renders the flawless
Traditional Chinese typography (no client PDF library, no new dependencies).

## Files

- `features/courses/course-flyer/` — `CourseFlyer` standalone component
  (`.ts`/`.html`/`.scss`/`.spec.ts`).
- `core/utils/course-url.util.ts` — `courseShowUrl(course)`, extracted out of
  `course-detail.ts` so both the detail page and the flyer build the same
  `https://www.uuu.com.tw/Course/Show/{pkid}/{courseId}` URL.
- `core/services/qr-code.service.ts` — `toDataUrl(text, width = 160)` gained
  an optional width param; the flyer requests 300px for print DPI, the
  detail page keeps the 160px default.
- `styles.scss` — global `@media print` rules gated on
  `body.course-flyer-active`, plus a global `@page { size: A4; margin: 0 }`.
- `app.routes.ts` — `courses/:id/flyer` route, inside the same
  authGuard-protected shell as every other route.

## How print isolation works

The flyer route renders inside the normal app shell (`app.html`'s
`header.topbar` / `aside.sidebar` / `main.content`). Angular view
encapsulation means the flyer's own SCSS can't reach those ancestors, so the
component toggles `document.body.classList.add('course-flyer-active')` in
`ngOnInit` (removed in `ngOnDestroy`), and `styles.scss` hides the shell
chrome only when that class is present and the browser is printing.

`document.title` is set to `{courseId} 課程傳單` for the lifetime of the
route and restored on destroy — this drives the filename the browser's
"Save as PDF" dialog suggests.

## Content rules

- Curated, customer-facing fields only: 原廠/時數/定價/點數 fact strip,
  課程目標/適合對象/課程大綱 (each hidden entirely when empty — no `—`
  placeholders), QR footer. Never pkid, publish status, or audit data.
- `scheduleOn`/`scheduleOff` are shelf dates, not class dates — never
  printed on the flyer.
- One A4 page enforced via fixed CSS dimensions + `-webkit-line-clamp` on
  the three text sections. Only 課程大綱 gets JS clamp detection
  (`scrollHeight > clientHeight`, checked via `afterNextRender` after the
  course loads) — if clamped, a "大綱節錄 — 完整內容請掃描 QR Code" note
  appears, falling back to the plain URL in that note if QR generation
  failed.
- QR failure mirrors the detail page: the data URL just stays `null`: the
  footer swaps from the QR image to a plain-URL line, and the flyer never
  references a QR code that isn't printed.
- Load failure (GET returns nothing): 查無資料 empty-state card, same as
  the detail page. HTTP 5xx is already toasted by the global interceptor.

## Manual verification (not covered by unit tests)

Run `npm start`, log in, open a Course detail page, click 列印傳單, then
儲存 PDF, and confirm:

- The saved PDF is exactly one A4 page and matches the on-screen preview.
- All text is selectable vector Traditional Chinese, not rasterized.
- The QR code scans to the course's `Course/Show` URL.
- A course with maximal-length outline/objective/target text still fits one
  page, with the clamp note visible; a course with empty optional fields
  renders with no gaps.
- Verified once in Chrome and once in Edge (both Chromium-based `@page`
  margin handling is the acceptance bar for this internal tool).
