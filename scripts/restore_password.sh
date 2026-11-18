#!/usr/bin/env bash
# Restore the original retail_user password in the Postgres pod after
# running tmp_password.sh, and switch the backend readiness probe back to
# /health/ready.
#
# Usage: ./restore_password.sh <namespace> [original_password]

set -euo pipefail

NAMESPACE="${1:?Usage: $0 <namespace> [original_password]}"
ORIGINAL_PASSWORD="${2:-retail_password}"
DB_USER="${DB_USER:-retail_user}"
DB_NAME="${DB_NAME:-retaildb}"
BACKEND_DEPLOYMENT="${BACKEND_DEPLOYMENT:-retail-backend}"
PROBE_PATH_JSON='/spec/template/spec/containers/0/readinessProbe/httpGet/path'

POD=$(oc get pods -n "$NAMESPACE" -l app=retail-postgres \
  -o jsonpath='{.items[0].metadata.name}')

if [[ -z "$POD" ]]; then
  echo "No retail-postgres pod found in namespace $NAMESPACE" >&2
  exit 1
fi

echo "Restoring password of '$DB_USER' on pod $POD ..."
oc exec -n "$NAMESPACE" "$POD" -- \
  psql -U "$DB_USER" -d "$DB_NAME" -c "ALTER USER $DB_USER WITH PASSWORD '$ORIGINAL_PASSWORD';"

echo "Switching $BACKEND_DEPLOYMENT readiness probe back to /health/ready ..."
oc patch deployment "$BACKEND_DEPLOYMENT" -n "$NAMESPACE" --type=json \
  -p="[{\"op\":\"replace\",\"path\":\"$PROBE_PATH_JSON\",\"value\":\"/health/ready\"}]"
oc rollout status deployment/"$BACKEND_DEPLOYMENT" -n "$NAMESPACE" --timeout=180s

echo "Done. The backend is using the original password and the original readiness probe."
