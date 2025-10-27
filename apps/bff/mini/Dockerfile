FROM node:20-slim AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --progress=false
COPY . .
EXPOSE 4117
CMD ["node", "server.js"]
