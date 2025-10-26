FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --prefer-offline --no-audit --progress=false || npm install --no-audit --progress=false
COPY . .
EXPOSE 4105
CMD ["npm", "run", "dev"]
