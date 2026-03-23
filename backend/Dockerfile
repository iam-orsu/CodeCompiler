FROM node:20-slim

# Install system deps required for node-pty compilation and docker invocation
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libc6-dev \
    docker.io \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency mappings
COPY package.json package-lock.json* ./

# Lock dependencies and compile node-pty natively
# (Fallback to install if lockfile doesn't exist yet)
RUN npm ci || npm install

# Copy configuration and source boundaries
COPY tsconfig.json ./
COPY src/ ./src/

# Transpile server
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
