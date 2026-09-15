#!/usr/bin/env bash
# Create (or recreate) the Kind cluster for catalog-eshop.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="${ROOT}/deploy/kind/cluster-config.yaml"
CLUSTER_NAME="catalog-eshop"

if kind get clusters 2>/dev/null | grep -qx "${CLUSTER_NAME}"; then
  echo "Cluster '${CLUSTER_NAME}' already exists."
  echo "Delete with: kind delete cluster --name ${CLUSTER_NAME}"
  exit 0
fi

kind create cluster --config "${CONFIG}"
kubectl cluster-info --context "kind-${CLUSTER_NAME}"
echo "Kind cluster ready. Next: deploy/kind/build-and-load.sh && helm install (see deploy/README.md)."
