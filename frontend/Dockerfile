###############################################
# Stage 1 - Build
###############################################
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definition
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application
COPY . .

# Build argument
ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build React application
RUN npm run build

###############################################
# Stage 2 - Runtime
###############################################
FROM nginx:1.27-alpine

# Remove default content and create nginx temp dirs
RUN rm -rf /usr/share/nginx/html/* \
    && mkdir -p /tmp/nginx_temp/client_body /tmp/nginx_temp/proxy /tmp/nginx_temp/fastcgi /tmp/nginx_temp/uwsgi /tmp/nginx_temp/scgi

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]