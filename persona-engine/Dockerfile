FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --progress=false

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY --from=build /app/dist ./dist
EXPOSE 4105
CMD ["node", "dist/server.js"]
