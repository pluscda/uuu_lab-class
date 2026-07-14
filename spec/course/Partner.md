# Build Spec for Partner
- database schema: `.\database\course.sql`

## Summary

`Partner` represents a training partner/vendor whose courses are offered on the site. It carries display names for different UI surfaces (partner menu, course detail page), a short `AppKey` code, a `DisplayOrder`, and an optional logo image filename. It has no outbound foreign keys, but is the FK target of `Certification`, `Course`, and `PartnerCourseGroup`, so a lookup endpoint is required.

| Item | Detail |
|------|--------|
| Primary Key | `pkid` **smallint IDENTITY** |
| Foreign Keys | None |
| Required Fields | `Name`, `AppKey`, `NameOnPartnerMenu`, `NameOnCourseDetailPage`, `DisplayOrder` |
| N-N Relationships | N/A — `PartnerCourseGroup` has payload columns (`DisplayOrder`, `Description`), so it is a child entity, not a pure junction |
| Primary-Foreign Links | `Certification.Partner_pkid`, `Course.Partner_pkid`, `PartnerCourseGroup.Partner_pkid` — all modules not yet implemented |
| Query Filters | keyword (Name, AppKey, NameOnPartnerMenu, NameOnCourseDetailPage) |
| Default Sort | `DisplayOrder ASC` |

---

## Localization

### Chinese Table Name

- Partner: 合作廠商
- Description: 課程合作廠商主資料

### Chinese Column Names

- pkid: 主代碼
- Name: 廠商名稱
- AppKey: 關鍵字
- NameOnPartnerMenu: 選單顯示名稱
- NameOnCourseDetailPage: 課程頁顯示名稱
- DisplayOrder: 顯示順序
- ImageFilename: 圖片檔名

---

## Required Fields

Required (NOT NULL, excluding IDENTITY PK):

- `Name` NOT NULL (nvarchar(50))
- `AppKey` NOT NULL (varchar(10))
- `NameOnPartnerMenu` NOT NULL (nvarchar(200))
- `NameOnCourseDetailPage` NOT NULL (nvarchar(50))
- `DisplayOrder` NOT NULL (int)

Optional (nullable):

- `ImageFilename` (varchar(50))

---

## Foreign Keys

`Partner` has no foreign key columns.

**N/A**

---

## Foreign-Primary Links

`Partner` has no foreign key columns.

**N/A**

---

## Primary-Foreign Links

The following tables reference `Partner.pkid` as a foreign key:

- **Course** (`Partner_pkid`)
  - Column header: 對應課程
  - Button label: 查看課程 (icon: `pi pi-book`)
  - Link target: `/courses?partnerPkid={pkid}`
  - Query param: `partnerPkid`
  - ⚠️ Course module is **not yet implemented** — do NOT render this link button until the Course feature exists.

- **Certification** (`Partner_pkid`)
  - Column header: 對應認證
  - Button label: 查看認證 (icon: `pi pi-verified`)
  - Link target: `/certifications?partnerPkid={pkid}`
  - Query param: `partnerPkid`
  - ⚠️ Certification module is **not yet implemented** — same as above.

- **PartnerCourseGroup** (`Partner_pkid`)
  - Column header: 對應廠商課程群組
  - Button label: 查看課程群組 (icon: `pi pi-sitemap`)
  - Link target: `/partner-course-groups?partnerPkid={pkid}`
  - Query param: `partnerPkid`
  - ⚠️ PartnerCourseGroup module is **not yet implemented** — same as above.

For the current build: omit these link buttons. Revisit when the child modules are generated.

---

## N-N Relationships

`PartnerCourseGroup` (Partner ↔ CourseGroup) is NOT treated as N-N: it has its own `pkid` IDENTITY plus payload columns `DisplayOrder` and `Description`, so it is a standalone child entity with its own CRUD (future module).

**N/A**

---

## Query Filters

- **keyword**: string
  - LIKE on `Name`, `AppKey`, `NameOnPartnerMenu`, `NameOnCourseDetailPage`
  - `ImageFilename` excluded (not an identifying field)

No FK filters, no bool filters, no date-range filters (table has none of those column types).

---

## Lookup Endpoints Required

`Partner` is an FK target (Course, Certification, PartnerCourseGroup), so it needs a lookup endpoint:

| Route | Status | Returns |
|-------|--------|---------|
| `GET /api/lookups/partners` | **New** | `{ pkid, name }[]` ordered by `DisplayOrder ASC` |

No lookups are consumed by this feature's own form (no FKs).

---

## API Endpoints

