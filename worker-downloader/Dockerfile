FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY src ./src

# Ensure we use the host's current directory as default if not provided
ENV DOCKER_DOWNLOADS_PATH=/downloads

CMD ["node", "src/index.js"]
