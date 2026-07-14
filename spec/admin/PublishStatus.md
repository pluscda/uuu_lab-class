# Build Spec for PublishStatus
- database schema: `.\database\admin.sql`

## Summary

`PublishStatus` is a small system lookup table defining the publication states used across the CMS (draft / published / discontinued). It has a manually-assigned `tinyint` primary key (NOT an IDENTITY column) and three boolean flags describing the semantics of each status. `Course.PublishStatus_pkid` and `Promotion2.PublishStatus_pkid` both reference it as a FK target, so a lookup endpoint is required.

| Item | Detail |
|------|--------|
| Primary Key | `pkid` **tinyint NOT NULL — no IDENTITY** (manually assigned; user enters it on create; immutable on update) |
| Foreign Keys | None |
| Required Fields | `pkid`, `Description`, `IsDraft`, `IsPublished`, `IsDiscontinued` |
| N-N Relationships | N/A |
| Primary-Foreign Links | `Course.PublishStatus_pkid` (course.sql), `Promotion2.PublishStatus_pkid` (promotion.sql) — both modules not yet implemented |
| Query Filters | keyword (Description), IsDraft, IsPublished, IsDiscontinued (tri-state bools) |
| Default Sort | `pkid ASC` |

> Note: the PK constraint in the DB is named `PK_PublishingStatus` (legacy name) — no impact on code generation.

---

## Localization

### Chinese Table Name

- PublishStatus: 發布狀態
- Description: 內容發布狀態代碼表（草稿／已發布／已下架）

### Chinese Column Names

- pkid: 主代碼
- Description: 狀態說明
- IsDraft: 草稿
- IsPublished: 已發布
- IsDiscontinued: 已下架

---

## Required Fields

All fields are NOT NULL and required:

- `pkid` NOT NULL (tinyint, manually assigned — required on create, read-only on edit)
- `Description` NOT NULL (nvarchar(50))
- `IsDraft` NOT NULL (bit)
- `IsPublished` NOT NULL (bit)
- `IsDiscontinued` NOT NULL (bit)

Optional (nullable): none.

---

## Foreign Keys

`PublishStatus` has no foreign key columns.

**N/A**

---

## Foreign-Primary Links

`PublishStatus` has no foreign key columns.

**N/A**

---

## Primary-Foreign Links

The following tables reference `PublishStatus.pkid` as a foreign key:

- **Course** (`PublishStatus_pkid`, course.sql)
  - Column header: 對應課程
  - Button label: 查看課程 (icon: `pi pi-book`)
  - Link target: `/courses?publishStatusPkid={pkid}`
  - Query param: `publishStatusPkid`
  - ⚠️ Course module is **not yet implemented** — do NOT render this link button until the Course feature exists. Documented here for future wiring.

- **Promotion2** (`PublishStatus_pkid`, promotion.sql)
  - Column header: 對應促銷活動
  - Button label: 查看促銷活動 (icon: `pi pi-megaphone`)
  - Link target: `/promotion2s?publishStatusPkid={pkid}`
  - Query param: `publishStatusPkid`
  - ⚠️ Promotion2 module is **not yet implemented** — same as above.

For the current build: omit these link buttons; leave a code comment is unnecessary. Revisit when Course / Promotion2 are generated.

---

## N-N Relationships

No junction table has a FK pointing to `PublishStatus.pkid`.

**N/A**

---

## Query Filters

- **keyword**: string
  - LIKE on `Description` only (the sole string column)

- **IsDraft**: bool?
  - Exact match on `IsDraft`; tri-state (null = no filter)

- **IsPublished**: bool?
  - Exact match on `IsPublished`; tri-state (null = no filter)

- **IsDiscontinued**: bool?
  - Exact match on `IsDiscontinued`; tri-state (null = no filter)

No FK filters, no date-range filters (table has no FK or date columns).

---

## Lookup Endpoints Required

`PublishStatus` is itself an FK target (Course, Promotion2), so it needs a lookup endpoint:

| Route | Status | Returns |
|-------|--------|---------|
| `GET /api/lookups/publish-statuses` | **New** | `{ pkid, description }[]` ordered by `pkid ASC` |

No lookups are consumed by this feature's own form (no FKs).

---

## API Endpoints

