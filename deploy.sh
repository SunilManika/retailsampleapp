#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------
# Required environment variables (set before running this script)
#   OC_TOKEN              OpenShift login token
#   OC_SERVER             OpenShift API server URL
#   DOCKER_USERNAME       Docker Hub username
#   DOCKER_PASSWORD       Docker Hub password
#   NAMESPACE             OpenShift namespace to deploy into
#
# Optional — RAG stack (data-for-ai/rag-retrieval-fastapi-server)
#   DEPLOY_RAG            Set to "true" to build and deploy the RAG server (default: false)
#   WATSONX_URL           IBM Watsonx endpoint URL       (required when DEPLOY_RAG=true)
#   WATSONX_API_KEY       IBM Watsonx API key            (required when DEPLOY_RAG=true)
#   WATSONX_PROJECT_ID    IBM Watsonx project ID         (required when DEPLOY_RAG=true)
#   MILVUS_HOST           Milvus vector DB hostname      (required when DEPLOY_RAG=true)
#   MILVUS_PORT           Milvus vector DB port          (required when DEPLOY_RAG=true)
#   MILVUS_USER           Milvus username                (required when DEPLOY_RAG=true)
#   MILVUS_PASSWORD       Milvus password                (required when DEPLOY_RAG=true)
# ---------------------------------------------------------------

: "${OC_TOKEN:?OC_TOKEN env var is not set}"
: "${OC_SERVER:?OC_SERVER env var is not set}"
: "${DOCKER_USERNAME:?DOCKER_USERNAME env var is not set}"
: "${DOCKER_PASSWORD:?DOCKER_PASSWORD env var is not set}"
: "${NAMESPACE:?NAMESPACE env var is not set}"

# RAG deployment flag — defaults to false
DEPLOY_RAG="${DEPLOY_RAG:-false}"

# RAG variables — only validated when DEPLOY_RAG=true
WATSONX_URL="${WATSONX_URL:-}"
WATSONX_API_KEY="${WATSONX_API_KEY:-}"
WATSONX_PROJECT_ID="${WATSONX_PROJECT_ID:-}"
MILVUS_HOST="${MILVUS_HOST:-}"
MILVUS_PORT="${MILVUS_PORT:-}"
MILVUS_USER="${MILVUS_USER:-}"
MILVUS_PASSWORD="${MILVUS_PASSWORD:-}"

# Validate RAG vars early if DEPLOY_RAG=true
if [[ "$DEPLOY_RAG" == "true" ]]; then
    : "${WATSONX_URL:?WATSONX_URL is required when DEPLOY_RAG=true}"
    : "${WATSONX_API_KEY:?WATSONX_API_KEY is required when DEPLOY_RAG=true}"
    : "${WATSONX_PROJECT_ID:?WATSONX_PROJECT_ID is required when DEPLOY_RAG=true}"
    : "${MILVUS_HOST:?MILVUS_HOST is required when DEPLOY_RAG=true}"
    : "${MILVUS_PORT:?MILVUS_PORT is required when DEPLOY_RAG=true}"
    : "${MILVUS_USER:?MILVUS_USER is required when DEPLOY_RAG=true}"
    : "${MILVUS_PASSWORD:?MILVUS_PASSWORD is required when DEPLOY_RAG=true}"
fi

# ---------------------------------------------------------------
# Detect OS
# ---------------------------------------------------------------
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Linux*)  PLATFORM="linux" ;;
    Darwin*) PLATFORM="mac"   ;;
    *)       echo "[ERROR] Unsupported OS: $OS"; exit 1 ;;
esac

case "$ARCH" in
    x86_64)  OC_ARCH="x86_64" ;;
    arm64|aarch64) OC_ARCH="arm64" ;;
    *)       echo "[ERROR] Unsupported arch: $ARCH"; exit 1 ;;
esac

# ---------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------
OPENSHIFT_VERSION="4.18.28"
JMETER_VERSION="5.6.3"

# NAMESPACE is sourced from the environment (required, validated above)
POSTGRES_LABEL="app=retail-postgres"

BACKEND_IMAGE="docker.io/${DOCKER_USERNAME}/retail-backend:1.0.0"
FRONTEND_IMAGE="docker.io/${DOCKER_USERNAME}/retail-frontend:1.0.0"
POSTGRES_IMAGE="docker.io/${DOCKER_USERNAME}/retail-postgresql:1.0.0"
JMETER_IMAGE="docker.io/${DOCKER_USERNAME}/retail-jmeter:1.0.0-dev"
RAG_IMAGE="docker.io/${DOCKER_USERNAME}/retail-rag-retrieval:1.0.0"

