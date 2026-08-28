# AGENTS.md

## Cursor Cloud specific instructions

Monorepo with an Angular SPA and three Spring Boot services. Standard run/build commands live in the root `README.md` (Quick start) and each module's `README.md`; per-service CI steps are in `.github/workflows/*.yml`. Only the non-obvious caveats are listed here.

### Toolchain (non-obvious)
- **Node**: the Angular 22 CLI requires **Node ≥ 22.22.3**. The VM's default `/exec-daemon/node` may be older, so this repo uses an nvm-managed Node 22 (set as the nvm `default`, sourced from `~/.bashrc`). If `ng`/`npm run build` fails with a "minimum Node.js version" error, run `nvm use 22`. CI's `setup-node@v7` with `node-version: "22"` picks a compatible release automatically.
- **Java 21** is required (all POMs set `java.version=21`). **Maven is not preinstalled** — install with `apt-get install -y maven` (3.8.7 works). There is no Maven wrapper.

### Frontend (`frontend/`)
- Angular 22 + TypeScript 6.0. TypeScript is pinned to `~6.0.3` because Angular 22 requires `>=6.0 <6.1` (do not bump to TS 7).
- Test: `npm run test:ci` (Vitest via `ng test --watch=false`). Build: `npm run build`.

### Backend / auth-server / payment-service (Spring Boot 4)
- `backend`, `auth-server`, and `payment-service` run on **Spring Boot 4.1.0** (Spring Framework 7 / Spring Security 7).
- **H2 uses the Boot 4.1.0 default (2.4.240).** H2 2.4.x removed the non-standard `DATETIME` keyword, so the H2 dev/test Flyway migrations use `TIMESTAMP(6)` instead (H2 is dev/test-only; staging uses MariaDB, which keeps `DATETIME(6)`). The H2 `V4` migration was rewritten in place — acceptable because these are dev/test databases (recreated on each run), but note Flyway `validate-on-migrate` is on, so avoid editing migrations already applied to a long-lived database.
- Spring Boot 4 modularized auto-config: Flyway (`spring-boot-flyway`), `RestClient.Builder` (`spring-boot-restclient`), and the MockMvc test slice (`spring-boot-starter-webmvc-test`, with `@AutoConfigureMockMvc` now under `org.springframework.boot.webmvc.test.autoconfigure`) must be pulled in explicitly.
- Boot 4 auto-configures a **Jackson 3** (`tools.jackson`) `ObjectMapper`; use that package when autowiring an `ObjectMapper`.
- Test/build a service: `cd <module> && mvn -B test` (CI runs `mvn -B test package`).

### Running the stack
- See `README.md` Quick start (JVM) or Docker Compose. Do **not** run `compose.dev.yml` and `compose.staging.yml` at the same time — they share host ports `4200/8090/8091/9000`. Dev uses H2 + in-memory auth users; demo logins `user`/`password`, `manager`/`password`, and `admin`/`password`.
- Branch promotion, GitHub Rulesets, and required CI checks: [docs/branching-and-ci.md](docs/branching-and-ci.md).
