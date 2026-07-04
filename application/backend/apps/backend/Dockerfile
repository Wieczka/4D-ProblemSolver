# Multi-stage Dockerfile for NestJS Backend in Nx Monorepo
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Generate Prisma Client specifically for the schema path
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma

# Build the NestJS backend
RUN npx nx build backend

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy compiled files and generated prisma client
COPY --from=builder /usr/src/app/dist/apps/backend ./dist
COPY --from=builder /usr/src/app/apps/backend/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
