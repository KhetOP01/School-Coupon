# School-Coupon
Demo Project

## AI workflow

See [docs/ai-setup/INSTALL-WINDOWS.md](docs/ai-setup/INSTALL-WINDOWS.md) for the Windows/VS Code setup and the parts intentionally left uninstalled.

## Architecture

- [DDD architecture for School-Coupon](docs/architecture/ddd-architecture.md)
- [Bounded context map](docs/architecture/context-map.md)

## Staff Web Admin (UC-01)

Requirements: Node.js 22 or later. Copy `.env.example` to `.env` and configure
the school's OIDC issuer, client credentials, callback URL, and Staff claim
mapping. Do not commit `.env` or use production credentials in tests. The
Next.js Admin and NestJS API use same-origin routes; Next.js rewrites auth and
card API requests to `AUTH_API_ORIGIN`.

```powershell
docker compose up -d postgres
npm install
npm run migrate
npm run seed
npm run start:dev
```

In another terminal, run the Admin UI:

```powershell
npm run dev:admin
```

Open `http://localhost:3001/admin`. The UI redirects to OIDC when there is no
active Staff session. In production, expose both apps behind HTTPS and configure
the reverse proxy and OIDC callback URL for the same public origin.

`npm test` runs unit, HTTP, and PostgreSQL integration tests. Integration tests
start a temporary local PostgreSQL 17 server using the Windows binary package,
so Docker is not required for tests. `npm run build:admin` builds the Admin UI.
The API is documented in [openapi.yaml](openapi.yaml).
