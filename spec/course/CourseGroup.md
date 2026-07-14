# Build Spec for CourseGroup
- database schema: `.\database\course.sql`

## Summary

`CourseGroup` is a small category table grouping courses into named groups. It has only an IDENTITY key and a description. It is the FK target of `Course.CourseGroup_pkid` (nullable, **ON DELETE CASCADE**) and `PartnerCourseGroup.CourseGroup_pkid`, so a lookup endpoint is required.

| Item | Detail |
|------|--------|
| Primary Key | `pkid` **smallint IDENTITY** |
| Foreign Keys | None |
| Required Fields | `Description` |
| N-N Relationships | N/A — `PartnerCourseGroup` has payload columns (`DisplayOrder`, `Description`), so it is a child entity, not a pure junction |
| Primary-Foreign Links | `Course.CourseGroup_pkid` (ON DELETE CASCADE), `PartnerCourseGroup.CourseGroup_pkid` — both modules not yet implemented |
| Query Filters | keyword (Description) |
| Default Sort | `pkid ASC` |

> ⚠️ `FK_Course_CourseGroup` is declared **ON DELETE CASCADE** — deleting a CourseGroup silently deletes all Courses in it. The delete confirmation should warn about this once the Course module exists; for now the standard confirmation is used.

---

## Localization

### Chinese Table Name

- CourseGroup: 課程群組
- Description: 課程分類群組

### Chinese Column Names

- pkid: 主代碼
- Description: 群組說明

---

## Required Fields

Required (NOT NULL, excluding IDENTITY PK):

- `Description` NOT NULL (nvarchar(100))

Optional (nullable): none.

---

## Foreign Keys

`CourseGroup` has no foreign key columns.

**N/A**

---

## Foreign-Primary Links

`CourseGroup` has no foreign key columns.

**N/A**

---

## Primary-Foreign Links

The following tables reference `CourseGroup.pkid` as a foreign key:

- **Course** (`CourseGroup_pkid`, nullable, ON DELETE CASCADE)
  - Column header: 對應課程
  - Button label: 查看課程 (icon: `pi pi-book`)
  - Link target: `/courses?courseGroupPkid={pkid}`
  - Query param: `courseGroupPkid`
  - ⚠️ Course module is **not yet implemented** — do NOT render this link button yet.

- **PartnerCourseGroup** (`CourseGroup_pkid`)
  - Column header: 對應廠商課程群組
  - Button label: 查看課程群組 (icon: `pi pi-sitemap`)
  - Link target: `/partner-course-groups?courseGroupPkid={pkid}`
  - Query param: `courseGroupPkid`
  - ⚠️ PartnerCourseGroup module is **not yet implemented** — same as above.

For the current build: omit these link buttons.

---

## N-N Relationships

`PartnerCourseGroup` (Partner ↔ CourseGroup) is NOT treated as N-N: it has its own `pkid` IDENTITY plus payload columns `DisplayOrder` and `Description`, so it is a standalone child entity with its own CRUD (future module).

**N/A**

---

## Query Filters

- **keyword**: string
  - LIKE on `Description` (the sole string column)

No FK filters, no bool filters, no date-range filters.

---

## Lookup Endpoints Required

`CourseGroup` is an FK target (Course, PartnerCourseGroup), so it needs a lookup endpoint:

| Route | Status | Returns |
|-------|--------|---------|
| `GET /api/lookups/course-groups` | **New** | `{ pkid, description }[]` ordered by `pkid ASC` |

No lookups are consumed by this feature's own form (no FKs).

---

## API Endpoints

