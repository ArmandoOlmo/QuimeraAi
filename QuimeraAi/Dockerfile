# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Supabase Configuration
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_AI_PROXY_URL
ARG VITE_VIDEO_PROXY_URL

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_AI_PROXY_URL=${VITE_AI_PROXY_URL}
ENV VITE_VIDEO_PROXY_URL=${VITE_VIDEO_PROXY_URL}

# Debug: Verificar que las variables están presentes (sin mostrar valores completos)
RUN echo "🔍 Verificando variables de entorno..." && \
    if [ -z "$VITE_SUPABASE_URL" ]; then echo "❌ WARNING: VITE_SUPABASE_URL is empty!"; else echo "✅ Supabase URL is set"; fi && \
    if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then echo "❌ WARNING: VITE_SUPABASE_ANON_KEY is empty!"; else echo "✅ Supabase anon key is set"; fi

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
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env && \
    echo "VITE_AI_PROXY_URL=${VITE_AI_PROXY_URL}" >> .env && \
    echo "VITE_VIDEO_PROXY_URL=${VITE_VIDEO_PROXY_URL}" >> .env && \
    echo "Created new .env with build-time configuration"

# Verificar el contenido del .env (sin mostrar keys completas)
RUN echo "Contents of .env:" && cat .env | sed 's/AIza.*/AIza***REDACTED***/g' | sed 's/1:.*/1:***REDACTED***/g'

# Build the application - pass ENV variables explicitly to Node.js process
RUN echo "Building with environment variables..." && \
    VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY} \
    VITE_AI_PROXY_URL=${VITE_AI_PROXY_URL} \
    VITE_VIDEO_PROXY_URL=${VITE_VIDEO_PROXY_URL} \
    npm run build && \
    echo "Build complete!"

# Verificar que el build generó archivos
RUN ls -la dist/

# Production stage - Use nginx for better reliability
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx configuration
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    # Security headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
}' > /etc/nginx/conf.d/default.conf

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
