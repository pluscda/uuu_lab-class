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
- `POST /api/app-users/{id}/reset-password` re-applies the default and sets `PasswordUpdatedTime = GETUTCDATE()` — **Admin-only** (`[Authorize(Roles = "Admin")]` on top of the FallbackPolicy: non-Admin token → 403, never 401, so the interceptor doesn't force-logout). Controller reads the plain default via `IAppUserRepository.GetDefaultPasswordAsync()` and hands the repo the SHA-256 uppercase-hex hash (`ResetPasswordAsync(userId, passwordHash)`) — testable without a DB (`AppUserResetPasswordTests`). Request carries only the UserId (URL), response is 204 — no password/hash ever crosses the wire
- 重設密碼 button on the detail page AND edit form — both rendered only when `AuthService.isAdmin()` (confirm dialog before reset)

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
- Global `FallbackPolicy` (RequireAuthenticatedUser) protects every controller; only the `Login` action is `[AllowAnonymous]` (action-level, NOT class-level — a class-level attribute would also unprotect `PUT /api/auth/profile`) → no token = 401 everywhere else
- `public partial class Program` exposed for `WebApplicationFactory<Program>` integration tests (`JwtAuthorizationTests` — 401 without/with-bad token, 200 with valid/login-issued token, login stays anonymous; repos mocked, no DB)
- Frontend: Login page `/login` (public); profile `{ userId, userName, accessToken }` in **session** storage key `auth-profile` (`AuthService`, signal-based)
- `authInterceptor` attaches `Authorization: Bearer`; any 401 (except from `/auth/login` itself) → clear session + redirect `/login`
- `authGuard` (`canActivateChild` on the shell parent route in `app.routes.ts`) blocks all app routes without a token
- Shell: topbar shows UserName + 登出 button; logged-out state renders bare `<router-outlet>` (no sidebar/topbar)
- Roles come from the token's `role` claim(s) decoded client-side (array OR single string — single-role users get a plain string); `系統管理 Admin` sidebar group renders only when roles include `Admin`

✅ **My Profile** (`auth`) — `/profile` page + `PUT /api/auth/profile`

- Endpoint updates **UserName only** for the user identified by the JWT (`userId` claim, falling back to `NameIdentifier`/`sub`) — a `userId` or roles in the body have no DTO property and are ignored; 400 on empty/whitespace UserName (trimmed before save), 404 if the user no longer exists
- Returns `{ userId, userName }`; `AuthService.updateUserName()` PUTs and patches the `auth-profile` session-storage profile + signal, so the topbar name refreshes without re-login
- Page (`features/profile/my-profile`, no route params): UserId + role tags read-only display, UserName the only editable field; topbar user name/avatar is the link (`.profile-link` → `/profile`)

✅ **Change Password** (`auth`) — My Profile card + `POST /api/auth/change-password`

- Target UserId comes ONLY from the JWT; body `{ currentPassword, newPassword, confirmNewPassword }` — plain passwords only, hashes never cross the wire in either direction
- Verify + update is ONE atomic SQL statement (`IAuthRepository.ChangePasswordAsync`): `UPDATE ... SET PasswordHash = SHA256(new), PasswordUpdatedTime = GETUTCDATE() WHERE UserId AND IsActive = 1 AND PasswordHash = SHA256(current)`; 0 rows → 400 目前密碼不正確 — a wrong current password changes nothing
- Complexity rule (server + mirrored client validator): length ≥ 8 AND ≥ 3 of 4 classes (uppercase / lowercase / digit / anything-else-counts-as-symbol); rejection message is the bilingual 密碼長度至少需 8 碼… text; new/confirm mismatch → 400 新密碼與確認新密碼不一致
- ⚠️ Validation failures return **400, never 401** — the Angular interceptor treats any 401 as session-expired and force-logs-out
- Frontend: second card on `/profile` with its own `passwordForm` (`passwordComplexity` + group-level `passwordsMatch` validators, errors shown per-field); success toast + form reset; server 400 message surfaced via toast; `AuthService.changePassword()` leaves the stored profile/token untouched (session stays valid)

✅ **Global exception handling** (cross-cutting) — `Middleware/ExceptionHandlingMiddleware.cs` + interceptor toast

- Backend: `ExceptionHandlingMiddleware` registered FIRST in the pipeline (before Swagger/CORS/auth) catches any exception escaping controllers/repositories, logs it in full (`ILogger.LogError` — message + stack trace) and returns **500** with the one safe JSON body `{ "message": "An unexpected error occurred." }` (`ExceptionHandlingMiddleware.GenericMessage`) — never the exception type, stack trace, SQL text, or connection details. If the response already started it rethrows (can't rewrite headers)
- Deliberate responses are untouched: 401/403 come from the auth middleware as status codes, 400 validation from `[ApiController]` model binding, 404/409 from controllers — none are exceptions, so they pass through unchanged (`ExceptionHandlingTests`, 4 tests: throwing repo → generic 500 with nothing sensitive in the body; 401/403/400 unchanged)
- Frontend: `authInterceptor` now also toasts on **any 5xx** — `MessageService.add` with the body's safe `message` (fallback 系統發生錯誤，請稍後再試。), summary 系統錯誤; error still propagates to the caller. 401 logout/redirect and form-level 400/409 handling unchanged. ⚠️ Interceptor specs (and any spec exercising a 5xx flush through the interceptor) must provide `MessageService`

✅ **RowAudit writer** (cross-cutting, backend only) — `Services/RowAuditWriter.cs`

- `IRowAuditWriter` (Scoped, registered in Program.cs with `AddHttpContextAccessor`): generic `LogInsertAsync` / `LogUpdateAsync` / `LogDeleteAsync` insert ONE `RowAudit` row per call via Dapper — reflection-based, works for any entity
- UserName from the JWT `userName` claim (fallback `Identity.Name`, then `"system"` when unauthenticated); PrimaryKeyValues = the entity's `pkid` (found by reflection, case-insensitive)
- ActionDesc: Insert/Delete = value of the FIRST string property in declaration order; Update = `", "`-joined names of changed properties (strings + value types only — nav objects/ID lists excluded, they'd always diff by reference); no-op update writes NO row; truncated at 1000 chars
- Dapper insert isolated in `protected virtual InsertAsync` so unit tests capture rows without a DB (`RowAuditWriterTests`, 7 tests)
- **Wired into all 7 CRUD repositories** (AppRole, AppUser, PublishStatus, Partner, CourseGroup, Course, FeaturedPromoItem): Create → re-select the new row + `LogInsertAsync`; Update → select before, apply, select after, `LogUpdateAsync` (accurate changed-column list); Delete → select first, delete, `LogDeleteAsync` — always only after the change succeeded
- Log methods take optional `IDbConnection`/`IDbTransaction` so the audit row shares the operation's connection/transaction — a rolled-back transactional change (AppRole/AppUser/Course/MoveSlot) leaves no audit row
- Repos with pseudo-columns use a lean `AuditSelectSql` of real table columns only (no `UserCount`/`RoleCount` subqueries, no JOINed labels like `PartnerName`/`PromoCode`) so update diffs list only real columns; consequence: an update that only changes N-N links (role/user assignment, Course certifications/job categories) writes NO audit row (ID lists are excluded from the diff by design)
- Also audited: `AppUserRepository.ResetPasswordAsync` (Update row, diff = `PasswordUpdatedTime` — hash never audited) and `FeaturedPromoItemRepository.MoveSlotAsync` (one Update row per moved item, incl. the swap occupant)
- NOT audited (out of scope: not a CRUD repository): `AuthRepository` profile-UserName update and change-password
- `PublishStatusRepositoryAuditTests` (7 tests) run the real repo + real writer against in-memory SQLite (shared-cache) proving Insert/Update/Delete audit rows, exact changed-column lists, and that failed/no-op changes write no row; test project gained `Microsoft.Data.Sqlite`

✅ **RowAudit viewer** (cross-cutting) — `GET /api/rowaudit?tableName=X&pkid=N` + `RowAuditBadgeComponent`

- Endpoint (`RowAuditController` → `IRowAuditRepository`): filters `TableName = @tableName AND PrimaryKeyValues = @pkid` (string compare — PrimaryKeyValues is nvarchar), newest first (`[DateTime] DESC, pkid DESC` tie-break); returns slim `RowAuditEntry` rows (DateTime, UserName, ActionType, ActionDesc — `COALESCE(ActionDesc,'')` since the column is nullable); 400 if either query param missing. Route is `/api/rowaudit` (singular — matches the table, not a CRUD entity)
- `RowAuditRepositoryTests` run the real SQL on in-memory SQLite (filter, ordering, tie-break, null ActionDesc, empty); `RowAuditControllerTests` cover pass-through + 400s
- Frontend: `shared/row-audit-badge/` `RowAuditBadgeComponent` (standalone; inputs `tableName`, `pkid`) + `RowAuditService`/`row-audit.model.ts`. Pill button "異動紀錄 History" shows the LATEST change inline ("Update by alice · 2026-06-04 14:30") or "尚無紀錄 No history"; click opens a p-dialog (appendTo body) with the full trail in a p-table (time/user/action-tag/desc) or a "尚無異動紀錄 No history yet" empty state; fetch errors degrade silently to the no-history state. DateTime is rendered WITHOUT appending 'Z' — RowAuditWriter stores local `DateTime.Now`, unlike the UTC fields
- Placed in the `.page-toolbar` start (inside `.page-title`) of all 6 detail pages and all 6 form pages (edit mode only — create has no pkid; guard is `pkid() !== null` because PublishStatus pkid 0 is valid). String-PK forms (AppRole/AppUser) set the badge's int pkid from the loaded record, not the route id. FeaturedPromoItem board excluded (custom board, no detail/form pages)
- ⚠️ Page specs: the badge's GET fires inside the pages' change detection, so every detail/form spec flushes `/rowaudit` before `httpMock.verify()` (detail specs in `afterEach`; form specs via a `flushAuditAndVerify` helper replacing inline `verify()` calls)

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

- Backend: 160 tests · Frontend: 214 tests — all passing

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
