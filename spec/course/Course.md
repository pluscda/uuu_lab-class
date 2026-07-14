# Build Spec for Course
- database schema: `.\database\course.sql`

## Summary

`Course` is the central entity of the system, representing a training course offered by a partner. It carries full descriptive content (objectives, outline, prerequisites), scheduling dates, pricing, and display metadata. It links to `Partner`, `CourseGroup` (nullable), and `PublishStatus` as foreign keys, and has N-N relationships with `Certification` and `JobCategory`. Several other entities (CourseFAQ, CourseRelatedLink, CourseRecomm, HotCourse) reference Course as their parent.

| Item | Detail |
|------|--------|
| Primary Key | `pkid` int IDENTITY |
| Foreign Keys | `Partner_pkid` → `Partner.pkid`, `CourseGroup_pkid` → `CourseGroup.pkid` (nullable), `PublishStatus_pkid` → `PublishStatus.pkid` |
| Required Fields | `Title`, `CourseId`, `ProdCourseId`, `FriendlyUrl`, `DisplayOrder`, `Partner_pkid`, `PublishStatus_pkid`, `ScheduleOn`, `ScheduleOff`, `Hour`, `ListPrice`, `LearningCredit`, `CanRepeat` |
| N-N Relationships | `CourseInCertification` (Course ↔ Certification), `CourseJobCategories` (Course ↔ JobCategory) |
| Primary-Foreign Links | CourseFAQ, CourseRelatedLink, CourseRecomm, HotCourse reference Course — none implemented yet |
| Query Filters | keyword (Title, OfficialTitle, CourseId, ProdCourseId, FriendlyUrl), PartnerPkid, CourseGroupPkid, PublishStatusPkid, ScheduleOn range, ScheduleOff range, CanRepeat |
| Default Sort | `CourseId ASC` |

---

## Localization

### Chinese Table Name

- Course: 課程
- Description: 訓練課程主資料

### Chinese Column Names

(User-supplied hints take precedence.)

- pkid: 主代碼
- DisplayOrder: 顯示順序
- CourseId: 簡介代碼
- ProdCourseId: 科目代碼
- Title: 課程名稱
- OfficialTitle: 官方課程名稱
- FriendlyUrl: 友善網址
- Partner_pkid: 原廠
- CourseGroup_pkid: 課程群組
- PublishStatus_pkid: 上架狀態
- ScheduleOn: 上架日期
- ScheduleOff: 下架日期
- Hour: 時數
- ListPrice: 定價
- LearningCredit: 點數
- Material: 教材
- Objective: 課程目標
- Target: 適合對象
- Prerequisites: 先備知識
- Outline: 課程大綱
- TowardCertOrExam: 考試／認證說明
- Note: 備註
- OtherInfo: 其他資訊
- CanRepeat: 允許重聽
- (N-N) Certifications: 對應認證
- (N-N) JobCategories: 職務類別

---

## Required Fields

Required (NOT NULL, excluding IDENTITY PK):

- `Title` nvarchar(200)
- `CourseId` varchar(50)
- `ProdCourseId` varchar(50)
- `FriendlyUrl` nvarchar(100)
- `DisplayOrder` int
- `Partner_pkid` smallint
- `PublishStatus_pkid` tinyint
- `ScheduleOn` date
- `ScheduleOff` date
- `Hour` smallint (DB default 0)
- `ListPrice` decimal(9,0) (DB default 0)
- `LearningCredit` decimal(9,1) (DB default 0)
- `CanRepeat` bit (DB default 0)

Optional (nullable): `OfficialTitle`, `CourseGroup_pkid`, `Material`, `Objective`, `Target`, `Prerequisites`, `Outline`, `TowardCertOrExam`, `Note`, `OtherInfo`.

---

## Foreign Keys

Per user hint, list/detail resolve FK labels **by JOIN in the SELECT** (not frontend lookup binding).

- **Partner_pkid** → `Partner.pkid` (NOT NULL)
  - Alias `Partner_pkid AS PartnerPkid`; JOIN label `p.Name AS PartnerName`
  - Lookup: `GET /api/lookups/partners` (exists) — label `Name`, order `DisplayOrder ASC`

- **CourseGroup_pkid** → `CourseGroup.pkid` (nullable — allow null / 無 option, `showClear`)
  - Alias `CourseGroup_pkid AS CourseGroupPkid`; LEFT JOIN label `g.Description AS CourseGroupDescription`
  - Lookup: `GET /api/lookups/course-groups` (exists) — label `Description`, order `pkid ASC`

