# Kubernetes / Kind deployment

Staging-like stack on a local [Kind](https://kind.sigs.k8s.io/) cluster via Helm. Mirrors [`compose.staging.yml`](../compose.staging.yml): MariaDB + auth-server + payment-service + backend + nginx SPA.

## Prerequisites

- Kind, kubectl, Helm 3
- Docker **or** Podman (script auto-detects; Podman falls back to `kind load image-archive`)
- Free host ports `4200`, `8090`, `8091`, `9000` (same as Compose — do **not** run Compose and Kind stacks together)

## Quick start

```bash
# 1. Cluster (extraPortMappings → localhost ports)
bash deploy/kind/create-cluster.sh

# 2. Build staging images and load into Kind
bash deploy/kind/build-and-load.sh
# Podman: tags localhost/eshop-*:staging — install with -f values-podman.yaml
# Docker / CI: eshop-*:staging (default values.yaml)

# 3. Install
helm upgrade --install catalog-eshop deploy/helm/catalog-eshop \
  -n catalog-eshop --create-namespace
# Podman add: -f deploy/helm/catalog-eshop/values-podman.yaml

# 4. Wait + smoke
kubectl -n catalog-eshop wait --for=condition=available --timeout=300s \
  deploy/mariadb deploy/auth-server deploy/payment-service deploy/backend deploy/frontend

curl -fsS http://localhost:4200/ >/dev/null
curl -fsS http://localhost:8090/actuator/health
curl -fsS http://localhost:9000/actuator/health
```

Open http://localhost:4200 — demo users `user` / `password` (also `manager`, `admin`).

## Layout

| Path | Role |
|------|------|
| [`kind/cluster-config.yaml`](kind/cluster-config.yaml) | Kind cluster + host↔NodePort maps |
| [`kind/create-cluster.sh`](kind/create-cluster.sh) | Create cluster |
| [`kind/build-and-load.sh`](kind/build-and-load.sh) | Build `*:staging` images + `kind load` |
| [`helm/catalog-eshop/`](helm/catalog-eshop/) | Helm chart (Deployments, Services, PVCs, ConfigMap, Secret) |

## Wiring (same as Compose)

- Browser / JWT `iss`: `http://localhost:9000`
- Backend JWKS: `http://auth-server:9000/oauth2/jwks` (cluster DNS)
- JDBC host: Service name `mariadb`
- Payment webhook: `http://backend:8090/...`
- SPA `/env.js` from frontend container env (staging entrypoint)
- Auth JWK PVC at `/opt/app/data`; MariaDB PVC for data + init SQL for `catalog_auth`

## Uninstall

```bash
helm uninstall catalog-eshop -n catalog-eshop
kind delete cluster --name catalog-eshop
```

PVCs are retained until the namespace is deleted (`kubectl delete ns catalog-eshop`).
