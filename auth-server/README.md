# Catalog auth-server (OAuth2 Authorization Server)

[![Auth Server CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/auth-server.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/auth-server.yml)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring%20Security-7-6DB33F?logo=springsecurity&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white)

Spring Authorization Server 7.1 (Spring Boot 4.1 / Spring Security 7) issuing JWTs for the Catalog SPA and API.

## Profiles

| Profile | Users / clients | Database |
|---------|-----------------|----------|
| default / `dev` | In-memory (`DevAuthDataConfig`) | None (Flyway off) |
| `staging` | JDBC + Flyway (`StagingAuthDataConfig`) | MariaDB `catalog_auth` |

Demo accounts (seed only): `user` / `password`, `manager` / `password`, `admin` / `password`.

## Contract

- Issuer: `AUTH_ISSUER_URI` (default `http://localhost:9000`)
- Client: `catalog-spa` (public, PKCE, refresh_token); redirect/post-logout URIs for each comma-separated `FRONTEND_ORIGIN`
- Audience claim: `catalog-api`
- Scopes: `openid`, `profile`, `catalog.read`, `catalog.write`
- Signing key: RSA JWK at `catalog.auth.jwk-path` / `AUTH_JWK_PATH` (generated once if missing)

## Run

```bash
mvn spring-boot:run
# staging locally needs MariaDB + SPRING_PROFILES_ACTIVE=staging
```

Compose: see root `compose.dev.yml` / `compose.staging.yml` and [dev and staging environments](../docs/dev-and-staging-environments.md). Access policy: [OAuth2 access policy](../docs/oauth2-access-policy.md).
