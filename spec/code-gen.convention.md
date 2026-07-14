# Code Generation Patterns

Canonical coding conventions for all generated features. CLAUDE.md holds only the
always-needed summary; this file is the detailed reference.

## Backend

### Models

- `{TABLE}.cs` — response model (with nav objects for FKs, subquery counts for n-n)
- `{TABLE}Request.cs` — write DTO (FK pkids only; n-n as `List<int>`)
- `{TABLE}Query.cs` — search DTO (Keyword?, FK pkids?, bool fields?, date ranges?)

### Repository

- `I{TABLE}Repository.cs` + `{TABLE}Repository.cs`
- Dapper only (no EF). Multi-map when JOINing nav objects.
- Async APIs throughout.
- Repository uses `IDbConnectionFactory`; DI lifetimes: Repository = **Scoped**,
  Connection Factory = **Singleton** (register both in `Program.cs`).
- Multiple writes in one operation always use a transaction.
- `nchar` columns: always `RTRIM()` in SQL
- n-n: delete-then-reinsert on update; separate query on same connection for read;
  counts via subquery; ID lists populated on GET-by-id only.

### Controller

- Route: kebab-case plural — `/api/{table-plural}` (e.g. `/api/app-roles`)
- `PUT` takes pkid from body (no route param)
- `POST` returns **409 Conflict** if duplicate key
- String PKs: route `{id}` (no `:int` constraint); service uses `encodeURIComponent`
- `DateOnly`/`TimeOnly` fields: register Dapper type handlers (already in Program.cs)

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/api/{plural}` | All records |
| POST   | `/api/{plural}/query` | Filtered search |
| GET    | `/api/{plural}/{id}` | Single record |
| POST   | `/api/{plural}` | Create (409 on duplicate) |
| PUT    | `/api/{plural}` | Update (pkid in body) |
| DELETE | `/api/{plural}/{id}` | Delete |
| GET    | `/api/lookups/{plural}` | Slim lookup list (if used as FK target) |

## Frontend

### Files

- `features/{table-plural}/{table}-list/`
- `features/{table-plural}/{table}-detail/`
- `features/{table-plural}/{table}-form/`
- Each component: `.ts` / `.html` / `.scss` / `.spec.ts`
- Services in `core/services/`; interfaces in `core/models/`
- Always call the API via `environment.apiUrl`
- String IDs: `encodeURIComponent()` in `getById` / `delete` (and any id-in-URL call)

### List page

- Sortable/paginated `p-table`; filter drawer (`p-drawer`)
- Session storage keys: `{table}-list-filters`, `{table}-list-sort`, `{table}-list-page`
- Paginator text: `{first}–{last} 筆，共 {totalRecords} 筆`
- `p-select` in drawer: always `appendTo="body"`; mapped `{ pkid, label }[]` getter; `[filter]="true"` for 10+ options
- `p-select` / `p-multiselect` with 100+ items: add `[virtualScroll]="true" [virtualScrollItemSize]="43"`

### Form page

- Reactive Forms; `forkJoin` for parallel lookup calls on init
- `p-datepicker`: convert ISO string ↔ `Date` on load/save
- `p-datepicker [timeOnly]="true"` for `time` columns; `parseTime`/`toTimeStr` helpers
- `p-multiselect` for n-n: `appendTo="body"`, `[maxSelectedLabels]="9999"`; wrap chips via `::ng-deep`

### Notifications

- `MessageService` for save/delete results; `ConfirmationService` for deletes
- Delete confirmation message: `確定要刪除主代碼 <b>{pkid}</b>「{id}」？`

### Navigation / Sidebar

- Add entry under the appropriate nav group in `app.html` / `app.ts` (`navGroups`), e.g. `系統管理 Admin`
- **SaaS Light theme** (PrimeNG Aura preset with blue primary — see `app.config.ts`):
  - Primary `#2563EB` (blue-600); app background `#F8FAFC` (slate-50); surfaces white with `#E2E8F0` borders
  - Text: `#0F172A` headings, `#334155` body, `#64748B` muted minimum (never slate-400 — fails 4.5:1 contrast)
  - White topbar with hairline bottom border; blue logo mark before the brand; white circular collapse toggle on the sidebar edge
  - White sidebar, uppercase muted group headers, slate items
  - Active item: bold, `#EFF6FF` background, blue left border + blue icon
  - Typography: `Inter, 'Noto Sans TC', 'Microsoft JhengHei', system-ui` (Google Fonts loaded in `index.html`)
  - Transitions 150–300ms on color/background only; `prefers-reduced-motion` respected globally
- Layout shell lives in `app.html` / `app.scss` (topbar + `.sidebar` + `.content`)
- Shared page styles in `styles.scss`: `.page-card` (white, 12px radius, border + subtle shadow), `.page-toolbar`, `.field*`

### Component unit tests

Always configure:

- `provideHttpClientTesting()`
- `providePrimeNG()`
- `provideNoopAnimations()`

ActivatedRoute stub:

```ts
{ snapshot: { paramMap: new Map([['id', ...]]) } }
```

## Date Handling

### Backend

- SQL `date` columns → C# `DateOnly`
- Dapper handler: `Data/DateOnlyTypeHandler.cs`, registered in `Program.cs` via
  `SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());`

### Frontend

- Date helpers: `core/utils/date.util.ts` (`toIso`, `parseIso`, `addYears`)
- `toIso()` uses **local** date components — never `d.toISOString()` (UTC off-by-one for UTC+8)
- `p-datepicker` binds `Date`; convert ISO string ↔ `Date` on load/save
- API `datetime` display: Dapper returns `Kind = Unspecified` — append `'Z'` before parsing/formatting

## Special Types

| Column type | Handling |
|-------------|---------|
| `nchar(n)` | `RTRIM()` in all SQL SELECTs |
| `time(7)` | C# `TimeOnly` via `TimeOnlyTypeHandler`; display with `\| slice:0:5`; `p-datepicker [timeOnly]` in form |
| `date` | C# `DateOnly` via `DateOnlyTypeHandler`; `p-datepicker` in form |
| `smallint` PK | No special handling |
| `nvarchar` PK (string) | Controller route `{id}` (no `:int`); service calls `encodeURIComponent(id)`; PK immutable on edit |
