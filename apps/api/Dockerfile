# Build from repository root: docker build -f apps/api/Dockerfile .
FROM node:20-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api apps/api
COPY apps/web/package.json apps/web/package.json
RUN npm ci
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build -w api

FROM node:20-bookworm-slim
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/package.json /repo/package-lock.json ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
