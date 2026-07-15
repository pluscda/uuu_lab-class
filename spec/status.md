# Project Status

Update this file when a module is completed or deferred work changes.

## Completed

✅ **AppRole** CRUD (`auth`) — List / View / Add / Edit / Delete / User Assignment

- String PK `RoleId` (immutable on edit), `pkid` int IDENTITY surrogate
- N-N to AppUser via `AppUserRole`; request carries `UserIds : List<string>`
- Verified against the live database

✅ **AppUser** CRUD (`auth`) — spec: `spec/auth/AppUser.md`

- String PK `UserId` (immutable on edit), `pkid` IDENTITY, N-N to AppRole via `AppUserRole` (`RoleIds`)
- PasswordHash is backend-only: never in requests/responses/Angular models; SELECTs never include it
- CREATE seeds PasswordHash from SysConfig `appConfig` JSON `defaultPassword` (SHA-256 uppercase hex); UPDATE never touches it
- `POST /api/app-users/{id}/reset-password` re-applies the default and sets `PasswordUpdatedTime = GETUTCDATE()` (detail-page 重設密碼 button)

✅ **PublishStatus** CRUD (`admin`) — spec: `spec/admin/PublishStatus.md`

- Manual tinyint PK (no IDENTITY): pkid entered on create, immutable on edit, POST → 409 on duplicate

✅ **Partner** CRUD (`course`) — spec: `spec/course/Partner.md`

✅ **CourseGroup** CRUD (`course`) — spec: `spec/course/CourseGroup.md`

- ⚠️ `FK_Course_CourseGroup` is ON DELETE CASCADE — deleting a group deletes its courses

✅ **Course** CRUD (`course`) — spec: `spec/course/Course.md`

- FK labels resolved by JOIN (`PartnerName`, `CourseGroupDescription`, `PublishStatusDescription`)
- N-N: `CourseInCertification`, `CourseJobCategories` (delete-then-reinsert, transactional)
- ScheduleOff auto-defaults to ScheduleOn + 10 years in the form
- Excluded for now: copy endpoint, print-PDF, child sub-panels
- Detail page QR code (基本資料): encodes `https://www.uuu.com.tw/Course/Show/{pkid}/{CourseId}`, caption = CourseId, downloadable as `{CourseId}.png`; generated client-side via `QrCodeService` (`core/services/qr-code.service.ts`, wraps npm `qrcode` — allow-listed in `angular.json` `allowedCommonJsDependencies`)
- List page in-place editing: double-click a cell (single click ignored; pkid/原廠/課程群組 read-only), commit on blur (dropdown/checkbox on change, datepicker on select + deferred blur). Commit flow is GET-by-id → patch field → PUT — required because PUT delete-then-reinserts N-N links and list rows carry empty ID lists. Validation inline (required, non-negative numbers, valid dates, 上架日期 ≤ 下架日期); failed save reverts and toasts

✅ **FeaturedPromoItem** custom weekly board (`promotion`) — spec: `spec/custom/FeaturedPromoItem/FeaturedPromoItem.spec.md`

- Single custom page (`/featured-promo-items`, `FeaturedPromoBoard`) — no detail/form routes; inline Edit/New form per slot
- Board: TrainingCenter tabs (`p-tabs`) × one-week Mon–Sun sections × 3 slots/day; week nav shifts the ScheduleOn range by 7 days
- Unique key `(ScheduleOn, TrainingCenter_pkid, Slot)` — POST → 409 when the slot is taken
- `POST /api/featured-promo-items/{id}/move` body `{ direction: ±1 }` — swaps with the target slot's occupant transactionally (temp Slot 0 dodges the unique index)
- PromoCode resolved via `p-autocomplete` against `/api/lookups/promotions?keyword=`; picking a suggestion pre-fills Topic/Description; a typed-only code is resolved (exact match) on save
- Copy/Paste is client-side clipboard state: Paste opens the New form pre-filled
- `date.util.ts` gained `addDays` / `startOfWeek` (Monday-based)

## Lookup APIs (`/api/lookups/...`)

- app-users
- app-roles
- publish-statuses
- partners
- course-groups
- certifications (RTRIM on nchar Title)
- job-categories
- courses
- training-centers
- promotions (optional `?keyword=` LIKE-filter on PromoCode)

## Sidebar Groups

- 首頁 Home: FeaturedPromoItem (上稿作業)
- 系統管理 Admin: AppUser, AppRole, PublishStatus
- 課程管理 Course: Course, Partner, CourseGroup

## Testing

- Backend: 83 tests · Frontend: 162 tests — all passing

## Not Yet Implemented

Remaining modules

- SysConfig (`admin`)
- Certification, JobCategory, LinkDefinition, TrainingCenter (`course`)
- Child tables: CourseFAQ, CourseRelatedLink, CourseRecomm, HotCourse, PartnerCourseGroup (`course`)
- Remaining `promotion` entities: Promotion2, Seminar (FeaturedPromoItem done)

Deferred Course features

- Copy endpoint (`POST /api/courses/{id}/copy`)
- 列印PDF (QR code done)
- Primary-Foreign link buttons (parent pages → child lists) once child modules exist
