# TODOS

Deferred work items, written down so they exist. Format: what / why / context / effort / priority.

## Course

- [ ] **Course list row print button** — quick 列印傳單 access from `/courses` list rows without opening the detail page first.
  - Why: saves one click for salespeople printing several flyers in a row.
  - Context: deferred by /autoplan CEO review (2026-07-15, decision #5) of the course-flyer plan. The flyer route `/courses/:id/flyer` exists after that feature ships; this is just an icon button in the list's row actions navigating to it.
  - Effort: S (human ~1h / CC ~10min) · Priority: P3 · Depends on: course-flyer feature shipped.

- [ ] **App-wide horizontal overflow below ~800px viewport width** — not a course-flyer regression.
  - Why: found during /qa of the course-flyer feature (2026-07-16). `document.documentElement.scrollWidth > clientWidth` is already `true` on the existing Course detail page (818px) at a 375px mobile viewport, before any flyer-specific markup loads — the fixed 238px sidebar plus unconstrained content pushes the whole shell wider than the viewport on every page, not just this feature's. The flyer page overflows further (1053px) because its A4-preview width (210mm ≈ 794px) is intentional per the approved design (WYSIWYG print preview), stacked on top of the pre-existing sidebar overflow.
  - Context: acceptance bar for this admin tool is desktop Chrome/Edge only (see `spec/course/CourseFlyer.md`), so this is deferred, not a shipped-feature bug. Worth a look if mobile/tablet admin use ever becomes a requirement.
  - Effort: M (human ~half day / CC ~1-2h — needs a responsive pass on `app.scss`'s `.sidebar`/`.content`, not just this feature) · Priority: P4.
