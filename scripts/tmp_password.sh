#!/usr/bin/env bash
# Temporarily change the retail_user password in the Postgres pod so that the
# backend (which still uses the original password) starts failing DB calls.
# This raises the erroneous call rate in Instana.
#
# To keep backend pods in the Service (so traffic still reaches them and
# Instana keeps reporting Calls / Erroneous call rate / Latency), the backend
# readiness probe is switched from /health/ready (runs SELECT 1) to
# /health/live (no DB access). restore_password.sh switches it back.
#
# Usage: ./tmp_password.sh <namespace> [temporary_password]
# Undo:  ./restore_password.sh <namespace> [original_password]

set -euo pipefail

NAMESPACE="${1:?Usage: $0 <namespace> [temporary_password]}"
#TMP="${2:-wrong_123}"
TMP="${2:-wrong_password_123}"
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

echo "Switching $BACKEND_DEPLOYMENT readiness probe to /health/live so pods stay in the Service ..."
oc patch deployment "$BACKEND_DEPLOYMENT" -n "$NAMESPACE" --type=json \
  -p="[{\"op\":\"replace\",\"path\":\"$PROBE_PATH_JSON\",\"value\":\"/health/live\"}]"
oc rollout status deployment/"$BACKEND_DEPLOYMENT" -n "$NAMESPACE" --timeout=180s

echo "Changing password of '$DB_USER' on pod $POD ..."
oc exec -n "$NAMESPACE" "$POD" -- \
  psql -U "$DB_USER" -d "$DB_NAME" -c "ALTER USER $DB_USER WITH PASSWORD '$TMP';"

echo "Terminating existing sessions so the backend must re-authenticate ..."
oc exec -n "$NAMESPACE" "$POD" -- \
  psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename='$DB_USER' AND pid <> pg_backend_pid();"

echo "Done. Backend pods stay Ready; DB calls now fail with 'password authentication failed'."
echo "Generate traffic and watch Calls, Erroneous call rate and Latency in Instana."
echo "Restore with: ./restore_password.sh $NAMESPACE"
