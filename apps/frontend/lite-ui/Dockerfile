FROM node:20-slim
WORKDIR /app
ENV SWC_SKIP_VALIDATION=1
COPY package*.json ./
RUN npm install --no-audit --progress=false
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
