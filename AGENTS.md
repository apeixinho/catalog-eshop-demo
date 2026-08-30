# AGENTS.md

Agent notes for this monorepo (especially Cursor Cloud). Standard run/build commands are in the root [README.md](README.md) and each module's README; CI steps are in `.github/workflows/*.yml`. Only non-obvious caveats are listed here.

## Toolchain

- **Node**: Angular 22 requires **Node ≥ 22.22.3**. Cloud VM default Node may be older — use nvm (`nvm use 22`). CI `setup-node@v7` with `node-version: "22"` is fine.
- **Java 21** (all POMs). **Maven is not preinstalled** on the Cloud VM — `apt-get install -y maven` (3.8.7 works). No Maven wrapper in repo.

## Frontend (`frontend/`)

- Angular 22 + TypeScript **~6.0.3** (`>=6.0 <6.1`; do not bump to TS 7).
- Test: `npm run test:ci` (Vitest). Build: `npm run build`.
- **Default locale is PT** (`catalog.locale.country` in `localStorage`). E2E and copy-based selectors must pin US English or use locale-neutral selectors (see `e2e/tests/`).

## JVM services (`backend/`, `auth-server/`, `payment-service/`)

Spring Boot **4.1** (Spring Framework 7 / Spring Security 7).

- **H2** (Boot default 2.4.240): dev/test Flyway uses `TIMESTAMP(6)`, not `DATETIME` (removed in H2 2.4.x). MariaDB staging keeps `DATETIME(6)`. Avoid editing H2 migrations already applied to a long-lived DB (`validate-on-migrate` is on).
- Boot 4 modular auto-config — pull in explicitly when needed:
  - Flyway: `spring-boot-flyway`
  - `RestClient.Builder`: `spring-boot-restclient`
  - MockMvc slice: `spring-boot-starter-webmvc-test` (`@AutoConfigureMockMvc` in `org.springframework.boot.webmvc.test.autoconfigure`)
- **Jackson 3** (`tools.jackson` package) for autowired `ObjectMapper`.

### Test / build commands

| Module | Command | Notes |
|--------|---------|--------|
| `backend/` | `mvn -B verify` | JaCoCo **≥75%** instruction coverage (excludes entity/DTO/mapper/config/utils) |
| `auth-server/`, `payment-service/` | `mvn -B test package` | |
| all | `mvn spring-boot:run` | per module |

Backend integration tests: build JWT post-processors via [JwtTestSupport](backend/src/test/java/com/app/catalog/support/JwtTestSupport.java) and the app's `jwtGrantedAuthoritiesConverter` bean — do not hard-code `.authorities(() -> "SCOPE_...")` (roles claim is required for `/manage/**`).

## E2E (`e2e/`)

- Playwright smoke runs in Stack CI after Compose dev is healthy.
- `E2E_BASE_URL` defaults to `http://localhost:4200`.
- Pin US locale in tests (`localStorage.setItem('catalog.locale.country', 'US')`) because the SPA defaults to PT.

## Running the stack

See README Quick start (JVM) or Docker Compose. **Do not** run `compose.dev.yml` and `compose.staging.yml` simultaneously — shared ports `4200/8090/8091/9000`.

Demo logins (dev/staging seed): `user` / `password`, `manager` / `password`, `admin` / `password`.

Branch promotion and required checks: [docs/branching-and-ci.md](docs/branching-and-ci.md).
