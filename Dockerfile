# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Vite frontend (dist) and bundle Express server (server.js)
RUN npm run build
RUN npm run build:server

# Stage 2: Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/public ./public

EXPOSE 4000

CMD ["node", "server.js"]