GITHUB_REPO="${GITHUB_REPO:-SunilManika/retailsampleapp}"
GITHUB_ZIP_URL="https://github.com/${GITHUB_REPO}/archive/refs/heads/main.zip"

# Install tools under $HOME so root is never needed
TOOLS_DIR="$HOME/.local/retaildeploy"
JMETER_DIR="$TOOLS_DIR/jmeter"
BIN_DIR="$TOOLS_DIR/bin"
JMETER_HOME="${JMETER_DIR}/apache-jmeter-${JMETER_VERSION}"

mkdir -p "$BIN_DIR" "$JMETER_DIR"
export PATH="$BIN_DIR:$JMETER_HOME/bin:$PATH"

# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
step() { echo; echo "==> $*"; }
info() { echo "    [INFO] $*"; }
fail() { echo "    [ERROR] $*" >&2; exit 1; }

run_cmd() {
    local description="$1"; shift
    info "$description"
    if ! output=$(eval "$*" 2>&1); then
        echo
        echo "    [FAILED] $description"
        echo "    ----- ERROR OUTPUT -----"
        echo "$output"
        echo "    ------------------------"
        exit 1
    fi
}

# Cross-platform download: use curl (available on both macOS and Linux)
download() {
    local url="$1" dest="$2"
    curl -fsSL "$url" -o "$dest"
}

