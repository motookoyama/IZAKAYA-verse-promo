# Production Dockerfile for Web (Vite/React frontend)

# --- Build Stage ---
# This stage builds the static assets
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the static site
RUN npm run build

# --- Serve Stage ---
# This stage serves the built assets using Nginx
FROM nginx:1.25-alpine

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets from the builder stage
# The output of vite build is in the 'dist' directory
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Expose the port Nginx will listen on
EXPOSE 8080

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]
