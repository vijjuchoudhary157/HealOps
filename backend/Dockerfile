FROM node:20-alpine

# Install curl for health check
RUN apk add --no-cache curl

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy application source
COPY . .

# Expose API port
EXPOSE 5000

# Health check script
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start script running db:init and then node server
CMD ["sh", "-c", "npm run db:init && npm start"]
