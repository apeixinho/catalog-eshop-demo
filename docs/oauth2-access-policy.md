# OAuth2 access policy (Authorization Server + Resource Server)

Decision record for how authentication and authorization are split across this monorepo. For a short rule table maintained with the code, see [backend/README.md](../backend/README.md#access-policy).

## Status

Accepted (public catalog, JWT checkout; payment webhook uses shared secret)

## Context

The stack separates **identity** from **API authorization**:

- **`auth-server`** — Spring Authorization Server that authenticates users and issues JWT access tokens (RS256, PKCE for the SPA).
- **`backend`** — Spring Boot **OAuth2 resource server** with `@EnableWebSecurity`. It does not log users in, but it **validates JWTs** (issuer, audience, signature via JWKS) and **enforces route-level access** (scopes and roles) in `SecurityConfig`.

Browse/search/geo stay public for a typical e-commerce SPA; checkout and account flows require a shopper JWT. Mock payment finalization is server-to-server and must not depend on a browser session or shopper token.

## Decision

1. Run a **Spring Authorization Server** as `auth-server` (port 9000).
2. Configure the catalog **backend** as an **OAuth2 Resource Server** validating JWTs via the issuer JWKS (`SecurityFilterChain` + `oauth2ResourceServer().jwt()`).
3. Register a public SPA client `catalog-spa` using Authorization Code + PKCE.
4. Issue JWTs (RS256) with audience `catalog-api` and scopes `openid`, `profile`, `catalog.read`, `catalog.write`.
5. **Access policy** (backend `SecurityFilterChain` in `SecurityConfig`):
   - **Permit anonymous:** catalog GETs (products/categories), countries/states (geo), currency rates (`GET /api/v1/currency/**`), OpenAPI/Swagger UI, CORS preflight (`OPTIONS /**`), and actuator probes (`/actuator/health`, `/actuator/health/**`, `/actuator/info`).
   - **Require Bearer JWT + `SCOPE_catalog.write`:** `/api/v1/checkout/**` (purchase, order status — **not** the payment webhook; see below) and `/api/v1/account/**` (order history and detail). Spring Security evaluates `permitAll` for the webhook **before** the checkout scope rule.
   - **Require Bearer JWT + `ROLE_MANAGER` or `ROLE_ADMIN`:** `/api/v1/manage/**` — order management (`/api/v1/manage/orders/**`) and read-only customer list/detail (`/api/v1/manage/customers/**`).
   - **Require Bearer JWT + `ROLE_ADMIN`:** customer CRUD under `/api/v1/admin/customers/**`.
6. **JWT authorities on the resource server:** the backend maps both OAuth2 **scopes** (`scope` claim → `SCOPE_catalog.write`, etc.) and **roles** (`roles` claim → `ROLE_MANAGER`, `ROLE_ADMIN`, …). Integration tests should build JWT post-processors via the app's `jwtGrantedAuthoritiesConverter` bean (see `JwtTestSupport`), not hard-code incomplete authority sets.
7. **`catalog.read` scope:** issued to the SPA and included in token requests, but **not enforced** on the backend today — public catalog GETs are anonymous; no route requires `SCOPE_catalog.read`.
8. Demo users are seeded for local/dev (e.g. `user` / `password`, `manager` / `password`, `admin` / `password`); staging uses JDBC-backed users in MariaDB `catalog_auth`. Access tokens include a `roles` claim (`USER`, and optionally `MANAGER` or `ADMIN`) plus `preferred_username` for SPA role checks.
9. Access tokens include audience `catalog-api`; the resource server validates `jwt.audiences`.
10. SPA keeps the access token in memory and renews via `refresh_token` stored in `sessionStorage` (no silent-renew iframe / `silent-renew.html`).

### Payment webhook (two layers)

`POST /api/v1/checkout/payment-webhook` is **`permitAll` at the Spring Security filter** (no Bearer JWT) because `payment-service` is not an OAuth client. **Authorization is enforced in application code:** `PaymentWebhookController` requires header `X-Payment-Secret` matching `catalog.payment.webhook-secret` (401 if missing or wrong). Hosted checkout pages on `payment-service` use session-token URLs and do not use the catalog IdP.

## Stock and checkout

- **No stock reservation at checkout:** placing an order creates a **PENDING** row and a payment session without decrementing catalog stock. Stock is decremented only when the payment webhook reports success (`PAID`). Concurrent checkouts for the same SKU can therefore oversell until payment finalization; the webhook path uses optimistic stock decrement and returns **409** when inventory is insufficient (order moves to `CANCELLED`).
- Managers can cancel unpaid orders manually; paid orders can be deleted only after stock is restored (see below).

## Order management rules

- **Manual status updates** (`PUT /api/v1/manage/orders/{id}`): only `PENDING` → `CANCELLED` is permitted. Marking an order `PAID` manually returns **409 Conflict**; payment finalization must go through `POST /api/v1/checkout/payment-webhook`.
- **Delete paid orders** (`DELETE /api/v1/manage/orders/{id}`): when status is `PAID`, product stock is restored for each line item before the order row is removed. If stock cannot be restored (e.g. product inactive), the delete fails with **409** and the order remains.
- **Delete pending orders**: rejected with **409** while status is `PENDING` (payment may still complete via webhook). Cancel first (`PENDING` → `CANCELLED`), then delete if needed.
- **Customer delete guard**: admin delete is rejected with **409** when the customer still has orders (counted via repository, not lazy-loaded collections).

## Consequences

- Shoppers can browse and search without logging in; placing an order requires PKCE login + Bearer token with `catalog.write`.
- Payment completion is independent of the SPA session: the mock payment service redirects the browser and notifies the API via the shared-secret webhook.
- Backend and auth-server share a fixed issuer/client/audience contract so they can be developed in parallel.
- Compose networking uses service hostname `auth-server` for server-to-server JWKS; browsers use `localhost:9000`.
- Staging Compose mounts `auth-server/init-db` so `catalog_auth` exists beside `catalog_db`.

## References

- [Backend access policy](../backend/README.md#access-policy)
- [Dev and staging environments](dev-and-staging-environments.md)
- [Mock payment service](../payment-service/README.md)
- https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html
- https://www.baeldung.com/spring-security-oauth-resource-server
- https://docs.spring.io/spring-authorization-server/reference/
