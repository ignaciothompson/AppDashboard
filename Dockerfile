# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --configuration production

# Stage 2: Setup Backend
FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ ./

# Copy built frontend to backend public folder
# Using generic dist path, adjust if angular.json differs
COPY --from=frontend-build /app/frontend/dist/frontend/browser ./public

# Create data directory
RUN mkdir -p data

# Expose port
EXPOSE 3000

# Start
CMD ["node", "server.js"]