- **PublishStatus_pkid** → `PublishStatus.pkid` (NOT NULL)
  - Alias `PublishStatus_pkid AS PublishStatusPkid`; JOIN label `s.Description AS PublishStatusDescription`
  - Lookup: `GET /api/lookups/publish-statuses` (exists) — label `Description`, order `pkid ASC`

---

## Foreign-Primary Links

- **Partner_pkid** → `/partners/{partnerPkid}` (partner-detail exists — render link)
- **CourseGroup_pkid** → `/course-groups/{courseGroupPkid}` (course-group-detail exists — render link, only when not null)
- **PublishStatus_pkid** → `/publish-statuses/{publishStatusPkid}` (publish-status-detail exists — render link)

All three target modules are implemented, so detail-page label values link to the corresponding detail pages.

---

## Primary-Foreign Links

Tables referencing `Course.pkid` (or `Course.CourseId`):

- **CourseFAQ** (`Course_pkid`) — 對應課程問答, `/course-faqs?coursePkid={pkid}` — ⚠️ not implemented
- **CourseRelatedLink** (`Course_pkid`) — 對應相關連結, `/course-related-links?coursePkid={pkid}` — ⚠️ not implemented
- **HotCourse** (`Course_pkid`) — 對應熱門課程, `/hot-courses?coursePkid={pkid}` — ⚠️ not implemented
- **CourseRecomm** (`CourseId` string key) — 對應推薦課程 — ⚠️ not implemented

For the current build: omit all of these link buttons; revisit as each child module is generated.

---

## N-N Relationships

### CourseInCertification — Course ↔ Certification

Junction table: `CourseInCertification` (`Course_pkid`, `Certification_pkid`) — pure junction (composite PK, no payload).

- Form (edit + new): `p-multiselect`, options via `GET /api/lookups/certifications` (**new**)
  - Option label = `Title` (⚠️ `nchar(100)` — **RTRIM()** in SQL), ordered by `Partner_pkid ASC, Title ASC`
- Request field: `CertificationPkids: List<int>`
- Sync on save: `DELETE FROM CourseInCertification WHERE Course_pkid = @Pkid` then bulk INSERT
- Populated on GET by id only; detail view shows certification titles (from the lookup)

### CourseJobCategories — Course ↔ JobCategory

Junction table: `CourseJobCategories` (`Course_pkid`, `JobCategory_pkid`) — pure junction.

- Form (edit + new): `p-multiselect`, options via `GET /api/lookups/job-categories` (**new**)
  - Option label = `Description`, ordered by `pkid ASC`
- Request field: `JobCategoryPkids: List<short>`
- Sync on save: delete-then-reinsert (same pattern)
- Populated on GET by id only; detail view shows job category descriptions

---

## Query Filters

- **keyword**: string — LIKE on `Title`, `OfficialTitle`, `CourseId`, `ProdCourseId`, `FriendlyUrl`
  (large text columns excluded)
- **PartnerPkid**: short? — exact match; dropdown via `/api/lookups/partners`
- **CourseGroupPkid**: short? — exact match; dropdown via `/api/lookups/course-groups`
- **PublishStatusPkid**: byte? — exact match; dropdown via `/api/lookups/publish-statuses`
- **ScheduleOn range**: `ScheduleOnFrom` / `ScheduleOnTo` (DateOnly?, inclusive)
- **ScheduleOff range**: `ScheduleOffFrom` / `ScheduleOffTo` (DateOnly?, inclusive)
- **CanRepeat**: bool? — tri-state (全部/是/否)

---

## Lookup Endpoints Required

| Route | Status | Returns |
|-------|--------|---------|
| `GET /api/lookups/partners` | Exists | `{ pkid, name }[]` |
| `GET /api/lookups/course-groups` | Exists | `{ pkid, description }[]` |
| `GET /api/lookups/publish-statuses` | Exists | `{ pkid, description }[]` |
| `GET /api/lookups/certifications` | **New** | `{ pkid, partnerPkid, title }[]` — `RTRIM(Title)`, order `Partner_pkid, Title` |
| `GET /api/lookups/job-categories` | **New** | `{ pkid, description }[]` order `pkid ASC` |
| `GET /api/lookups/courses` | **New** | `{ pkid, courseId, title }[]` order `CourseId ASC` — Course is itself an FK target for future child modules |

---

