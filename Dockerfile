FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.server.json vite.config.ts eslint.config.js index.html ./
COPY client ./client
COPY server ./server
COPY tools ./tools
COPY tests ./tests
COPY fixtures ./fixtures
RUN npm run typecheck && npm run lint && npm test && npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production DATABASE_PATH=/data/banking.sqlite PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force && mkdir /data && chown node:node /data
COPY --from=build /app/dist ./dist
COPY fixtures ./fixtures
USER node
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
