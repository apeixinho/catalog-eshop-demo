# OAuth2 access policy (Authorization Server + Resource Server)

## Status

Accepted (public catalog, JWT checkout; payment webhook uses shared secret)

## Context

The luv2shop reference backend has no Spring Security. We need an in-repo identity provider and JWT protection for sensitive operations, while keeping browse/search/geo open for a typical e-commerce SPA (public catalog, authenticate at checkout). Mock payment finalization is a server-to-server call and must not require a shopper JWT.

## Decision

1. Run a **Spring Authorization Server** as `auth-server` (port 9000).
2. Configure the catalog **backend** as an **OAuth2 Resource Server** validating JWTs via the issuer JWKS.
3. Register a public SPA client `catalog-spa` using Authorization Code + PKCE.
4. Issue JWTs (RS256) with audience `catalog-api` and scopes `openid`, `profile`, `catalog.read`, `catalog.write`.
5. **Access policy** (backend `SecurityFilterChain`):
   - **Permit anonymous:** catalog (products/categories), countries/states (geo), currency rates (`GET /api/v1/currency/**`), OpenAPI/Swagger UI, and `/actuator/health` (probes) for Docker healthchecks.
   - **Require Bearer JWT + `catalog.write`:** shopper checkout APIs under `/api/v1/checkout/**`, account order history under `/api/v1/account/orders/**`, and `GET /api/v1/checkout/orders/{trackingNumber}` (owner-scoped order status for the SPA result page).
   - **Require Bearer JWT + `ROLE_MANAGER` or `ROLE_ADMIN`:** order management under `/api/v1/manage/orders/**` (list/read/update/delete) and customer read under `/api/v1/manage/customers/**`.
   - **Require Bearer JWT + `ROLE_ADMIN`:** customer CRUD under `/api/v1/admin/customers/**`.
   - **Permit without JWT (shared secret):** `POST /api/v1/checkout/payment-webhook` — called by `payment-service` with header `X-Payment-Secret` (not a browser JWT). Hosted checkout pages on `payment-service` are session-token URLs and do not use the catalog IdP.
6. Demo users are seeded for local/dev (e.g. `user` / `password`, `manager` / `password`, `admin` / `password`); staging uses JDBC-backed users in MariaDB `catalog_auth`. Access tokens include a `roles` claim (`USER`, `MANAGER`, `ADMIN`) for backend authorization.
7. Access tokens include audience `catalog-api`; the resource server validates `jwt.audiences`.
8. SPA keeps the access token in memory and renews via `refresh_token` stored in `sessionStorage` (no silent-renew iframe / `silent-renew.html`).

## Consequences

- Shoppers can browse and search without logging in; placing an order requires PKCE login + Bearer token.
- Payment completion is independent of the SPA session: the mock payment service redirects the browser and notifies the API via a signed webhook.
- Backend and auth-server share a fixed issuer/client/audience contract so they can be developed in parallel.
- Compose networking uses service hostname `auth-server` for server-to-server JWKS; browsers use `localhost:9000`.
- Staging Compose mounts `auth-server/init-db` so `catalog_auth` exists beside `catalog_db`.

## References

- [Dev and staging environments](dev-and-staging-environments.md)
- [Mock payment service](../payment-service/README.md)
- https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html
- https://www.baeldung.com/spring-security-oauth-resource-server
- https://docs.spring.io/spring-authorization-server/reference/