## API Endpoints

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/api/courses` | List all (JOINed labels), `ORDER BY CourseId ASC` |
| `POST` | `/api/courses/query` | Filtered query (body: `CourseQuery`) |
| `GET` | `/api/courses/{id}` | Get by pkid — includes `CertificationPkids` + `JobCategoryPkids` |
| `POST` | `/api/courses` | Create (transaction: insert + junction inserts), returns `{ pkid }` |
| `PUT` | `/api/courses` | Update (transaction: update + delete-reinsert junctions) |
| `DELETE` | `/api/courses/{id}` | Delete (transaction: junction deletes + course delete) |

> The legacy sample spec also describes `POST /api/courses/{id}/copy`, an inline QR code, and 列印PDF. These are **excluded from this build** (future enhancements) to keep scope at standard CRUD.

No auth exceptions.

---

## Backend Notes

### Models

```csharp
public class Course
{
    public int Pkid { get; set; }
    public string Title { get; set; }
    public string? OfficialTitle { get; set; }
    public string CourseId { get; set; }
    public string ProdCourseId { get; set; }
    public string FriendlyUrl { get; set; }
    public int DisplayOrder { get; set; }
    public short PartnerPkid { get; set; }
    public short? CourseGroupPkid { get; set; }
    public byte PublishStatusPkid { get; set; }
    public DateOnly ScheduleOn { get; set; }
    public DateOnly ScheduleOff { get; set; }
    public short Hour { get; set; }
    public decimal ListPrice { get; set; }
    public decimal LearningCredit { get; set; }
    public string? Material { get; set; }
    public string? Objective { get; set; }
    public string? Target { get; set; }
    public string? Prerequisites { get; set; }
    public string? Outline { get; set; }
    public string? TowardCertOrExam { get; set; }
    public string? Note { get; set; }
    public string? OtherInfo { get; set; }
    public bool CanRepeat { get; set; }
    // JOINed labels (read-only, per user hint: resolve FK columns by JOIN)
    public string PartnerName { get; set; }
    public string? CourseGroupDescription { get; set; }
    public string PublishStatusDescription { get; set; }
    // Populated on GET by pkid:
    public List<int> CertificationPkids { get; set; } = [];
    public List<short> JobCategoryPkids { get; set; } = [];
}
```

`CourseRequest` — same scalar fields (Pkid for update; `[Required]`/`[MaxLength]` annotations) plus `CertificationPkids` and `JobCategoryPkids`. No JOINed label fields.

`CourseQuery` — `Keyword`, `PartnerPkid?`, `CourseGroupPkid?`, `PublishStatusPkid?`, `ScheduleOnFrom/To`, `ScheduleOffFrom/To`, `CanRepeat?`.

### SQL — SELECT (with JOINs)

```sql
SELECT c.pkid, c.Title, c.OfficialTitle, c.CourseId, c.ProdCourseId, c.FriendlyUrl,
       c.DisplayOrder, c.Partner_pkid AS PartnerPkid, c.CourseGroup_pkid AS CourseGroupPkid,
       c.PublishStatus_pkid AS PublishStatusPkid, c.ScheduleOn, c.ScheduleOff,
       c.Hour, c.ListPrice, c.LearningCredit, c.Material, c.Objective, c.Target,
       c.Prerequisites, c.Outline, c.TowardCertOrExam, c.Note, c.OtherInfo, c.CanRepeat,
       p.Name AS PartnerName,
       g.Description AS CourseGroupDescription,
       s.Description AS PublishStatusDescription
