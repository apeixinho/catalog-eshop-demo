# Documentation index

[![Frontend CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/frontend.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/frontend.yml)
[![Backend CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/backend.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/backend.yml)
[![Auth Server CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/auth-server.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/auth-server.yml)
[![Payment Service CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/payment-service.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/payment-service.yml)
[![Stack CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/stack-ci.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/stack-ci.yml)

| Document | What it covers |
|----------|----------------|
| [Branching and CI](branching-and-ci.md) | `dev` → `staging` → `main` promotion, Dependabot grouping, GitHub Rulesets |
| [OAuth2 access policy](oauth2-access-policy.md) | Authorization Server + resource-server decision; public catalog vs JWT checkout vs payment webhook |
| [Dev and staging environments](dev-and-staging-environments.md) | Compose stacks, Stack CI smoke, ports, MariaDB, Flyway, JWKS, payment env vars, SPA tokens |
| [Catalog API OpenAPI](catalog-api.openapi.yaml) | HTTP API sketch: catalog, currency, checkout purchase, order status, payment webhook |

Service entry points: [backend](../backend/README.md), [auth-server](../auth-server/README.md), [payment-service](../payment-service/README.md), [frontend](../frontend/README.md).
