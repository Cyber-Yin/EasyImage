FROM node:20-slim AS base

WORKDIR /app

FROM base AS prod-deps
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile --production

FROM base AS builder
COPY . .
RUN yarn --frozen-lockfile
RUN yarn build

FROM base AS app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
ENV NODE_ENV production

EXPOSE 10002

CMD ["yarn", "start"]