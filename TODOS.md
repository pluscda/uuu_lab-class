# TODOS

Deferred work items, written down so they exist. Format: what / why / context / effort / priority.

## Course

- [ ] **Course list row print button** — quick 列印傳單 access from `/courses` list rows without opening the detail page first.
  - Why: saves one click for salespeople printing several flyers in a row.
  - Context: deferred by /autoplan CEO review (2026-07-15, decision #5) of the course-flyer plan. The flyer route `/courses/:id/flyer` exists after that feature ships; this is just an icon button in the list's row actions navigating to it.
  - Effort: S (human ~1h / CC ~10min) · Priority: P3 · Depends on: course-flyer feature shipped.