# Cross-platform sed -i (macOS requires an explicit backup suffix)
sedi() {
    if [[ "$PLATFORM" == "mac" ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

spinner() {
    local pid=$1 delay=0.15
    local spin='|/-\'
    while kill -0 "$pid" 2>/dev/null; do
        printf " [%c]  " "$spin"
        spin=${spin#?}${spin%${spin#?}}
        sleep "$delay"
        printf "\b\b\b\b\b\b"
    done
    printf "      \b\b\b\b\b"
}

# ---------------------------------------------------------------
# Prerequisite installation
# ---------------------------------------------------------------
install_prereqs() {
    step "Installing prerequisites"

    if [[ "$PLATFORM" == "linux" ]]; then
        # Linux: use yum if available, otherwise apt-get
        if command -v yum &>/dev/null; then
            info "Using yum (may require sudo if packages are not already installed)"
            sudo yum -y -q install unzip java-11-openjdk podman 2>/dev/null || \
                info "yum install skipped or failed — assuming tools are already present"
        elif command -v apt-get &>/dev/null; then
            info "Using apt-get"
            sudo apt-get -y -q install unzip default-jdk podman 2>/dev/null || \
                info "apt-get install skipped or failed — assuming tools are already present"
        else
            info "No supported package manager found; assuming unzip, java, and podman are pre-installed"
        fi

    elif [[ "$PLATFORM" == "mac" ]]; then
        # macOS: use Homebrew (does not require root)
        if ! command -v brew &>/dev/null; then
            fail "Homebrew is not installed. Install it from https://brew.sh and re-run."
        fi
        for pkg in unzip openjdk podman; do
            if ! brew list "$pkg" &>/dev/null; then
                info "Installing $pkg via Homebrew"
                brew install "$pkg" -q
            else
                info "$pkg already installed"
            fi
        done
    fi

    # Verify critical tools
    for tool in unzip java podman; do
        command -v "$tool" &>/dev/null || fail "$tool is not available. Please install it and re-run."
    done
}

# ---------------------------------------------------------------
# OpenShift CLI
# ---------------------------------------------------------------
install_oc_cli() {
    step "Installing OpenShift CLI (oc)"

    if command -v oc &>/dev/null; then
        info "oc is already installed: $(oc version --client 2>/dev/null | head -1)"
        return
    fi

    local tarball="openshift-client-${PLATFORM}-${OPENSHIFT_VERSION}.tar.gz"
    local url="https://mirror.openshift.com/pub/openshift-v4/${OC_ARCH}/clients/ocp/${OPENSHIFT_VERSION}/${tarball}"

    info "Downloading oc CLI from $url"
    download "$url" "$TOOLS_DIR/$tarball"

    info "Extracting oc CLI to $BIN_DIR"
    tar -xzf "$TOOLS_DIR/$tarball" -C "$BIN_DIR" oc kubectl

    chmod +x "$BIN_DIR/oc" "$BIN_DIR/kubectl"
    info "oc installed: $(oc version --client 2>/dev/null | head -1)"
}

# ---------------------------------------------------------------
# JMeter
# ---------------------------------------------------------------
install_jmeter() {
    step "Installing JMeter $JMETER_VERSION"

    if [[ -x "$JMETER_HOME/bin/jmeter" ]]; then
        info "JMeter already installed at $JMETER_HOME"
        return
    fi

    local zip="apache-jmeter-${JMETER_VERSION}.zip"
    info "Downloading JMeter"
    download "https://dlcdn.apache.org/jmeter/binaries/${zip}" "$JMETER_DIR/$zip"

    info "Unzipping JMeter"
    unzip -qo "$JMETER_DIR/$zip" -d "$JMETER_DIR"
    info "JMeter installed at $JMETER_HOME"
}

# ---------------------------------------------------------------
# Application source
# ---------------------------------------------------------------
download_application() {
    step "Downloading application source"
    info "Downloading retailapp ZIP"
    download "$GITHUB_ZIP_URL" "$HOME/main.zip"
    info "Unzipping repo"
    unzip -qo "$HOME/main.zip" -d "$HOME"
}

update_yaml_images() {
    step "Patching Kubernetes manifests"
    local k8s_dir="$HOME/retailsampleapp-main/k8s"

    # Replace all known hardcoded/placeholder values in every yaml.
    # Handles both the local repo (_PLACEHOLDER) and the downloaded zip
    # (which may still contain the original values: tbb, retail, techxchange).
    for f in "$k8s_dir/"*.yaml; do
        # Docker Hub username
        sedi "s|DOCKER_USERNAME_PLACEHOLDER|${DOCKER_USERNAME}|g"                "$f"
        sedi "s/technologybuildingblocks/${DOCKER_USERNAME}/g"                    "$f"
        # Namespace
        sedi "s/namespace: tbb/namespace: ${NAMESPACE}/g"                        "$f"
        sedi "s/namespace: retail/namespace: ${NAMESPACE}/g"                     "$f"
        sedi "s/namespace: techxchange/namespace: ${NAMESPACE}/g"                "$f"
        # Service account
        sedi "s/serviceAccountName: tbb/serviceAccountName: ${NAMESPACE}/g"      "$f"
        sedi "s/serviceAccountName: retail/serviceAccountName: ${NAMESPACE}/g"   "$f"
        # RAG / JMeter placeholders
        sedi "s|WATSONX_URL_PLACEHOLDER|${WATSONX_URL}|g"                        "$f"
        sedi "s|WATSONX_API_KEY_PLACEHOLDER|${WATSONX_API_KEY}|g"                "$f"
        sedi "s|WATSONX_PROJECT_ID_PLACEHOLDER|${WATSONX_PROJECT_ID}|g"          "$f"
        sedi "s|MILVUS_HOST_PLACEHOLDER|${MILVUS_HOST}|g"                        "$f"
        sedi "s|MILVUS_PORT_PLACEHOLDER|${MILVUS_PORT}|g"                        "$f"
        sedi "s|MILVUS_USER_PLACEHOLDER|${MILVUS_USER}|g"                        "$f"
        sedi "s|MILVUS_PASSWORD_PLACEHOLDER|${MILVUS_PASSWORD}|g"                "$f"
        # JMeter backend route — substituted after the route is known (see rebuild_frontend_with_route)
        # Leave BACKEND_ROUTE_PLACEHOLDER as-is here; it is patched in patch_jmeter_route()
        # Catch-all for any remaining NAMESPACE_PLACEHOLDER
        sedi "s/NAMESPACE_PLACEHOLDER/${NAMESPACE}/g"                            "$f"
    done

    # Patch namespace.yaml name and labels (handles both placeholder and legacy values)
    sedi "s/name: tbb/name: ${NAMESPACE}/g"                   "$k8s_dir/namespace.yaml"
    sedi "s/name: retail/name: ${NAMESPACE}/g"                 "$k8s_dir/namespace.yaml"
    sedi "s/name: techxchange/name: ${NAMESPACE}/g"            "$k8s_dir/namespace.yaml"
    sedi "s/environment: tbb/environment: ${NAMESPACE}/g"      "$k8s_dir/namespace.yaml"
    sedi "s/environment: retail/environment: ${NAMESPACE}/g"    "$k8s_dir/namespace.yaml"
    sedi "s/environment: techxchange/environment: ${NAMESPACE}/g" "$k8s_dir/namespace.yaml"

    info "Namespace set to '${NAMESPACE}' in all manifests"
}

# ---------------------------------------------------------------
# OpenShift
# ---------------------------------------------------------------
oc_login() {
    step "Logging into OpenShift"
    run_cmd "oc login" \
        "oc login --token=$OC_TOKEN --server=$OC_SERVER --insecure-skip-tls-verify=true"
}

create_docker_secret() {
    step "Creating Docker registry pull secret"
    run_cmd "Creating dockerhub-secret" \
        "oc create secret docker-registry dockerhub-secret \
            --docker-server=docker.io \
            --docker-username=$DOCKER_USERNAME \
            --docker-password=$DOCKER_PASSWORD \
            --docker-email=${DOCKER_EMAIL:-noreply@example.com} \
            -n $NAMESPACE || true"
}

prepare_namespace() {
    step "Creating namespace and applying SCC"
    run_cmd "Apply namespace" "oc apply -f $HOME/retailsampleapp-main/k8s/namespace.yaml"
    run_cmd "Create service account" \
        "oc create serviceaccount $NAMESPACE -n $NAMESPACE || true"
    run_cmd "Apply SCC to service account" \
        "oc adm policy add-scc-to-user anyuid -z $NAMESPACE -n $NAMESPACE"
    run_cmd "Link pull secret to service account" \
        "oc secrets link $NAMESPACE dockerhub-secret --for=pull -n $NAMESPACE"
}

deploy_manifests() {
    step "Applying Kubernetes manifests (core)"
    local k8s_dir="$HOME/retailsampleapp-main/k8s"
    # Apply every yaml except the three RAG-specific ones
    for f in "$k8s_dir/"*.yaml; do
        case "$(basename "$f")" in
            rag-deployment.yaml|rag-service.yaml|rag-route.yaml|rag-secrets.yaml) continue ;;
        esac
        run_cmd "Apply $(basename "$f")" "oc apply -f $f"
    done
}

deploy_rag_manifests() {
    step "Applying RAG manifests"
    local k8s_dir="$HOME/retailsampleapp-main/k8s"
    run_cmd "Apply rag-secrets.yaml"    "oc apply -f $k8s_dir/rag-secrets.yaml"
    run_cmd "Apply rag-deployment.yaml" "oc apply -f $k8s_dir/rag-deployment.yaml"
    run_cmd "Apply rag-service.yaml"    "oc apply -f $k8s_dir/rag-service.yaml"
    run_cmd "Apply rag-route.yaml"      "oc apply -f $k8s_dir/rag-route.yaml"
}

# ---------------------------------------------------------------
# Container images
# ---------------------------------------------------------------
build_and_push_postgres() {
    step "Building & pushing postgres image"
    cd "$HOME/retailsampleapp-main/postgresql/"
    run_cmd "Build postgres" "podman build --platform linux/amd64 -t $POSTGRES_IMAGE ."
    run_cmd "Push postgres"  "podman push $POSTGRES_IMAGE"
}

build_and_push_jmeter() {
    step "Building & pushing JMeter image"
    cd "$HOME/retailsampleapp-main/jmeter/"
    run_cmd "Build JMeter" "podman build --platform linux/amd64 -t $JMETER_IMAGE ."
    run_cmd "Push JMeter"  "podman push $JMETER_IMAGE"
}

build_and_push_backend() {
    step "Building & pushing backend image"
    cd "$HOME/retailsampleapp-main/backend/"
    run_cmd "Build backend" "podman build --platform linux/amd64 -t $BACKEND_IMAGE ."
    run_cmd "Push backend"  "podman push $BACKEND_IMAGE"
}

build_and_push_rag() {
    step "Building & pushing RAG retrieval image"
    cd "$HOME/retailsampleapp-main/data-for-ai/rag-retrieval-fastapi-server/"
    run_cmd "Build RAG image" "podman build --platform linux/amd64 -t $RAG_IMAGE ."
    run_cmd "Push RAG image"  "podman push $RAG_IMAGE"
}

build_and_push_frontend_initial() {
    step "Building & pushing frontend image (initial, no backend URL)"
    cd "$HOME/retailsampleapp-main/frontend/"
    run_cmd "Build frontend (initial)" \
        "podman build --platform linux/amd64 -t $FRONTEND_IMAGE --build-arg VITE_API_BASE_URL='' ."
    run_cmd "Push frontend (initial)" "podman push $FRONTEND_IMAGE"
}

resolve_routes() {
    step "Resolving OpenShift routes"
    BACKEND_ROUTE=$(oc get route retail-backend -n "$NAMESPACE" -o jsonpath='{.spec.host}' 2>/dev/null || true)
    [[ -z "$BACKEND_ROUTE" ]] && fail "Could not retrieve backend route."
    info "Backend route : $BACKEND_ROUTE"

    FRONTEND_ROUTE=$(oc get route retail-frontend -n "$NAMESPACE" -o jsonpath='{.spec.host}' 2>/dev/null || true)
    [[ -z "$FRONTEND_ROUTE" ]] && fail "Could not retrieve frontend route."
    info "Frontend route: $FRONTEND_ROUTE"
}

patch_manifests_with_routes() {
    local k8s_dir="$HOME/retailsampleapp-main/k8s"
    step "Patching manifests with live routes"
    # JMeter job — backend API URL
    sedi "s|BACKEND_ROUTE_PLACEHOLDER|https://${BACKEND_ROUTE}/api|g" "$k8s_dir/jmeter-job.yaml"
    # Backend deployment — CORS origin must match the frontend URL
    sedi "s|FRONTEND_URL_PLACEHOLDER|https://${FRONTEND_ROUTE}|g"     "$k8s_dir/backend-deployment.yaml"
    # Re-apply backend deployment so the new FRONTEND_URL env var takes effect
    run_cmd "Re-apply backend deployment" "oc apply -f $k8s_dir/backend-deployment.yaml"
}

rebuild_frontend_with_route() {
    step "Rebuilding frontend image with backend API URL"
    cd "$HOME/retailsampleapp-main/frontend/"
    run_cmd "Build frontend (final)" \
        "podman build --platform linux/amd64 -t $FRONTEND_IMAGE --build-arg VITE_API_BASE_URL=https://$BACKEND_ROUTE/api ."
    run_cmd "Push frontend (final)" "podman push $FRONTEND_IMAGE"
}

restart_deployments() {
    step "Restarting deployments"

    info "Restarting backend"
    oc rollout restart deployment/retail-backend -n "$NAMESPACE" > /dev/null
    (oc rollout status deployment/retail-backend -n "$NAMESPACE" > /dev/null) & spinner $!

    info "Restarting frontend"
    oc rollout restart deployment/retail-frontend -n "$NAMESPACE" > /dev/null
    (oc rollout status deployment/retail-frontend -n "$NAMESPACE" > /dev/null) & spinner $!

    if [[ "$DEPLOY_RAG" == "true" ]]; then
        info "Restarting RAG retrieval API"
        oc rollout restart deployment/rag-retrieval-api -n "$NAMESPACE" > /dev/null
        (oc rollout status deployment/rag-retrieval-api -n "$NAMESPACE" > /dev/null) & spinner $!
    fi
}

load_database() {
    step "Loading database"
    cd "$HOME/retailsampleapp-main"

    info "Waiting for PostgreSQL pod..."
    local POD=""
    for _ in $(seq 1 10); do
        POD=$(oc get pod -n "$NAMESPACE" -l "$POSTGRES_LABEL" \
              -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
        [[ -n "$POD" ]] && break
        sleep 5
    done

    [[ -z "$POD" ]] && fail "PostgreSQL pod not found after waiting."
    info "PostgreSQL pod: $POD"

    run_cmd "Copy SQL dump" \
        "oc cp postgresql/full_dump.sql -n $NAMESPACE $POD:/tmp/full_dump.sql"
    run_cmd "Import database" \
        "oc exec -n $NAMESPACE $POD -- bash -c 'psql -U retail_user -d retaildb < /tmp/full_dump.sql'"
}

# ---------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------
info "Platform  : $OS ($ARCH)"
info "Namespace : $NAMESPACE"
info "Deploy RAG: $DEPLOY_RAG"

install_prereqs
install_oc_cli
install_jmeter

download_application
cd "$HOME/retailsampleapp-main"
update_yaml_images

run_cmd "Podman login to Docker Hub" \
    "podman login -u ${DOCKER_USERNAME} -p '${DOCKER_PASSWORD}' docker.io"

build_and_push_postgres
build_and_push_jmeter
build_and_push_backend
build_and_push_frontend_initial

if [[ "$DEPLOY_RAG" == "true" ]]; then
    build_and_push_rag
fi

oc_login
create_docker_secret

prepare_namespace
deploy_manifests

if [[ "$DEPLOY_RAG" == "true" ]]; then
    deploy_rag_manifests
fi

resolve_routes
patch_manifests_with_routes
rebuild_frontend_with_route
restart_deployments
load_database

step "Deployment completed successfully"
if [[ "$DEPLOY_RAG" == "true" ]]; then
    info "Retail App + RAG retrieval API deployed — images built, database loaded, cluster updated."
else
    info "Retail App deployed (RAG skipped) — images built, database loaded, cluster updated."
fi
