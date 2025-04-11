# Stage 1: Build MCP Server
FROM node:18 AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:18-slim

# Install Flowise globally
RUN npm install -g flowise

# Create Flowise directory
RUN mkdir -p /root/.flowise

# Copy MCP Server (stdio)
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package*.json ./

# Node and MCP server paths for Linux containers
ENV NODE_PATH=/usr/bin/node
ENV MCP_SERVER_PATH=/app/dist/server.js

# Install MCP deps
RUN npm ci --only=production

# Copy Flowise essentials
COPY Flowise/database.sqlite /root/.flowise/
COPY Flowise/encryption.key /root/.flowise/
COPY Flowise/settings.json /root/.flowise/

# Expose Flowise port only
EXPOSE 3000

# Startup command (Flowise only)
CMD ["flowise", "start"]
