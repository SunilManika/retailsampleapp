FROM node:20-alpine

WORKDIR /app

# Copy backend only
COPY package.json ./
COPY src ./src

RUN npm install --omit=dev

# Create SSL directory for certificate mounting
RUN mkdir -p /etc/ssl/certs /etc/ssl/private

ENV NODE_ENV=production
EXPOSE 4000 4443

CMD ["node", "src/server.js"]

