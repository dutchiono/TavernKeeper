FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package files for dependencies
COPY packages/discord-bot/package.json ./packages/discord-bot/
COPY packages/agents/package.json ./packages/agents/
COPY packages/lib/package.json ./packages/lib/
# Add other packages if needed

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/discord-bot ./packages/discord-bot
COPY packages/agents ./packages/agents
COPY packages/lib ./packages/lib

# Build
RUN pnpm --filter @innkeeper/discord-bot build

# Start
WORKDIR /app/packages/discord-bot
CMD ["node", "dist/index.js"]
