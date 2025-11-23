# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Declarar ARG para la API key (disponible durante el build)
# Esta variable debe pasarse con --build-arg durante docker build o gcloud deploy
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (ahora con la variable de entorno disponible)
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

