#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------
# Required environment variables (set before running this script)
#   OC_TOKEN          OpenShift login token
#   OC_SERVER         OpenShift API server URL
#   DOCKER_USERNAME   Docker Hub username
#   DOCKER_PASSWORD   Docker Hub password
# ---------------------------------------------------------------

: "${OC_TOKEN:?OC_TOKEN env var is not set}"
: "${OC_SERVER:?OC_SERVER env var is not set}"
: "${DOCKER_USERNAME:?DOCKER_USERNAME env var is not set}"
: "${DOCKER_PASSWORD:?DOCKER_PASSWORD env var is not set}"

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

NAMESPACE="tbb"
POSTGRES_LABEL="app=retail-postgres"

BACKEND_IMAGE="docker.io/${DOCKER_USERNAME}/retail-backend:1.0.0"
FRONTEND_IMAGE="docker.io/${DOCKER_USERNAME}/retail-frontend:1.0.0"

GITHUB_ZIP_URL="https://github.com/SunilManika/retailsampleapp/archive/refs/heads/main.zip"

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
    sedi "s/technologybuildingblocks/${DOCKER_USERNAME}/g" "$HOME/retailsampleapp-main/k8s/frontend-deployment.yaml"
    sedi "s/technologybuildingblocks/${DOCKER_USERNAME}/g" "$HOME/retailsampleapp-main/k8s/backend-deployment.yaml"
    sedi "s/namespace: tbb/namespace: ${NAMESPACE}/g"     "$HOME/retailsampleapp-main/k8s/"*.yaml
    sedi "s/name: tbb/name: $NAMESPACE/g"                 "$HOME/retailsampleapp-main/k8s/namespace.yaml"
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
            --docker-email=test123@test.com \
            -n $NAMESPACE || true"
}

prepare_namespace() {
    step "Creating namespace and applying SCC"
    run_cmd "Apply namespace" "oc apply -f $HOME/retailsampleapp-main/k8s/namespace.yaml"
    run_cmd "Apply SCC to service account" \
        "oc adm policy add-scc-to-user anyuid -z techxchange -n $NAMESPACE"
}

deploy_manifests() {
    step "Applying Kubernetes manifests"
    run_cmd "oc apply" "oc apply -f $HOME/retailsampleapp-main/k8s/"
}

# ---------------------------------------------------------------
# Container images
# ---------------------------------------------------------------
build_and_push_backend() {
    step "Building & pushing backend image"
    cd "$HOME/retailsampleapp-main/backend/"
    run_cmd "Build backend" "podman build -t $BACKEND_IMAGE ."
    run_cmd "Push backend"  "podman push $BACKEND_IMAGE"
}

build_and_push_frontend_initial() {
    step "Building & pushing frontend image (initial, no backend URL)"
    cd "$HOME/retailsampleapp-main/frontend/"
    run_cmd "Build frontend (initial)" \
        "podman build -t $FRONTEND_IMAGE --build-arg VITE_API_BASE_URL='' ."
    run_cmd "Push frontend (initial)" "podman push $FRONTEND_IMAGE"
}

rebuild_frontend_with_route() {
    step "Fetching backend route"
    BACKEND_ROUTE=$(oc get route -n "$NAMESPACE" | awk '/retail-backend/{print $2}' || true)
    [[ -z "$BACKEND_ROUTE" ]] && fail "Could not retrieve backend route."
    info "Backend route: $BACKEND_ROUTE"

    step "Rebuilding frontend image with backend API URL"
    cd "$HOME/retailsampleapp-main/frontend/"
    run_cmd "Build frontend (final)" \
        "podman build -t $FRONTEND_IMAGE --build-arg VITE_API_BASE_URL=https://$BACKEND_ROUTE/api ."
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
        "oc cp postgres/full_dump.sql -n $NAMESPACE $POD:/tmp/full_dump.sql"
    run_cmd "Import database" \
        "oc exec -n $NAMESPACE $POD -- bash -c 'psql -U retail_user -d retaildb < /tmp/full_dump.sql'"
}

# ---------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------
info "Platform: $OS ($ARCH)"

install_prereqs
install_oc_cli
install_jmeter

download_application
cd "$HOME/retailsampleapp-main"
update_yaml_images

run_cmd "Podman login to Docker Hub" \
    "podman login -u ${DOCKER_USERNAME} -p '${DOCKER_PASSWORD}' docker.io"

build_and_push_backend
build_and_push_frontend_initial

oc_login
create_docker_secret

prepare_namespace
deploy_manifests

rebuild_frontend_with_route
restart_deployments
load_database

step "Deployment completed successfully"
info "Retail App deployed — images built, database loaded, cluster updated."
