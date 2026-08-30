# Catalog E-Shop

[![Frontend CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/frontend.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/frontend.yml)
[![Backend CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/backend.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/backend.yml)
[![Auth Server CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/auth-server.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/auth-server.yml)
[![Payment Service CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/payment-service.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/payment-service.yml)
[![Stack CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/stack-ci.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/stack-ci.yml)

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)

Greenfield monorepo: Angular 22 storefront, Spring Boot 4.1 resource server, and Spring Authorization Server.

## Layout

| Path | Role |
|------|------|
| `frontend/` | Angular 22 SPA (signals, PKCE + refresh, locale/FX) |
| `backend/` | Catalog API — Spring Boot 4.1 (OAuth2 resource server, Flyway, translation tables) |
| `auth-server/` | Spring Authorization Server — Spring Boot 4.1 / Spring Security 7 (issuer `http://localhost:9000`) |
| `payment-service/` | Mock hosted checkout — Spring Boot 4.1 (port `8091`; webhook finalizes orders) |
| `compose.dev.yml` | Local stack (H2, in-memory auth users) |
| `compose.staging.yml` | Staging-like stack (MariaDB for API + auth) |
| `docs/` | OAuth2 access policy, environments, OpenAPI |


## Quick start (local JVM)

```bash
# Terminal 1 — auth
cd auth-server && mvn spring-boot:run

# Terminal 2 — mock payment
cd payment-service && mvn spring-boot:run

# Terminal 3 — API
cd backend && mvn spring-boot:run

# Terminal 4 — SPA
cd frontend && npm start
```

- SPA: http://localhost:4200  
- API: http://localhost:8090  
- Auth: http://localhost:9000  
- Payment: http://localhost:8091  

Demo logins (local/dev/staging seed only): `user` / `password`, `manager` / `password`, `admin` / `password`.

Catalog GETs are public (`?lang=` for translated names). Checkout requires PKCE login and scope `catalog.write`, plus an `Idempotency-Key` header. Authenticated shoppers can view order history at `/account/orders`. Users with `MANAGER` or `ADMIN` roles can manage orders and view customers at `/manage/*`; admins can create/edit/delete customers on `/manage/customers`.

The API binds the order to the JWT `sub`, builds lines from `{productId, quantity}`, prices from catalog USD × fixed FX rates for `currencyCode`, upserts the customer by oauth subject, and creates a **PENDING** order without decrementing stock. The SPA redirects to the hosted payment page; after Pay, a signed webhook decrements stock and sets `PAID` (or `CANCELLED` on cancel / stock failure).

## Docker Compose

Do **not** run both stacks at once (shared host ports `4200` / `8090` / `8091` / `9000`). They are separate Compose projects with distinct image tags (`*:dev` / `*:staging`).

```bash
cp .env.example .env

# Dev — ng serve on :4200, H2, in-memory auth
docker compose -f compose.dev.yml up --build

# Staging — nginx SPA (:4200→80), MariaDB catalog_db + catalog_auth
docker compose -f compose.staging.yml up --build
```

On Windows with Podman, use `podman compose` the same way if `docker` is not available.

Staging frontend is nginx on container port **80** (`4200:80`). Dev frontend is `ng serve` on **4200** (`4200:4200`). An empty reply on `:4200` usually means the nginx image was started behind the dev port map.

### Runtime SPA config

Compose injects `/env.js` (`API_BASE_URL`, `AUTH_ISSUER_URI`, `OAUTH_*`) so the browser talks to host-published ports. Token `iss` stays `http://localhost:9000`; the backend fetches JWKS from `http://auth-server:9000/oauth2/jwks` inside the network.

### Product images

Catalog `image_url` values are relative (`assets/images/products/...`). Files live under `frontend/public/assets/images/` (copied from the luv2shop reference). The SPA prefixes relative paths with `/` so nginx/`ng serve` can resolve them.

## Auth notes

- JWT audience `catalog-api` is set by the auth-server and validated by the backend (`spring.security.oauth2.resourceserver.jwt.audiences`).
- SPA keeps the access token in memory and stores refresh/id tokens in `sessionStorage`; it refreshes ~30s before expiry (no `silent-renew.html`).
- Auth-server persists the RSA JWK under `catalog.auth.jwk-path` (default `./data/auth-jwk.json`) so restarts keep accepting issued tokens.
- Staging auth uses MariaDB database `catalog_auth` (Flyway + JDBC users/clients). Dev uses in-memory beans (`@Profile("!staging")`).
- The payment webhook is not JWT-gated; `payment-service` authenticates with `X-Payment-Secret` (see [OAuth2 access policy](docs/oauth2-access-policy.md)).

## CI/CD

**CI** is GitHub Actions (GHA). There is no image publish or deploy yet (that would be optional later via GHCR — GitHub Container Registry at `ghcr.io`).

### Per-service unit CI

Path-filtered workflows (status badges at the top of this file):

| Workflow | Triggers on changes to | Steps |
|----------|------------------------|-------|
| ✅ [Frontend CI](.github/workflows/frontend.yml) | `frontend/**` | `npm ci` → `npm run test:ci` → `npm run build` |
| ✅ [Backend CI](.github/workflows/backend.yml) | `backend/**` | `mvn -B test package` |
| ✅ [Auth Server CI](.github/workflows/auth-server.yml) | `auth-server/**` | `mvn -B test package` |
| ✅ [Payment Service CI](.github/workflows/payment-service.yml) | `payment-service/**` | `mvn -B test package` |

> ℹ️ The frontend workflow runs on Node 22 (Angular 22 requires Node ≥ 22.22.3). The JVM services build on Java 21.

### Stack CI (Compose smoke)

[Stack CI](.github/workflows/stack-ci.yml) is a separate workflow (Option B) for cross-cutting Compose/Docker paths and promotion branches:

| When | What runs |
|------|-----------|
| PR or push to `dev` | Always `compose.dev.yml` smoke (H2) |
| PR or push to `staging` / `main` | Always `compose.staging.yml` smoke (MariaDB + nginx) |
| Stack files change (`compose*.yml`, Dockerfiles, `.env.example`, `auth-server/init-db/**`, …) | Also `compose.staging.yml` smoke on any branch |

Smoke = `docker compose up --build --wait`, then curl actuator health, public products API, and the SPA root.

Git branch `staging` is the promotion lane; Compose project `eshop-staging` is the MariaDB runtime profile — Stack CI maps **when** that stack is exercised, it does not host a long-lived environment.

### Branch promotion

See [Branching and CI](docs/branching-and-ci.md) for the `dev` → `staging` → `main` workflow, GitHub Rulesets, and Dependabot merge guidance.

## Docs

- [Documentation index](docs/README.md)
- [Branching and CI](docs/branching-and-ci.md) — `dev` → `staging` → `main`, GitHub Rulesets, Dependabot
- [OAuth2 access policy](docs/oauth2-access-policy.md) — resource server access (catalog, checkout JWT, payment webhook)
- [Dev and staging environments](docs/dev-and-staging-environments.md) — Compose, MariaDB, Flyway, JWK, payment env
- [Catalog API OpenAPI](docs/catalog-api.openapi.yaml) — catalog, checkout, account/manage/admin APIs, payment webhook
- [Mock payment service](payment-service/README.md) — hosted checkout and webhook
