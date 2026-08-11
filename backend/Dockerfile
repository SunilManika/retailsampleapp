FROM node:20-alpine

WORKDIR /app

# Install oc CLI (OpenShift client) needed for cluster operations at runtime.
# Always download the linux-amd64 tarball — this matches the linux/amd64 target
# platform used by the cluster.  Do NOT run `oc version` here: the build host
# may be arm64 (Apple Silicon) and the amd64 binary cannot execute under Rosetta
# inside a build container.
RUN apk add --no-cache curl tar && \
    OC_VERSION="4.18.28" && \
    curl -fsSL "https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/${OC_VERSION}/openshift-client-linux-${OC_VERSION}.tar.gz" \
         -o /tmp/oc.tar.gz && \
    tar -xzf /tmp/oc.tar.gz -C /usr/local/bin oc kubectl && \
    rm /tmp/oc.tar.gz && \
    chmod +x /usr/local/bin/oc /usr/local/bin/kubectl

# Copy backend only
COPY package.json ./
COPY src ./src

RUN npm install --omit=dev

# Create SSL directory for certificate mounting
RUN mkdir -p /etc/ssl/certs /etc/ssl/private

ENV NODE_ENV=production
EXPOSE 4000 4443

CMD ["node", "src/server.js"]

