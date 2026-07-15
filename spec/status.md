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

✅ **Login API** (`auth`) — `POST /api/auth/login` (`AuthController`)

- Body `{ userId, password }`; checks AppUser: exact UserId + `IsActive = 1` + `PasswordHash = SHA256(password)` (uppercase hex) in one SQL WHERE — any failure → 401 with generic `Invalid credentials.` (never reveals which check failed)
- Success → `{ userId, userName, accessToken }`; PasswordHash never returned
- JWT (HS256, 24 h expiry) signed with `symmetricSecurityKey` from SysConfig `appConfig` JSON, read at runtime (`IAuthRepository.GetSymmetricSecurityKeyAsync`)
- Claims: `sub` + `userId`, `userName`, one `role` claim per AppUserRole RoleId (short `role` type — long `ClaimTypes.Role` URI is NOT auto-mapped when constructing `JwtSecurityToken` directly)
- Package: `System.IdentityModel.Tokens.Jwt` 8.19.2

✅ **JWT authorization end-to-end** (`auth`)

- Backend: JWT bearer validation (`Microsoft.AspNetCore.Authentication.JwtBearer` 9.0.7); validation key = same SysConfig `symmetricSecurityKey`, resolved lazily via `IssuerSigningKeyResolver` (scoped `IAuthRepository`, cached after first fetch — DB is NOT hit at startup)
- Global `FallbackPolicy` (RequireAuthenticatedUser) protects every controller; only `AuthController` is `[AllowAnonymous]` → no token = 401 everywhere else
- `public partial class Program` exposed for `WebApplicationFactory<Program>` integration tests (`JwtAuthorizationTests` — 401 without/with-bad token, 200 with valid/login-issued token, login stays anonymous; repos mocked, no DB)
- Frontend: Login page `/login` (public); profile `{ userId, userName, accessToken }` in **session** storage key `auth-profile` (`AuthService`, signal-based)
- `authInterceptor` attaches `Authorization: Bearer`; any 401 (except from `/auth/login` itself) → clear session + redirect `/login`
- `authGuard` (`canActivateChild` on the shell parent route in `app.routes.ts`) blocks all app routes without a token
- Shell: topbar shows UserName + 登出 button; logged-out state renders bare `<router-outlet>` (no sidebar/topbar)
- Roles come from the token's `role` claim(s) decoded client-side (array OR single string — single-role users get a plain string); `系統管理 Admin` sidebar group renders only when roles include `Admin`

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

- Backend: 97 tests · Frontend: 184 tests — all passing

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