Standard CRUD:

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/api/publish-statuses` | List all, `ORDER BY pkid ASC` |
| `POST` | `/api/publish-statuses/query` | Filtered query (body: `PublishStatusQuery`) |
| `GET` | `/api/publish-statuses/{id}` | Get by pkid (int route param) |
| `POST` | `/api/publish-statuses` | Create — pkid supplied in body; **409 Conflict** if pkid already exists |
| `PUT` | `/api/publish-statuses` | Update (pkid from body; pkid itself immutable) |
| `DELETE` | `/api/publish-statuses/{id}` | Delete; may fail with FK violation once Course/Promotion2 rows exist (surface as 409) |

No special endpoints. No auth exceptions.

---

## Backend Notes

### Models

```csharp
public class PublishStatus
{
    public byte Pkid { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsDraft { get; set; }
    public bool IsPublished { get; set; }
    public bool IsDiscontinued { get; set; }
}

public class PublishStatusRequest
{
    // pkid is NOT identity — client supplies it on create; immutable on update
    [Required]
    public byte Pkid { get; set; }

    [Required]
    [StringLength(50)]
    public string Description { get; set; } = string.Empty;

    public bool IsDraft { get; set; }
    public bool IsPublished { get; set; }
    public bool IsDiscontinued { get; set; }
}

public class PublishStatusQuery
{
    public string? Keyword { get; set; }
    public bool? IsDraft { get; set; }
    public bool? IsPublished { get; set; }
    public bool? IsDiscontinued { get; set; }
}
```

### SQL — SELECT

No FKs, no aliases needed:

```sql
SELECT pkid, Description, IsDraft, IsPublished, IsDiscontinued
FROM PublishStatus
ORDER BY pkid ASC
```

Query variant appends WHERE clauses:
- `Description LIKE '%' + @Keyword + '%'` (when keyword provided)
- `IsDraft = @IsDraft` / `IsPublished = @IsPublished` / `IsDiscontinued = @IsDiscontinued` (when non-null)

### SQL — INSERT

`pkid` is included (no IDENTITY, no `SCOPE_IDENTITY()`):

```sql
INSERT INTO PublishStatus (pkid, Description, IsDraft, IsPublished, IsDiscontinued)
VALUES (@Pkid, @Description, @IsDraft, @IsPublished, @IsDiscontinued);
```

Before INSERT, check existence (`SELECT COUNT(1) FROM PublishStatus WHERE pkid = @Pkid`) → controller returns **409 Conflict** on duplicate.

### SQL — UPDATE

`pkid` is the key, never updated:

```sql
UPDATE PublishStatus
SET Description = @Description,
    IsDraft = @IsDraft,
    IsPublished = @IsPublished,
    IsDiscontinued = @IsDiscontinued
WHERE pkid = @Pkid;
```

### N-N Sync Pattern

**N/A**

### Special Column Notes

- `pkid` tinyint → C# `byte`. Route param `{id}` binds as int; cast/parse to byte in controller or accept `byte id` directly.
- No `nchar`, no computed columns, no `DateOnly`/`TimeOnly` columns.
- No default-value constraints.

---

## Frontend Notes

### Angular Model

```ts
export interface PublishStatus {
  pkid: number;
  description: string;
  isDraft: boolean;
  isPublished: boolean;
  isDiscontinued: boolean;
}

export interface PublishStatusQuery {
  keyword?: string | null;
  isDraft?: boolean | null;
  isPublished?: boolean | null;
  isDiscontinued?: boolean | null;
}
```

### Routes

| Path | Component |
|------|-----------|
| `/publish-statuses` | publish-status-list |
| `/publish-statuses/new` | publish-status-form (before `/:id`!) |
| `/publish-statuses/:id` | publish-status-detail |
| `/publish-statuses/:id/edit` | publish-status-form |

### List Component

Columns: 主代碼 (pkid, sortable), 狀態說明 (Description, sortable), 草稿 / 已發布 / 已下架 (bit → tag or check icon), actions (view / edit / delete).

- Default sort: `pkid ASC`
- Filter drawer: keyword input + three tri-state boolean selects (全部 / 是 / 否)
- Numeric PK: no `encodeURIComponent` needed

### Form Layout

| Field | Widget | Notes |
|-------|--------|-------|
| pkid 主代碼 | `p-inputnumber` (min 0, max 255) | Editable in **new** mode only; read-only/disabled in edit mode |
| Description 狀態說明 | `input pTextarea`/`pInputText` maxlength 50 | Required |
| IsDraft 草稿 | `p-checkbox` / `p-toggleswitch` | Required (defaults false) |
| IsPublished 已發布 | `p-checkbox` / `p-toggleswitch` | Required (defaults false) |
| IsDiscontinued 已下架 | `p-checkbox` / `p-toggleswitch` | Required (defaults false) |

- Reactive Forms; no lookups to load (`forkJoin` unnecessary — direct `getById` in edit mode)
- Create failure with 409 → toast「主代碼已存在」

### Delete Confirmation Message

```
確定要刪除主代碼 <b>${item.pkid}</b>「${item.description}」？
```

### Session Storage Keys

| Key | Contents |
|-----|----------|
| `publish-status-list-filters` | Last query filter values |
| `publish-status-list-sort` | `{ sortField, sortOrder }` |
| `publish-status-list-page` | `{ first, rows }` |

No incoming cross-entity query params for now (Course/Promotion2 not built yet; when they are, they will link in with `publishStatusPkid` — the reverse direction, so nothing to accept here).

### Sidebar Placement

- Nav group: **系統管理 Admin** (existing group — contains AppRole)
- Label: 發布狀態
- Icon: `pi pi-flag`
- Route: `/publish-statuses`

### Special Form Behaviors

- `pkid` disabled in edit mode (immutable key), enabled in new mode.
- No auto-defaulting, no conditional visibility, no sub-panels. **N/A** otherwise.

---

## Tests

### Backend (CMS.API.Tests, xUnit + Moq)

`PublishStatusesControllerTests`:
- `GetAll` returns 200 with list
- `Query` with `IsPublished = true` filter passes query object to repository, returns 200
- `GetById` found → 200 with entity; not found → 404
- `Create` → 201 (CreatedAtAction); duplicate pkid → 409
- `Update` existing → 204; missing → 404
- `Delete` existing → 204; missing → 404

Mock `IPublishStatusRepository`.

### Frontend (Karma + Jasmine)

- `publish-status.service.spec.ts` — assert URL + verb per method (`/api/publish-statuses`, `/query`, `/{id}`); numeric ID so no encode assertion needed
- `publish-status-list.spec.ts` — renders with mocked service; filter state saved to session storage
- `publish-status-detail.spec.ts` — loads record via ActivatedRoute stub `paramMap`
- `publish-status-form.spec.ts` — required-field validation (empty Description → invalid); pkid control disabled in edit mode

All specs configure `provideHttpClientTesting()`, `providePrimeNG()`, `provideNoopAnimations()`.

---

## Files to Create / Modify

| # | File | Action |
|---|------|--------|
| 1 | `src/CMS.API/Models/PublishStatus.cs` | Create |
| 2 | `src/CMS.API/Models/PublishStatusRequest.cs` | Create |
| 3 | `src/CMS.API/Models/PublishStatusQuery.cs` | Create |
| 4 | `src/CMS.API/Repositories/IPublishStatusRepository.cs` | Create |
| 5 | `src/CMS.API/Repositories/PublishStatusRepository.cs` | Create |
| 6 | `src/CMS.API/Controllers/PublishStatusesController.cs` | Create |
| 7 | `src/CMS.API/Controllers/LookupsController.cs` | Modify — add `publish-statuses` lookup |
| 8 | `src/CMS.API/Program.cs` | Modify — DI registration |
| 9 | `src/CMS.API.Tests/PublishStatusesControllerTests.cs` | Create |
| 10 | `src/CMS.NG/src/app/core/models/publish-status.model.ts` | Create |
| 11 | `src/CMS.NG/src/app/core/services/publish-status.service.ts` (+ `.spec.ts`) | Create |
| 12 | `src/CMS.NG/src/app/core/services/lookup.service.ts` | Modify — add `getPublishStatuses()` |
| 13 | `src/CMS.NG/src/app/features/publish-statuses/publish-status-list/` (4 files) | Create |
| 14 | `src/CMS.NG/src/app/features/publish-statuses/publish-status-detail/` (4 files) | Create |
| 15 | `src/CMS.NG/src/app/features/publish-statuses/publish-status-form/` (4 files) | Create |
| 16 | `src/CMS.NG/src/app/app.routes.ts` | Modify — lazy routes (`/new` before `/:id`) |
| 17 | `src/CMS.NG/src/app/app.ts` / `app.html` | Modify — sidebar entry under 系統管理 Admin |
