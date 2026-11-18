FROM node:26.13.1-alpine3.24

WORKDIR /app
COPY package.json ./
COPY src/adapter.ts src/main.ts ./src/

USER node
CMD ["node", "src/main.ts"]
