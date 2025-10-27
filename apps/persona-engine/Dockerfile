FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --prefer-offline --no-audit --progress=false || npm install --no-audit --progress=false
EXPOSE 4105
CMD ["npm", "run", "dev"]
