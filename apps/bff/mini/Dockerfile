FROM node:20-alpine

# Install build tooling required by native dependencies or npm
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json package-lock.json ./
COPY apps/bff/mini/package.json ./apps/bff/mini/package.json
COPY apps/bff/mini/package-lock.json ./apps/bff/mini/package-lock.json

# Install production dependencies for the mini BFF workspace
RUN npm --prefix apps/bff/mini ci --omit=dev

# Copy the remaining repository (node_modules are excluded via .dockerignore)
COPY . .

# Reinstall to ensure dependencies match the copied sources and prep runtime dirs
RUN npm --prefix apps/bff/mini ci --omit=dev \
  && npm --prefix apps/bff/mini run build || true \
  && mkdir -p /app/logs /app/apps/bff/mini/logs \
  && npm cache clean --force

ENV NODE_ENV=production \
    PORT=8080 \
    WALLET_MODE=local \
    AI_PROVIDER=stub \
    SOUL_CORE_DIR=/app/apps/persona-engine/soul-core \
    WALLET_DATA=/app/apps/bff/mini/data \
    WALLET_DATA_DIR=/app/apps/bff/mini/data \
    WALLET_DATA_FILE=/app/apps/bff/mini/data/wallet.json \
    PERSONA_ENGINE_URL=http://localhost:4105 \
    PROVIDER_FILE=/app/apps/bff/mini/provider.json \
    PRICING_FILE=/app/apps/bff/mini/data/pricing.json

EXPOSE 8080

# Ensure the node user owns runtime dirs before dropping privileges
RUN chown -R node:node /app
USER node

CMD ["npm", "--prefix", "apps/bff/mini", "run", "start"]
