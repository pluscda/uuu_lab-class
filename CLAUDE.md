# CLAUDE.md

## Project Overview

This project is a full-stack CMS generated from the SQL schemas under:

```
database/*.sql
```

When generating new features, always follow:

- **Coding Convention:** `spec/code-gen.convention.md`
- **UI Style Reference:** `spec/ui-sample-*.png`
  - Reference the visual style only.
  - Do **not** copy the sample content.

---

# Project Structure

```
database/
    SQL Server schema scripts
    (auth.sql, admin.sql, course.sql, promotion.sql)

spec/
    Code generation conventions
    Feature templates
    UI reference images

src/
    CMS.slnx                Solution (.NET SDK 10 format)

    CMS.API/
        .NET 9 Web API
        Dapper (No Entity Framework)
        Swagger (/swagger)

    CMS.API.Tests/
        xUnit + Moq

    CMS.NG/
        Angular 20
        PrimeNG 20 (Aura Emerald)
        Karma + Jasmine
```

---

# Common Commands

## Backend

Run API

```powershell
cd src/CMS.API
dotnet run
```

API URL

```
http://127.0.0.1:5000
```

Swagger

```
http://127.0.0.1:5000/swagger
```

Run tests

```powershell
cd src
dotnet test CMS.slnx
```

---

## Frontend

Start Angular

```powershell
cd src/CMS.NG
npm start
```

Run unit tests

```powershell
ng test --watch=false --browsers=ChromeHeadless
```

Build

```powershell
ng build
```

Frontend URL

```
http://localhost:4200
```

---

# Environment Notes

## Port

- API must use:

```
127.0.0.1:5000
```

- Do **NOT** change back to `localhost`
- Docker Desktop already occupies the IPv6 port.

---

## .NET

Installed SDK:

- .NET SDK 10 only

Projects should continue using:

```xml
<TargetFramework>net9.0</TargetFramework>
<RollForward>LatestMajor</RollForward>
```

---

## PrimeNG

Always use:

```
PrimeNG 20
```

Do **NOT** upgrade to PrimeNG 21.

---

## Database

Local SQL Server

```
SQLEXPRESS
```

Database

```
CMS
```

Authentication

```
Trusted_Connection=True
```

Connection string is stored in:

```
src/CMS.API/appsettings.json
```

---

# Backend Convention

Each database table should contain:

```
Models/
    Entity.cs
    EntityRequest.cs
    EntityQuery.cs

Repositories/
    IEntityRepository.cs
    EntityRepository.cs

Controllers/
    EntitiesController.cs
```

General rules

- Dapper only
- No Entity Framework
- Async APIs
- Repository uses `IDbConnectionFactory`
- Repository = Scoped
- Connection Factory = Singleton
- Multiple writes use transactions

API conventions

- Route uses **kebab-case plural**

Example

```
/api/app-roles
```

- PUT updates by request body
- POST returns **409 Conflict** if duplicate key

Many-to-many relationship

- Delete existing records
- Reinsert new records
- Count using subquery
- Populate ID list only on GET-by-id

Lookup APIs

```
/api/lookups/{plural}
```

### AppRole Notes

Primary key

```
RoleId
```

Identity column

```
pkid
```

Rules

- RoleId cannot be changed
- User relationship

```
AppUserRole
```

Request model

```
UserIds : List<string>
```

---

# Frontend Convention

Feature folder

```
features/

    app-roles/
        app-role-list/
        app-role-detail/
        app-role-form/
```

Each component contains

```
.ts
.html
.scss
.spec.ts
```

Services

```
core/services/
```

Interfaces

```
core/models/
```

API

- Always use

```
environment.apiUrl
```

- String IDs should use

```ts
encodeURIComponent()
```

---

## List Page

Use

- PrimeNG `p-table`
- Filter Drawer
- Session Storage

Storage keys

```
{table}-list-filters
{table}-sort
{table}-page
```

Paginator text

```
{first}–{last} 筆，共 {totalRecords} 筆
```

---

## Form Page

Requirements

- Reactive Forms
- forkJoin() for parallel loading
- p-multiselect

Options

```
appendTo="body"

maxSelectedLabels="9999"
```

Notifications

- MessageService
- ConfirmationService

Delete confirmation

```
確定要刪除主代碼 <b>{pkid}</b>「{id}」？
```

---

## Navigation

Sidebar menu style reference

```
https://ultima.primeng.org/dashboards/analytics
```

- Indigo topbar (#3949ab) with brand + amber circular collapse toggle on the sidebar edge
- White sidebar, uppercase muted group headers, slate items
- Active item: bold, light background, emerald left border + emerald icon
- Layout shell lives in `app.html` / `app.scss` (topbar + `.sidebar` + `.content`)

Sidebar menu

```
app.ts

navGroups
```

Example

```
系統管理 Admin
```

Shared page styles

```
styles.scss

.page-card
.page-toolbar
.field*
```

---

## Component Unit Test

Always configure

- provideHttpClientTesting()
- providePrimeNG()
- provideNoopAnimations()

ActivatedRoute stub

```ts
{
    snapshot: {
        paramMap: new Map(...)
    }
}
```

---

# Current Status

## Completed

✅ AppRole CRUD

- List
- View
- Add
- Edit
- Delete
- User Assignment

Additional APIs

- Lookups
- AppUsers

Testing

- Backend: 11 tests
- Frontend: 22 tests

Status

- All tests passing
- Verified against the live database

---

## Not Yet Implemented

Remaining modules

- AppUser
- SysConfig
- All entities under

```
admin
course
promotion
```

database schemas