Standard CRUD:

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/api/partners` | List all, `ORDER BY DisplayOrder ASC` |
| `POST` | `/api/partners/query` | Filtered query (body: `PartnerQuery`) |
| `GET` | `/api/partners/{id}` | Get by pkid |
| `POST` | `/api/partners` | Create — pkid is IDENTITY, returns `{ pkid }` via `SCOPE_IDENTITY()`; no duplicate-key 409 (no natural unique constraint in DB) |
| `PUT` | `/api/partners` | Update (pkid from body) |
| `DELETE` | `/api/partners/{id}` | Delete; may fail with FK violation once Course/Certification rows exist |

No special endpoints. No auth exceptions.

---

## Backend Notes

### Models

```csharp
public class Partner
{
    public short Pkid { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AppKey { get; set; } = string.Empty;
    public string NameOnPartnerMenu { get; set; } = string.Empty;
    public string NameOnCourseDetailPage { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public string? ImageFilename { get; set; }
}

public class PartnerRequest
{
    // IDENTITY — ignored on create; identifies the row on update
    public short Pkid { get; set; }

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string AppKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string NameOnPartnerMenu { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string NameOnCourseDetailPage { get; set; } = string.Empty;

    [Required]
    public int DisplayOrder { get; set; }

    [MaxLength(50)]
    public string? ImageFilename { get; set; }
}

public class PartnerQuery
{
    public string? Keyword { get; set; }
}
```

### SQL — SELECT

No FKs, no aliases needed:

```sql
SELECT p.pkid, p.Name, p.AppKey, p.NameOnPartnerMenu, p.NameOnCourseDetailPage,
       p.DisplayOrder, p.ImageFilename
FROM Partner p
ORDER BY p.DisplayOrder ASC
```

Query variant appends WHERE clause when keyword provided:
- `(p.Name LIKE @Keyword OR p.AppKey LIKE @Keyword OR p.NameOnPartnerMenu LIKE @Keyword OR p.NameOnCourseDetailPage LIKE @Keyword)`

### SQL — INSERT

`pkid` is IDENTITY — excluded; return the new pkid:

```sql
INSERT INTO Partner (Name, AppKey, NameOnPartnerMenu, NameOnCourseDetailPage, DisplayOrder, ImageFilename)
VALUES (@Name, @AppKey, @NameOnPartnerMenu, @NameOnCourseDetailPage, @DisplayOrder, @ImageFilename);
SELECT CAST(SCOPE_IDENTITY() AS smallint);
```

### SQL — UPDATE

```sql
UPDATE Partner
SET Name = @Name, AppKey = @AppKey, NameOnPartnerMenu = @NameOnPartnerMenu,
    NameOnCourseDetailPage = @NameOnCourseDetailPage, DisplayOrder = @DisplayOrder,
    ImageFilename = @ImageFilename
WHERE pkid = @Pkid;
```

### N-N Sync Pattern

**N/A**

### Special Column Notes

- `pkid` smallint → C# `short`. Route param binds as `short id` directly.
- Single-table writes — no transaction needed.
- No `nchar`, no computed columns, no `DateOnly`/`TimeOnly` columns, no default-value constraints.

---

## Frontend Notes

### Angular Model

```ts
export interface Partner {
  pkid: number;
  name: string;
  appKey: string;
  nameOnPartnerMenu: string;
  nameOnCourseDetailPage: string;
  displayOrder: number;
  imageFilename: string | null;
}

export interface PartnerRequest {
  pkid: number;
  name: string;
  appKey: string;
  nameOnPartnerMenu: string;
  nameOnCourseDetailPage: string;
  displayOrder: number;
  imageFilename: string | null;
}

export interface PartnerQuery {
  keyword?: string | null;
}

export interface PartnerLookup {
  pkid: number;
  name: string;
}
```

### Routes

| Path | Component |
|------|-----------|
| `/partners` | partner-list |
| `/partners/new` | partner-form (before `/:id`!) |
| `/partners/:id` | partner-detail |
| `/partners/:id/edit` | partner-form |

### List Component

Columns: 主代碼 (pkid, sortable), 廠商名稱 (name, sortable), 關鍵字 (appKey, sortable), 選單顯示名稱 (nameOnPartnerMenu, sortable), 顯示順序 (displayOrder, sortable), actions (view / edit / delete).

- Default sort: `displayOrder ASC`
- Filter drawer: keyword input only
- Numeric PK: no `encodeURIComponent` needed
- `nameOnCourseDetailPage` and `imageFilename` shown on detail page only (keep the list compact)

### Form Layout

| Field | Widget | Notes |
|-------|--------|-------|
| Name 廠商名稱 | `input pInputText` maxlength 50 | Required |
| AppKey 關鍵字 | `input pInputText` maxlength 10 | Required |
| NameOnPartnerMenu 選單顯示名稱 | `input pInputText` maxlength 200 | Required |
| NameOnCourseDetailPage 課程頁顯示名稱 | `input pInputText` maxlength 50 | Required |
| DisplayOrder 顯示順序 | `p-inputnumber` | Required |
| ImageFilename 圖片檔名 | `input pInputText` maxlength 50 | Optional |

- Reactive Forms; no lookups to load (no FKs) — direct `getById` in edit mode
- pkid not shown in new mode (IDENTITY); shown read-only info in edit mode is unnecessary (title shows name)

### Delete Confirmation Message

```
確定要刪除主代碼 <b>${item.pkid}</b>「${item.name}」？
```

### Session Storage Keys

| Key | Contents |
|-----|----------|
| `partner-list-filters` | Last query filter values |
| `partner-list-sort` | `{ sortField, sortOrder }` |
| `partner-list-page` | `{ first, rows }` |

No incoming cross-entity query params (child modules not built yet).

### Sidebar Placement

- Nav group: **課程管理 Course** — **new group** (does not exist yet; create with icon `pi pi-book`)
- Label: 合作廠商 Partner
- Icon: `pi pi-briefcase`
- Route: `/partners`

### Special Form Behaviors

None — no auto-defaulting, no conditional visibility, no sub-panels. **N/A**

---

## Tests

### Backend (CMS.API.Tests, xUnit + Moq)

`PartnersControllerTests`:
- `GetAll` returns 200 with list
- `Query` with keyword filter passes query object to repository, returns 200
- `GetById` found → 200 with entity; not found → 404
- `Create` → 201 (CreatedAtAction) with new pkid from repository
- `Update` existing → 204; missing → 404
- `Delete` existing → 204; missing → 404

Mock `IPartnerRepository`. Plus `LookupsControllerTests.GetPartners_ReturnsOkWithPartners`.

### Frontend (Karma + Jasmine)

- `partner.service.spec.ts` — assert URL + verb per method (`/api/partners`, `/query`, `/{id}`); numeric ID so no encode assertion needed
- `partner-list.spec.ts` — renders with mocked service; filter state saved/restored via session storage; navigation; delete flow
- `partner-detail.spec.ts` — loads record via ActivatedRoute stub `paramMap`
- `partner-form.spec.ts` — required-field validation (empty name → no submit); POST in new mode; PUT in edit mode with patched values

All specs configure `provideHttpClientTesting()`, `providePrimeNG()`, `provideNoopAnimations()`.

---

## Files to Create / Modify

| # | File | Action |
|---|------|--------|
| 1 | `src/CMS.API/Models/Partner.cs` | Create |
| 2 | `src/CMS.API/Models/PartnerRequest.cs` | Create |
| 3 | `src/CMS.API/Models/PartnerQuery.cs` | Create |
| 4 | `src/CMS.API/Models/PartnerLookup.cs` | Create |
| 5 | `src/CMS.API/Repositories/IPartnerRepository.cs` | Create |
| 6 | `src/CMS.API/Repositories/PartnerRepository.cs` | Create |
| 7 | `src/CMS.API/Controllers/PartnersController.cs` | Create |
| 8 | `src/CMS.API/Controllers/LookupsController.cs` | Modify — add `partners` lookup |
| 9 | `src/CMS.API/Repositories/ILookupRepository.cs` + `LookupRepository.cs` | Modify — add `GetPartnersAsync` |
| 10 | `src/CMS.API/Program.cs` | Modify — DI registration |
| 11 | `src/CMS.API.Tests/Controllers/PartnersControllerTests.cs` | Create |
| 12 | `src/CMS.API.Tests/Controllers/LookupsControllerTests.cs` | Modify — partners lookup test |
| 13 | `src/CMS.NG/src/app/core/models/partner.model.ts` | Create |
| 14 | `src/CMS.NG/src/app/core/services/partner.service.ts` (+ `.spec.ts`) | Create |
| 15 | `src/CMS.NG/src/app/core/services/lookup.service.ts` (+ `.spec.ts`) | Modify — add `getPartners()` |
| 16 | `src/CMS.NG/src/app/features/partners/partner-list/` (4 files) | Create |
| 17 | `src/CMS.NG/src/app/features/partners/partner-detail/` (4 files) | Create |
| 18 | `src/CMS.NG/src/app/features/partners/partner-form/` (4 files) | Create |
| 19 | `src/CMS.NG/src/app/app.routes.ts` | Modify — lazy routes (`/new` before `/:id`) |
| 20 | `src/CMS.NG/src/app/app.ts` | Modify — new sidebar group 課程管理 Course |
