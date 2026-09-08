# ---- Stage 1: build the frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
# vite.config.js outputs straight into ../backend/public
COPY backend/package.json /app/backend/package.json
RUN npm run build

# ---- Stage 2: backend + built frontend ----
FROM node:20-alpine AS runtime
WORKDIR /app/backend

# better-sqlite3 needs build tools to compile its native binding
RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY backend/ ./
COPY --from=frontend-build /app/backend/public ./public

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
