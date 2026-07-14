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
- Excluded for now: copy endpoint, QR code, print-PDF, child sub-panels

## Lookup APIs (`/api/lookups/...`)

- app-users
- app-roles
- publish-statuses
- partners
- course-groups
- certifications (RTRIM on nchar Title)
- job-categories
- courses

## Sidebar Groups

- 系統管理 Admin: AppUser, AppRole, PublishStatus
- 課程管理 Course: Course, Partner, CourseGroup

## Testing

- Backend: 67 tests · Frontend: 123 tests — all passing

## Not Yet Implemented

Remaining modules

- SysConfig (`admin`)
- Certification, JobCategory, LinkDefinition, TrainingCenter (`course`)
- Child tables: CourseFAQ, CourseRelatedLink, CourseRecomm, HotCourse, PartnerCourseGroup (`course`)
- All entities under `promotion`

Deferred Course features

- Copy endpoint (`POST /api/courses/{id}/copy`)
- Course detail QR code, 列印PDF
- Primary-Foreign link buttons (parent pages → child lists) once child modules exist