Standard CRUD:

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/api/course-groups` | List all, `ORDER BY pkid ASC` |
| `POST` | `/api/course-groups/query` | Filtered query (body: `CourseGroupQuery`) |
| `GET` | `/api/course-groups/{id}` | Get by pkid |
| `POST` | `/api/course-groups` | Create — pkid is IDENTITY, returns `{ pkid }` via `SCOPE_IDENTITY()`; no duplicate-key 409 |
| `PUT` | `/api/course-groups` | Update (pkid from body) |
| `DELETE` | `/api/course-groups/{id}` | Delete — cascades to Course rows (DB-level) |

No special endpoints. No auth exceptions.

---

## Backend Notes

### Models

```csharp
public class CourseGroup
{
    public short Pkid { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class CourseGroupRequest
{
    // IDENTITY — ignored on create; identifies the row on update
    public short Pkid { get; set; }

    [Required]
    [MaxLength(100)]
    public string Description { get; set; } = string.Empty;
}

public class CourseGroupQuery
{
    public string? Keyword { get; set; }
}
```

### SQL — SELECT

```sql
SELECT g.pkid, g.Description
FROM CourseGroup g
ORDER BY g.pkid ASC
```

Query variant appends `WHERE g.Description LIKE @Keyword` when keyword provided.

### SQL — INSERT

`pkid` is IDENTITY — excluded; return the new pkid:

```sql
INSERT INTO CourseGroup (Description)
VALUES (@Description);
SELECT CAST(SCOPE_IDENTITY() AS smallint);
```

### SQL — UPDATE

```sql
UPDATE CourseGroup
SET Description = @Description
WHERE pkid = @Pkid;
```

### N-N Sync Pattern

**N/A**

### Special Column Notes

- `pkid` smallint → C# `short`. Route param binds as `short id` directly.
- Single-table writes — no transaction needed.
- No `nchar`, no computed columns, no date/time columns, no default-value constraints.

---

## Frontend Notes

### Angular Model

```ts
export interface CourseGroup {
  pkid: number;
  description: string;
}

export interface CourseGroupRequest {
  pkid: number;
  description: string;
}

export interface CourseGroupQuery {
  keyword?: string | null;
}

export interface CourseGroupLookup {
  pkid: number;
  description: string;
}
```

### Routes

| Path | Component |
|------|-----------|
| `/course-groups` | course-group-list |
| `/course-groups/new` | course-group-form (before `/:id`!) |
| `/course-groups/:id` | course-group-detail |
| `/course-groups/:id/edit` | course-group-form |

### List Component

Columns: 主代碼 (pkid, sortable), 群組說明 (description, sortable), actions (view / edit / delete).

- Default sort: `pkid ASC`
- Filter drawer: keyword input only
- Numeric PK: no `encodeURIComponent` needed

### Form Layout

| Field | Widget | Notes |
|-------|--------|-------|
| Description 群組說明 | `input pInputText` maxlength 100 | Required |

- Reactive Forms; no lookups (no FKs) — direct `getById` in edit mode

### Delete Confirmation Message

```
確定要刪除主代碼 <b>${item.pkid}</b>「${item.description}」？
```

### Session Storage Keys

| Key | Contents |
|-----|----------|
| `course-group-list-filters` | Last query filter values |
| `course-group-list-sort` | `{ sortField, sortOrder }` |
| `course-group-list-page` | `{ first, rows }` |

No incoming cross-entity query params (child modules not built yet).

### Sidebar Placement

- Nav group: **課程管理 Course** (existing group — contains Partner)
- Label: 課程群組 CourseGroup
- Icon: `pi pi-sitemap`
- Route: `/course-groups`

### Special Form Behaviors

None. **N/A**

---

## Tests

### Backend (CMS.API.Tests, xUnit + Moq)

`CourseGroupsControllerTests`:
- `GetAll` returns 200 with list
- `Query` with keyword filter passes query object to repository, returns 200
- `GetById` found → 200 with entity; not found → 404
- `Create` → 201 (CreatedAtAction) with new pkid from repository
- `Update` existing → 204; missing → 404
- `Delete` existing → 204; missing → 404

Mock `ICourseGroupRepository`. Plus `LookupsControllerTests.GetCourseGroups_ReturnsOkWithGroups`.

### Frontend (Karma + Jasmine)

- `course-group.service.spec.ts` — assert URL + verb per method (`/api/course-groups`, `/query`, `/{id}`)
- `course-group-list.spec.ts` — renders with mocked service; filter state saved/restored via session storage; navigation; delete flow
- `course-group-detail.spec.ts` — loads record via ActivatedRoute stub `paramMap`
- `course-group-form.spec.ts` — required-field validation (empty description → no submit); POST in new mode; PUT in edit mode

All specs configure `provideHttpClientTesting()`, `providePrimeNG()`, `provideNoopAnimations()`.

---

## Files to Create / Modify

| # | File | Action |
|---|------|--------|
| 1 | `src/CMS.API/Models/CourseGroup.cs` | Create |
| 2 | `src/CMS.API/Models/CourseGroupRequest.cs` | Create |
| 3 | `src/CMS.API/Models/CourseGroupQuery.cs` | Create |
| 4 | `src/CMS.API/Models/CourseGroupLookup.cs` | Create |
| 5 | `src/CMS.API/Repositories/ICourseGroupRepository.cs` | Create |
| 6 | `src/CMS.API/Repositories/CourseGroupRepository.cs` | Create |
| 7 | `src/CMS.API/Controllers/CourseGroupsController.cs` | Create |
| 8 | `src/CMS.API/Controllers/LookupsController.cs` | Modify — add `course-groups` lookup |
| 9 | `src/CMS.API/Repositories/ILookupRepository.cs` + `LookupRepository.cs` | Modify — add `GetCourseGroupsAsync` |
| 10 | `src/CMS.API/Program.cs` | Modify — DI registration |
| 11 | `src/CMS.API.Tests/Controllers/CourseGroupsControllerTests.cs` | Create |
| 12 | `src/CMS.API.Tests/Controllers/LookupsControllerTests.cs` | Modify — course-groups lookup test |
| 13 | `src/CMS.NG/src/app/core/models/course-group.model.ts` | Create |
| 14 | `src/CMS.NG/src/app/core/services/course-group.service.ts` (+ `.spec.ts`) | Create |
| 15 | `src/CMS.NG/src/app/core/services/lookup.service.ts` (+ `.spec.ts`) | Modify — add `getCourseGroups()` |
| 16 | `src/CMS.NG/src/app/features/course-groups/course-group-list/` (4 files) | Create |
| 17 | `src/CMS.NG/src/app/features/course-groups/course-group-detail/` (4 files) | Create |
| 18 | `src/CMS.NG/src/app/features/course-groups/course-group-form/` (4 files) | Create |
| 19 | `src/CMS.NG/src/app/app.routes.ts` | Modify — lazy routes (`/new` before `/:id`) |
| 20 | `src/CMS.NG/src/app/app.ts` | Modify — sidebar entry under 課程管理 Course |
