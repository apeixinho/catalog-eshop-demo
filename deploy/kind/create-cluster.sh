#!/usr/bin/env bash
# Create the ephemeral CI-style Kind cluster (catalog-eshop).
# Prefer setup-kind-dev.sh for a durable multi-app local cluster.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="${ROOT}/deploy/kind/cluster-config.yaml"
CLUSTER_NAME="catalog-eshop"

if kind get clusters 2>/dev/null | grep -qx "${CLUSTER_NAME}"; then
  echo "Cluster '${CLUSTER_NAME}' already exists."
  echo "Delete with: kind delete cluster --name ${CLUSTER_NAME}"
  echo "For a shared laptop cluster, use: bash deploy/kind/setup-kind-dev.sh"
  exit 0
fi

kind create cluster --config "${CONFIG}"
kubectl cluster-info --context "kind-${CLUSTER_NAME}"
echo "Kind cluster ready. Install ingress (CI does this), then build-and-load + helm."
echo "Local multi-app tip: bash deploy/kind/setup-kind-dev.sh"