FROM Course c
JOIN Partner p ON p.pkid = c.Partner_pkid
LEFT JOIN CourseGroup g ON g.pkid = c.CourseGroup_pkid
JOIN PublishStatus s ON s.pkid = c.PublishStatus_pkid
```

### SQL — INSERT

All writable columns except IDENTITY pkid; `SELECT CAST(SCOPE_IDENTITY() AS int)` at the end. Junction inserts follow within the same transaction.

### SQL — UPDATE

All writable columns, `WHERE pkid = @Pkid`; then delete-reinsert both junction tables within the same transaction.

### SQL — DELETE

Within a transaction: `DELETE FROM CourseInCertification`, `DELETE FROM CourseJobCategories`, then `DELETE FROM Course` (junction FKs are CASCADE but explicit deletes match the project convention).

### N-N Sync Pattern

```sql
DELETE FROM CourseInCertification WHERE Course_pkid = @Pkid;
-- bulk INSERT (Course_pkid, Certification_pkid) from CertificationPkids
DELETE FROM CourseJobCategories WHERE Course_pkid = @Pkid;
-- bulk INSERT (Course_pkid, JobCategory_pkid) from JobCategoryPkids
```

### Special Column Notes

- **`DateOnly`**: `ScheduleOn`/`ScheduleOff` are SQL `date` → C# `DateOnly`. Register a `DateOnlyTypeHandler` with Dapper in `Program.cs` (**new** — `Data/DateOnlyTypeHandler.cs`). System.Text.Json serializes DateOnly as `yyyy-MM-dd` natively.
- **`nchar(100)`**: `Certification.Title` requires `RTRIM()` in the certifications lookup SELECT.
- Multiple writes (course + junctions) → **transaction** (per CLAUDE.md).
- Junction FK from `CourseGroup` is `ON DELETE CASCADE` (noted in CourseGroup spec).

---

## Frontend Notes

### Angular Model

`Course` mirrors the backend (dates as ISO `string`), plus `partnerName`, `courseGroupDescription`, `publishStatusDescription`, `certificationPkids: number[]`, `jobCategoryPkids: number[]`. `CourseRequest` carries scalars + pkid lists. `CourseQuery` carries filter fields with date strings. New lookups: `CertificationLookup { pkid, partnerPkid, title }`, `JobCategoryLookup { pkid, description }`, `CourseLookup { pkid, courseId, title }`.

### date.util.ts (new)

`core/utils/date.util.ts`:
- `toIso(d: Date): string` — **local** components (`getFullYear/getMonth+1/getDate`), never `toISOString()` (UTC off-by-one for UTC+8)
- `parseIso(s: string): Date`
- `addYears(d: Date, years: number): Date`

### Routes

| Path | Component |
|------|-----------|
| `/courses` | course-list |
| `/courses/new` | course-form (before `/:id`!) |
| `/courses/:id` | course-detail |
| `/courses/:id/edit` | course-form |

### List Component

Columns (user-specified order):

| Column | Field | Notes |
|--------|-------|-------|
| 主代碼 | pkid | sortable |
| 顯示順序 | displayOrder | sortable |
| 簡介代碼 | courseId | sortable |
| 科目代碼 | prodCourseId | sortable |
| 課程名稱 | title | sortable |
| 原廠 | partnerName | JOIN-resolved, sortable |
| 課程群組 | courseGroupDescription | JOIN-resolved (may be null → —), sortable |
| 上架狀態 | publishStatusDescription | JOIN-resolved, sortable |
| 上架日期 | scheduleOn | sortable |
| 下架日期 | scheduleOff | sortable |
| 時數 | hour | sortable |
| 定價 | listPrice | sortable |
| 點數 | learningCredit | sortable |
| 允許重聽 | canRepeat | 是/否 tag |
| 操作 | — | view/edit/delete |

- Default sort: `courseId ASC`
- Wide table: wrap in horizontal scroll (`[scrollable]="true"` or overflow container)
- Filter drawer: keyword, 原廠 `p-select`, 課程群組 `p-select`, 上架狀態 `p-select` (all `appendTo="body"`, `showClear`), 上架日期起/迄 + 下架日期起/迄 `p-datepicker`, 允許重聽 tri-state select
- Lookups for the drawer dropdowns loaded via `forkJoin` on init; saved filters restored after lookups load

### Form Layout

| Field | Widget |
|-------|--------|
| 課程名稱 Title * | `input pInputText` maxlength 200 |
| 官方課程名稱 OfficialTitle | `input pInputText` maxlength 300 |
| 簡介代碼 CourseId * | `input pInputText` maxlength 50 |
| 科目代碼 ProdCourseId * | `input pInputText` maxlength 50 |
| 友善網址 FriendlyUrl * | `input pInputText` maxlength 100 |
| 顯示順序 DisplayOrder * | `p-inputnumber` |
| 原廠 PartnerPkid * | `p-select` appendTo="body" |
| 課程群組 CourseGroupPkid | `p-select` appendTo="body" showClear (無 option) |
| 上架狀態 PublishStatusPkid * | `p-select` appendTo="body" |
| 上架日期 ScheduleOn * | `p-datepicker` |
| 下架日期 ScheduleOff * | `p-datepicker` |
| 時數 Hour * | `p-inputnumber` (default 0) |
| 定價 ListPrice * | `p-inputnumber` (default 0) |
| 點數 LearningCredit * | `p-inputnumber` minFractionDigits 0 maxFractionDigits 1 (default 0) |
| 教材 Material | `textarea pTextarea` maxlength 500 |
| 課程目標 Objective | `textarea pTextarea` |
| 適合對象 Target | `textarea pTextarea` maxlength 500 |
| 先備知識 Prerequisites | `textarea pTextarea` |
| 課程大綱 Outline | `textarea pTextarea` |
| 考試／認證說明 TowardCertOrExam | `textarea pTextarea` |
| 備註 Note | `textarea pTextarea` |
| 其他資訊 OtherInfo | `textarea pTextarea` |
| 允許重聽 CanRepeat | `p-checkbox` binary |
| 對應認證 CertificationPkids | `p-multiselect` maxSelectedLabels 9999, appendTo="body", chips |
| 職務類別 JobCategoryPkids | `p-multiselect` maxSelectedLabels 9999, appendTo="body", chips |

- `forkJoin` on init: partners, course-groups, publish-statuses, certifications, job-categories (+ `getById` in edit mode)
- **ScheduleOff auto-default**: on `ScheduleOn.valueChanges`, set `ScheduleOff = ScheduleOn + 10 years` (`addYears`), only when the new value is a `Date`, with `{ emitEvent: false }`. In edit mode patch `ScheduleOff` after `ScheduleOn` so the loaded value wins.
- Dates converted ISO string ↔ `Date` on load/save via date.util.

### Detail Component

- Shows all fields grouped: 基本資料 (codes, names, FK labels), 排程與價格 (dates, hour, price, credit, canRepeat), 課程內容 (long-text fields), 對應認證/職務類別 (tag lists resolved via lookups).
- FK labels link to `/partners/{pkid}`, `/course-groups/{pkid}` (when set), `/publish-statuses/{pkid}`.

### Delete Confirmation Message

```
確定要刪除主代碼 <b>${item.pkid}</b>「${item.courseId}」？
```

### Session Storage Keys

| Key | Contents |
|-----|----------|
| `course-list-filters` | Last query filter values |
| `course-list-sort` | `{ sortField, sortOrder }` |
| `course-list-page` | `{ first, rows }` |

Future: accept `partnerPkid` / `courseGroupPkid` / `publishStatusPkid` query params for cross-entity navigation (deferred until parent pages render link buttons).

### Sidebar Placement

- Nav group: **課程管理 Course** (existing)
- Label: 課程 Course
- Icon: `pi pi-book`
- Route: `/courses`

---

## Tests

### Backend (CMS.API.Tests, xUnit + Moq)

`CoursesControllerTests`: GetAll 200; Query passes query + 200; GetById found (with pkid lists) / 404; Create → 201 with pkid; Update → 204 / 404; Delete → 204 / 404. Mock `ICourseRepository`.
`LookupsControllerTests`: + GetCertifications, GetJobCategories, GetCourses.

### Frontend (Karma + Jasmine)

- `course.service.spec.ts` — URL/verb per method
- `course-list.spec.ts` — init loads lookups (forkJoin) + query; filter persistence; navigation; delete flow
- `course-detail.spec.ts` — loads course + lookups via ActivatedRoute stub
- `course-form.spec.ts` — lookups loaded; required validation; POST new; PUT edit; **ScheduleOff auto-default** when ScheduleOn changes

All specs configure `provideHttpClientTesting()`, `providePrimeNG()`, `provideNoopAnimations()`.

---

## Files to Create / Modify

| # | File | Action |
|---|------|--------|
| 1 | `src/CMS.API/Models/Course.cs`, `CourseRequest.cs`, `CourseQuery.cs` | Create |
| 2 | `src/CMS.API/Models/CertificationLookup.cs`, `JobCategoryLookup.cs`, `CourseLookup.cs` | Create |
| 3 | `src/CMS.API/Data/DateOnlyTypeHandler.cs` | Create |
| 4 | `src/CMS.API/Repositories/ICourseRepository.cs`, `CourseRepository.cs` | Create |
| 5 | `src/CMS.API/Controllers/CoursesController.cs` | Create |
| 6 | `src/CMS.API/Controllers/LookupsController.cs` + lookup repo/interface | Modify — certifications, job-categories, courses |
| 7 | `src/CMS.API/Program.cs` | Modify — DI + Dapper DateOnly handler |
| 8 | `src/CMS.API.Tests/Controllers/CoursesControllerTests.cs` | Create |
| 9 | `src/CMS.API.Tests/Controllers/LookupsControllerTests.cs` | Modify |
| 10 | `src/CMS.NG/src/app/core/utils/date.util.ts` | Create |
| 11 | `src/CMS.NG/src/app/core/models/course.model.ts` | Create |
| 12 | `src/CMS.NG/src/app/core/services/course.service.ts` (+ spec) | Create |
| 13 | `src/CMS.NG/src/app/core/services/lookup.service.ts` (+ spec) | Modify — 3 new lookups |
| 14 | `src/CMS.NG/src/app/features/courses/course-list|detail|form/` (12 files) | Create |
| 15 | `src/CMS.NG/src/app/app.routes.ts` | Modify |
| 16 | `src/CMS.NG/src/app/app.ts` | Modify — 課程 Course entry |
