# Catalog frontend (Angular storefront)

[![Frontend CI](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/frontend.yml/badge.svg)](https://github.com/apeixinho/catalog-eshop-demo/actions/workflows/frontend.yml)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-%E2%89%A522.22.3-339933?logo=nodedotjs&logoColor=white)

Angular 22 storefront for the Catalog monorepo (TypeScript 6.0).

## Run locally

> Requires Node ≥ 22.22.3 (Angular 22 CLI minimum).

```bash
npm install
npm start
```

Open http://localhost:4200. Defaults talk to API `http://localhost:8090` and auth `http://localhost:9000`. Override at runtime via `/env.js` (`window.__CATALOG_ENV__`) — used by Compose entrypoints.

## Auth

- Authorization Code + PKCE against `catalog-spa`
- Access token in memory; refresh/id tokens in `sessionStorage`; refresh ~30s before expiry
- Checkout routes are guarded; catalog is anonymous
- Guest cart lines (`productId` + `quantity`) persist in `localStorage` across login redirects; cleared after successful payment and on sign-out
- After purchase, the SPA redirects to the mock payment page, then `/checkout/result`
- Authenticated shoppers: `/account/orders` (order history)
- `ROLE_MANAGER` or `ROLE_ADMIN`: `/manage/orders`, `/manage/customers` (managers read-only; admins edit customers on the same page)

See [OAuth2 access policy](../docs/oauth2-access-policy.md).

## UI (Angular Material)

The storefront uses [Angular Material 22](https://material.angular.dev/) (M3) with dual themes:

| App theme | Material prebuilt equivalent |
|-----------|------------------------------|
| `default` | azure-blue (light) |
| `alternative` | rose-red (light) |

Themes are applied via Sass (`src/styles.scss`) and toggled on `html` through `ThemeService` (`mat-theme-default` / `mat-theme-alternative`). FOUC (Flash of Unstyled Content) is avoided by `public/theme-boot.js`.

Notifications use `MatSnackBar`; tables use `MatTable`; forms use `MatFormField` / `MatInput` / `MatSelect`.

Component tests use [Material harnesses](https://material.angular.dev/guide/using-component-harnesses) via `src/app/testing/material-harness-support.ts`. Specs that render Material components should include `provideNoopAnimations()`.

## Test

```bash
npm run test:ci              # Vitest (no coverage)
npm run test:ci:coverage     # Vitest + @vitest/coverage-v8 → coverage/
```

Open `coverage/index.html` for the HTML report. Frontend CI uploads the report as an artifact.

## Assets

Product images under `public/assets/images/products/` (paths match DB `image_url`). Relative URLs are served from the SPA origin (leading `/` added in the products page).

## Docker

- Dev: `Dockerfile.dev` + `docker-entrypoint.dev.sh` (`ng serve`)
- Staging: `Dockerfile.staging` + nginx + `docker-entrypoint.staging.sh`
