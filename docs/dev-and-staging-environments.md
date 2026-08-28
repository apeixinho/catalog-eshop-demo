# Dev and staging environments

## CI smoke (GitHub Actions)

[Stack CI](../.github/workflows/stack-ci.yml) builds and smoke-tests Compose stacks in ephemeral runners:

- **Staging Compose** (`compose.staging.yml`) — on PRs/pushes to git branches `staging`/`main`, and whenever stack files change.
- **Dev Compose** (`compose.dev.yml`) — on every PR/push to git branch `dev`.

This validates Dockerfiles, MariaDB init/Flyway, and health endpoints. It does **not** deploy a shared hosted environment. Git branch names and Compose project names (`eshop-dev` / `eshop-staging`) are related by convention only.

## Dev (`compose.dev.yml` / local JVM)

| Service | Storage | Notes |
|---------|---------|--------|
| auth-server | In-memory users + clients | Profile `!staging` (`DevAuthDataConfig`); JWK file at `catalog.auth.jwk-path` (default `./data/auth-jwk.json`) |
| payment-service | In-memory payment sessions | Port `8091`; webhook to backend with `X-Payment-Secret` |
| backend | H2 (`classpath:db/migration/h2`) | Profile `dev`; calls payment-service for checkout sessions |
| frontend | `ng serve` in container | Writes `/env.js` at start |

Flyway on the auth-server is **disabled** by default (`spring.flyway.enabled: false`) so the default/dev profile does not need MariaDB.

## Do not run both Compose files together

`compose.dev.yml` and `compose.staging.yml` both publish host ports `4200`, `8090`, `8091`, and `9000`. They are separate Compose projects (`eshop-dev` / `eshop-staging`) with distinct image tags, but only one stack should be up at a time.

**Port mismatch tip:** staging frontend is nginx on container port **80** (`4200:80`). Dev frontend is `ng serve` on container port **4200** (`4200:4200`). If `:4200` returns an empty reply while the frontend container looks “up”, the wrong image is probably running (nginx behind a `4200:4200` map).

## Staging (`compose.staging.yml`)

| Service | Storage | Notes |
|---------|---------|--------|
| MariaDB | `catalog_db` + `catalog_auth` | Init script `deploy/mariadb/init/01-create-auth-db.sql` |
| auth-server | JDBC + Flyway on `catalog_auth` | Profile `staging` (`StagingAuthDataConfig`) |
| payment-service | In-memory payment sessions | Same mock checkout as dev |
| backend | Flyway MariaDB migrations | Profile `staging` |
| frontend | nginx (`Dockerfile.staging`) | Port `4200→80`, runtime `/env.js` |

Required env (see `.env.example`):

- `MARIADB_*` — shared credentials for both databases  
- `AUTH_MARIADB_DATABASE=catalog_auth` — auth-server datasource  
- `AUTH_ISSUER_URI=http://localhost:9000` — JWT `iss` (browser + resource server)  
- `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI=http://auth-server:9000/oauth2/jwks` — set in Compose for the API  
- `PAYMENT_*` — mock payment base URL, public checkout URL, webhook URL, shared secrets

Fresh MariaDB volumes are required for the init script to create `catalog_auth`. If you change init SQL after first boot, remove the `mariadb_data_staging` volume and recreate.

```bash
docker compose -f compose.staging.yml down -v
docker compose -f compose.staging.yml up --build
```

Persist the auth-server JWK across container recreation (e.g. bind-mount `AUTH_JWK_PATH` / `./data`) or issued tokens become invalid after restart.

## H2 vs MariaDB Flyway

Backend keeps **separate** migration trees:

- `backend/src/main/resources/db/migration/h2/`
- `backend/src/main/resources/db/migration/mariadb/`

Keep dialects in sync when adding versions (e.g. V4 order tables, V6 `payment_session_id` / `payment_url`). Prefer `compose.staging.yml` when validating MariaDB-specific index behavior.

## JWT audience

Auth-server customizer adds `aud: catalog-api`. Backend validates via:

```yaml
spring.security.oauth2.resourceserver.jwt.audiences: ${OAUTH_AUDIENCE:catalog-api}
```

Compose passes `OAUTH_AUDIENCE` to both services.

## SPA tokens

`AuthService` keeps the access token in memory; refresh token, id token, and true expiry live in `sessionStorage`. Skew applies only when deciding to refresh. `authGuard` / `ensureValidAccessToken()` renew via the refresh_token grant (no iframe silent-renew page).

## Auth vs payment webhook

Shopper JWT covers `POST /api/v1/checkout/purchase`. Order finalization uses `POST /api/v1/checkout/payment-webhook` with `X-Payment-Secret` (see [OAuth2 access policy](oauth2-access-policy.md) and [mock payment service](../payment-service/README.md)).
