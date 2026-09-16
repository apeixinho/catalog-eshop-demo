#!/usr/bin/env bash
# Build staging images and load them into the Kind cluster.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLUSTER_NAME="${KIND_CLUSTER_NAME:-kind-dev}"
CLI="${CONTAINER_CLI:-}"
if [[ -z "${CLI}" ]]; then
  if command -v docker >/dev/null 2>&1; then
    CLI=docker
  elif command -v podman >/dev/null 2>&1; then
    CLI=podman
  else
    echo "Neither docker nor podman found. Set CONTAINER_CLI." >&2
    exit 1
  fi
fi

load_image() {
  local image="$1"
  echo "=== Loading ${image} into Kind ==="
  if kind load docker-image "${image}" --name "${CLUSTER_NAME}" 2>/tmp/kind-load.err; then
    return 0
  fi
  echo "kind load docker-image failed (common with Podman); using image-archive…"
  local archive
  archive="$(mktemp -t kind-img.XXXXXX.tar)"
  ${CLI} save -o "${archive}" "${image}"
  kind load image-archive "${archive}" --name "${CLUSTER_NAME}"
  rm -f "${archive}"
}

# Podman tags local builds as localhost/<name>; Docker usually omits the prefix.
# Override with --set images.backend.repository=eshop-backend if using Docker Desktop.
IMAGE_PREFIX="${IMAGE_PREFIX:-}"
if [[ "${CLI}" == "podman" && -z "${IMAGE_PREFIX}" ]]; then
  IMAGE_PREFIX="localhost/"
fi

IMAGES=(
  "${IMAGE_PREFIX}eshop-auth-server:staging|${ROOT}/auth-server|Dockerfile.staging"
  "${IMAGE_PREFIX}eshop-payment-service:staging|${ROOT}/payment-service|Dockerfile.staging"
  "${IMAGE_PREFIX}eshop-backend:staging|${ROOT}/backend|Dockerfile.staging"
  "${IMAGE_PREFIX}eshop-frontend:staging|${ROOT}/frontend|Dockerfile.staging"
)

echo "Using container CLI: ${CLI}"
echo "Kind cluster: ${CLUSTER_NAME}"

${CLI} pull mariadb:10
load_image "mariadb:10"

for entry in "${IMAGES[@]}"; do
  IFS='|' read -r image context dockerfile <<< "${entry}"
  echo "=== Building ${image} ==="
  ${CLI} build -t "${image}" -f "${context}/${dockerfile}" "${context}"
done

for image in \
  "${IMAGE_PREFIX}eshop-auth-server:staging" \
  "${IMAGE_PREFIX}eshop-payment-service:staging" \
  "${IMAGE_PREFIX}eshop-backend:staging" \
  "${IMAGE_PREFIX}eshop-frontend:staging"
do
  load_image "${image}"
done

echo "Images loaded. Install with:"
HELM_CMD="helm upgrade --install catalog-eshop ${ROOT}/deploy/helm/catalog-eshop -n catalog-eshop --create-namespace"
if [[ -n "${IMAGE_PREFIX}" ]]; then
  HELM_CMD+=" -f ${ROOT}/deploy/helm/catalog-eshop/values-podman.yaml"
fi
echo "  ${HELM_CMD}"
