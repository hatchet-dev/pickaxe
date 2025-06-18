# Stage 1: Build
FROM node:22 AS builder

WORKDIR /app

COPY package\*.json ./

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

COPY package\*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/main.js"]