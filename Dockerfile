# ==============================================================================
# Stage 1: Build React + Vite Frontend
# ==============================================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/client

# Public Firebase Web App config (NEVER pass service accounts or backend secrets here)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_API_BASE_URL=/api

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY client/package.json ./
RUN npm install --no-audit --no-fund

COPY client/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Install Production Backend Dependencies Only
# ==============================================================================
FROM node:22-alpine AS backend-deps

WORKDIR /app/server

COPY server/package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# ==============================================================================
# Stage 3: Production Runtime (Google Cloud Run Ready)
# ==============================================================================
FROM node:22-alpine AS production

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV CLIENT_DIST_PATH=/app/client/dist

# Copy backend production node_modules, source, and fallback lesson content
COPY --from=backend-deps --chown=node:node /app/server/node_modules ./node_modules
COPY --chown=node:node server/package.json ./package.json
COPY --chown=node:node server/src ./src
COPY --chown=node:node server/content ./content

# Copy built React SPA static assets for Express to serve
COPY --from=frontend-builder --chown=node:node /app/client/dist /app/client/dist

# Run as non-root user
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
