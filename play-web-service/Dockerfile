FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://mirrors.cloud.tencent.com/npm/ \
  && npm ci

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://mirrors.cloud.tencent.com/npm/ \
  && npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV CLOUD_ENV_ID=cloud1-5gsbvhr91440e872
ENV CORS_ALLOW_ORIGIN=*

EXPOSE 3000

CMD ["npm", "start"]
