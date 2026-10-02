# Kubernetes / Kind deployment

Staging-like stack on [Kind](https://kind.sigs.k8s.io/) via Helm — same topology as [`compose.staging.yml`](../compose.staging.yml) (MariaDB, auth-server, payment-service, backend, nginx SPA).

## Model

| Layer | Resource | Lifecycle |
|-------|----------|-----------|
| Cluster | `kind-dev` | Create once |
| Addons | ingress-nginx | Install with the cluster |
| App | Helm release / namespace `catalog-eshop` | Install, upgrade, uninstall |

App teardown is Helm (and optionally `kubectl delete ns catalog-eshop`). `kind delete` destroys the whole cluster.

Default exposure: Ingress + `*.localhost` on host **80/443**, so Kind does not collide with Compose on `4200/8090/8091/9000`.

## Prerequisites

- Kind, kubectl, Helm 3
- Docker or Podman (`build-and-load.sh` auto-detects; Podman uses `kind load image-archive` when needed)
- Host **80** and **443** free for ingress (Windows may require elevation for `:80`)
- After install, `setup-kind-dev.sh` caps ingress-nginx `worker-processes` (avoids fatal worker exits / hung `:80` on Docker Desktop & Podman)

## Quick start

```bash
bash deploy/kind/setup-kind-dev.sh

export KIND_CLUSTER_NAME=kind-dev   # default in build-and-load.sh
bash deploy/kind/build-and-load.sh
# Podman: images tagged localhost/eshop-*:staging → Helm -f values-podman.yaml

helm upgrade --install catalog-eshop deploy/helm/catalog-eshop \
  -n catalog-eshop --create-namespace
# Podman: add -f deploy/helm/catalog-eshop/values-podman.yaml

kubectl -n catalog-eshop wait --for=condition=available --timeout=300s \
  deploy/mariadb deploy/auth-server deploy/payment-service deploy/backend deploy/frontend

curl -fsS http://catalog.localhost/ >/dev/null
curl -fsS http://api.catalog.localhost/actuator/health
curl -fsS http://auth.catalog.localhost/actuator/health
```

Demo credentials: `user` / `password` (`manager`, `admin` likewise).

| Host | Service |
|------|---------|
| `catalog.localhost` | frontend |
| `api.catalog.localhost` | backend |
| `auth.catalog.localhost` | auth-server |
| `payment.catalog.localhost` | payment-service |

## Compose-parity NodePorts (optional)

For `localhost:4200` / `:8090` / … (and matching Kind `extraPortMappings`):

```bash
helm upgrade --install catalog-eshop deploy/helm/catalog-eshop \
  -n catalog-eshop --create-namespace \
  -f deploy/helm/catalog-eshop/values-nodeport.yaml
```

Conflicts with Compose on those ports; Ingress defaults are preferred.

## Layout

| Path | Role |
|------|------|
| [`kind/kind-dev.yaml`](kind/kind-dev.yaml) | Durable shared cluster (80/443 → ingress) |
| [`kind/setup-kind-dev.sh`](kind/setup-kind-dev.sh) | Create/reuse kind-dev + ingress-nginx |
| [`kind/cluster-config.yaml`](kind/cluster-config.yaml) | Ephemeral CI cluster (`catalog-eshop`) |
| [`kind/cluster-config-nodeport.yaml`](kind/cluster-config-nodeport.yaml) | Optional Compose-parity NodePort cluster |
| [`kind/create-cluster.sh`](kind/create-cluster.sh) | CI-style cluster only |
| [`kind/build-and-load.sh`](kind/build-and-load.sh) | Build `*:staging` + `kind load` (MariaDB cluster-pulled) |
| [`helm/catalog-eshop/`](helm/catalog-eshop/) | Chart (Deployments, Services, Ingress, PVCs, …) |

## Wiring

- Browser / JWT `iss`: `http://auth.catalog.localhost`
- Backend JWKS: `http://auth-server:9000/oauth2/jwks` (cluster DNS)
- JDBC: Service `mariadb`
- Payment webhook: `http://backend:8090/...` (in-cluster)
- SPA `/env.js` from frontend container env (staging entrypoint)
- Auth JWK PVC `/opt/app/data`; MariaDB PVC + init SQL for `catalog_auth`

## Context / namespace

```bash
kubectl config use-context kind-kind-dev
kubectl config set-context --current --namespace=catalog-eshop
```

## Uninstall

```bash
helm uninstall catalog-eshop -n catalog-eshop
kubectl delete ns catalog-eshop   # drops PVCs with the namespace
```

Cluster wipe (all workloads on `kind-dev`):

```bash
kind delete cluster --name kind-dev
```
