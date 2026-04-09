FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci

# Copy Prisma directory and generate client before building Next.js
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

# Build the Next.js application
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

# Copy necessary files from the builder phase
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Expose network port
EXPOSE 3000

# Map necessary runtime environments
ENV NODE_ENV=production
ENV PORT=3000

# Initialize data directory for SQLite mounting
RUN mkdir -p /app/data

# Setup entry command to securely generate Prisma models, sync database, and launch production web server
CMD ["sh", "-c", "npx prisma generate && npx prisma db push --accept-data-loss && npm start"]
