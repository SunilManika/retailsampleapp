FROM node:20-alpine

WORKDIR /app

# Install oc CLI (OpenShift client) needed for cluster operations
RUN apk add --no-cache curl tar && \
    OC_VERSION="4.18.28" && \
    curl -fsSL "https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/${OC_VERSION}/openshift-client-linux-${OC_VERSION}.tar.gz" \
         -o /tmp/oc.tar.gz && \
    tar -xzf /tmp/oc.tar.gz -C /usr/local/bin oc && \
    rm /tmp/oc.tar.gz && \
    oc version --client

# Copy backend only
COPY package.json ./
COPY src ./src

RUN npm install --omit=dev

# Create SSL directory for certificate mounting
RUN mkdir -p /etc/ssl/certs /etc/ssl/private

ENV NODE_ENV=production
EXPOSE 4000 4443

CMD ["node", "src/server.js"]

