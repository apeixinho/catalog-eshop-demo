#!/usr/bin/env bash
# Create (or reuse) the durable kind-dev cluster and install ingress-nginx.
# App lifecycle is Helm/namespace — never kind delete for uninstall.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="${ROOT}/deploy/kind/kind-dev.yaml"
CLUSTER_NAME="kind-dev"
CONTEXT="kind-${CLUSTER_NAME}"
# Pinned Kind-provider manifest (ingress-ready node selector + hostNetwork-friendly).
INGRESS_MANIFEST="${INGRESS_NGINX_MANIFEST:-https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/kind/deploy.yaml}"

if kind get clusters 2>/dev/null | grep -qx "${CLUSTER_NAME}"; then
  echo "Cluster '${CLUSTER_NAME}' already exists — reusing."
else
  echo "Creating Kind cluster '${CLUSTER_NAME}'…"
  kind create cluster --config "${CONFIG}"
fi

kubectl config use-context "${CONTEXT}" >/dev/null
kubectl cluster-info --context "${CONTEXT}"

echo "Installing ingress-nginx (Kind provider)…"
kubectl apply -f "${INGRESS_MANIFEST}"
kubectl -n ingress-nginx wait --for=condition=ready pod \
  -l app.kubernetes.io/component=controller --timeout=180s

echo
echo "kind-dev ready (context: ${CONTEXT})."
echo "Next:"
echo "  export KIND_CLUSTER_NAME=${CLUSTER_NAME}"
echo "  bash deploy/kind/build-and-load.sh"
echo "  helm upgrade --install catalog-eshop deploy/helm/catalog-eshop \\"
echo "    -n catalog-eshop --create-namespace"
echo "  # Podman: add -f deploy/helm/catalog-eshop/values-podman.yaml"
echo
echo "Open http://catalog.localhost — uninstall with: helm uninstall catalog-eshop -n catalog-eshop"
echo "Do NOT run: kind delete cluster --name ${CLUSTER_NAME}  (that wipes all apps)"
