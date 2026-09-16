# Kubernetes / Kind deployment

Staging-like stack on a local [Kind](https://kind.sigs.k8s.io/) cluster via Helm.
Mirrors [`compose.staging.yml`](../compose.staging.yml): MariaDB + auth-server + payment-service + backend + nginx SPA.

## Philosophy

| Layer | What | Lifecycle |
|-------|------|-----------|
| Cluster | `kind-dev` (shared) | Create once; rarely delete |
| Addons | ingress-nginx | Install once with the cluster |
| App | Helm release in namespace `catalog-eshop` | Install / upgrade / uninstall often |

**Do not** `kind delete` to uninstall this app — that wipes every namespace on the cluster.
Use `helm uninstall` (and optionally `kubectl delete ns catalog-eshop`).

Default exposure is **Ingress + `*.localhost`** on host ports **80/443**, so Kind no longer fights Compose on `4200/8090/8091/9000`.

## Prerequisites

- Kind, kubectl, Helm 3
- Docker **or** Podman (script auto-detects; Podman falls back to `kind load image-archive`)
- Free host ports **80** and **443** (ingress). On Windows, binding `:80` may need elevation depending on your engine.

## Quick start (durable laptop cluster)

```bash
# 1. Shared cluster + ingress-nginx (safe to re-run)
bash deploy/kind/setup-kind-dev.sh

# 2. Build staging images and load into kind-dev
export KIND_CLUSTER_NAME=kind-dev   # default in build-and-load.sh
bash deploy/kind/build-and-load.sh
# Podman: tags localhost/eshop-*:staging — install with -f values-podman.yaml

# 3. Install app into its namespace only
helm upgrade --install catalog-eshop deploy/helm/catalog-eshop \
  -n catalog-eshop --create-namespace
# Podman add: -f deploy/helm/catalog-eshop/values-podman.yaml

# 4. Wait + smoke
kubectl -n catalog-eshop wait --for=condition=available --timeout=300s \
  deploy/mariadb deploy/auth-server deploy/payment-service deploy/backend deploy/frontend

curl -fsS http://catalog.localhost/ >/dev/null
curl -fsS http://api.catalog.localhost/actuator/health
curl -fsS http://auth.catalog.localhost/actuator/health
```

Open http://catalog.localhost — demo users `user` / `password` (also `manager`, `admin`).

| Host | Service |
|------|---------|
| `catalog.localhost` | frontend |
| `api.catalog.localhost` | backend |
| `auth.catalog.localhost` | auth-server |
| `payment.catalog.localhost` | payment-service |

## Optional: Compose-parity NodePorts

If you need the old `localhost:4200` / `:8090` / … URLs (and matching Kind `extraPortMappings`):

```bash
helm upgrade --install catalog-eshop deploy/helm/catalog-eshop \
  -n catalog-eshop --create-namespace \
  -f deploy/helm/catalog-eshop/values-nodeport.yaml
```

That mode **does** conflict with Compose on those ports. Prefer Ingress defaults.

## Layout

| Path | Role |
|------|------|
| [`kind/kind-dev.yaml`](kind/kind-dev.yaml) | Durable shared cluster (80/443 → ingress) |
| [`kind/setup-kind-dev.sh`](kind/setup-kind-dev.sh) | Create/reuse kind-dev + install ingress-nginx |
| [`kind/cluster-config.yaml`](kind/cluster-config.yaml) | Ephemeral CI cluster (`catalog-eshop`) |
| [`kind/cluster-config-nodeport.yaml`](kind/cluster-config-nodeport.yaml) | Optional Compose-parity NodePort cluster |
| [`kind/create-cluster.sh`](kind/create-cluster.sh) | Create CI-style cluster only |
| [`kind/build-and-load.sh`](kind/build-and-load.sh) | Build `*:staging` images + `kind load` |
| [`helm/catalog-eshop/`](helm/catalog-eshop/) | Helm chart (Deployments, Services, Ingress, PVCs, …) |

## Wiring

- Browser / JWT `iss`: `http://auth.catalog.localhost`
- Backend JWKS: `http://auth-server:9000/oauth2/jwks` (cluster DNS)
- JDBC host: Service name `mariadb`
- Payment webhook: `http://backend:8090/...` (in-cluster)
- SPA `/env.js` from frontend container env (staging entrypoint)
- Auth JWK PVC at `/opt/app/data`; MariaDB PVC for data + init SQL for `catalog_auth`

## kubectl context / namespace

```bash
kubectl config get-contexts
kubectl config use-context kind-kind-dev
kubectl config set-context --current --namespace=catalog-eshop
```

## Uninstall (app only)

```bash
helm uninstall catalog-eshop -n catalog-eshop
# Optional: drop PVCs with the namespace
kubectl delete ns catalog-eshop
```

Leave `kind-dev` running for other apps. Nuclear option only when you intend to wipe the whole local cluster:

```bash
kind delete cluster --name kind-dev
```
