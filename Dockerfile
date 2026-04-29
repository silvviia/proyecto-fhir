# Stage 1 – Build the Angular application
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build -- --configuration production

# Stage 2 – Serve with Nginx
FROM nginx:1.27-alpine

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the compiled Angular app (Angular 17+ outputs to dist/<name>/browser)
COPY --from=builder /app/dist/fhir-ui/browser /usr/share/nginx/html

# Nginx configuration is mounted via docker-compose volume
EXPOSE 80
