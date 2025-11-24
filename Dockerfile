# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Declarar ARGs para todas las API keys y configuraciones
# Google Gemini API
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}

# Firebase Configuration
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
ENV VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
ENV VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
ENV VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}
ENV VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}
ENV VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}

# Debug: Verificar que las variables están presentes (sin mostrar valores completos)
RUN echo "🔍 Verificando variables de entorno..." && \
    if [ -z "$VITE_GEMINI_API_KEY" ]; then echo "❌ WARNING: VITE_GEMINI_API_KEY is empty!"; else echo "✅ Gemini API Key is set (length: $(echo -n $VITE_GEMINI_API_KEY | wc -c) chars)"; fi && \
    if [ -z "$VITE_FIREBASE_API_KEY" ]; then echo "⚠️  VITE_FIREBASE_API_KEY is empty (will use fallback)"; else echo "✅ Firebase API Key is set"; fi && \
    if [ -z "$VITE_FIREBASE_PROJECT_ID" ]; then echo "⚠️  VITE_FIREBASE_PROJECT_ID is empty (will use fallback)"; else echo "✅ Firebase Project ID: $VITE_FIREBASE_PROJECT_ID"; fi

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Cache busting - add a build timestamp to force fresh builds
ARG CACHEBUST=1
RUN echo "Cache bust: ${CACHEBUST}"

# Copy source code (excepto archivos en .dockerignore)
COPY . .

# FORZAR la eliminación de cualquier archivo .env* que se haya copiado
RUN rm -f .env* && echo "Removed any existing .env files"

# Crear un NUEVO archivo .env con todas las variables de entorno necesarias
RUN echo "VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}" > .env && \
    echo "VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}" >> .env && \
    echo "VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}" >> .env && \
    echo "VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}" >> .env && \
    echo "VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}" >> .env && \
    echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}" >> .env && \
    echo "VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}" >> .env && \
    echo "VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}" >> .env && \
    echo "Created new .env with build-time configuration"

# Verificar el contenido del .env (sin mostrar keys completas)
RUN echo "Contents of .env:" && cat .env | sed 's/AIza.*/AIza***REDACTED***/g' | sed 's/1:.*/1:***REDACTED***/g'

# Build the application - pass ENV variables explicitly to Node.js process
RUN echo "Building with environment variables..." && \
    VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY} \
    VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY} \
    VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN} \
    VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID} \
    VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET} \
    VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID} \
    VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID} \
    VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID} \
    npm run build && \
    echo "Build complete!"

# Verificar que el build generó archivos
RUN ls -la dist/

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

