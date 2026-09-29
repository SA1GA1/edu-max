FROM node:24.15.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM node:24.15.0-bookworm-slim
ENV NODE_ENV=production PORT=3001 DB_PATH=/app/data/app.sqlite MEDIA_DIR=/app/data/media
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/domain.ts ./src/domain.ts
COPY package.json ./package.json
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD node -e 'fetch("http://127.0.0.1:3001/healthz").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'
CMD ["node", "server/index.mjs"]
