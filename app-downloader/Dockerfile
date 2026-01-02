FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production-dependencies
RUN npm ci --omit=dev

FROM development AS build
RUN npm run build

FROM base AS production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
CMD ["npm", "run", "start"]