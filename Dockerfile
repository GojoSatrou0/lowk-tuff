FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js profile-store.js index.html styles.css app-icon.svg manifest.webmanifest ./
COPY src ./src
COPY assets ./assets
COPY database ./database
COPY scripts ./scripts
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
