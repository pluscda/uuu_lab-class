# CMS

Full-stack CMS built from the database schema in `./database/*.sql`.

| Layer | Tech | Location | Port |
|-------|------|----------|------|
| Backend | .NET 9 Web API + Dapper (no EF) | `src/CMS.API` | 5000 |
| Backend tests | xUnit + Moq | `src/CMS.API.Tests` | — |
| Frontend | Angular 20 (standalone) + PrimeNG 20 | `src/CMS.NG` | 4200 |
| Frontend tests | Karma + Jasmine | `src/CMS.NG` | — |

## Prerequisites

- .NET SDK 9+ (projects target `net9.0` with `RollForward=LatestMajor`, so SDK/runtime 10 works)
- Node 20+ / Angular CLI 20
- SQL Server Express with the `CMS` database (run the scripts in `./database`)

## Run

```powershell
# Backend — http://127.0.0.1:5000 (Swagger UI at /swagger)
cd src/CMS.API
dotnet run

# Frontend — http://localhost:4200 (no proxy; calls the API directly, CORS enabled)
cd src/CMS.NG
npm start
```

> Note: the API and `environment.ts` bind/point to `127.0.0.1:5000` (not `localhost`)
> because Docker Desktop occupies the IPv6 side of port 5000 on this machine.

## Test

```powershell
# Backend
cd src
dotnet test CMS.slnx

# Frontend
cd src/CMS.NG
ng test --watch=false --browsers=ChromeHeadless
```

## Features

- **AppRole CRUD** (`系統管理 Admin → 角色 AppRole`): list (sortable/paginated table,
  filter drawer, session-persisted state), view, add, edit (RoleId immutable),
  delete with confirmation, and user assignment (AppUserRole n-n, delete-then-reinsert).

## Conventions

See `spec/code-gen.convention.md` for the patterns used to generate backend
models/repositories/controllers and frontend feature folders.
