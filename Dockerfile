FROM node:18-alpine

WORKDIR /app

COPY ./apps/bff/mini/package*.json ./
RUN npm install --production

COPY ./apps/bff/mini .

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
