# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Use PORT environment variable or default to 8080
CMD ["sh", "-c", "serve -s dist -l ${PORT:-8080}"]

