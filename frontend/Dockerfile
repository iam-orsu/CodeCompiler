# Node 20 Alpine base for builder stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for clean install
COPY package.json package-lock.json* ./

# Perform a clean install of dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Production optimized build
RUN npm run build

# Node 20 Alpine base for runner stage
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variable to production
ENV NODE_ENV=production

# Create a non-root user with UID 1000
RUN deluser --remove-home node && \
    addgroup -g 1000 runlygroup && \
    adduser -D -u 1000 -G runlygroup runlyuser

# Copy necessary files from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Change ownership to the non-root user
RUN chown -R runlyuser:runlygroup /app

# Switch to non-root user
USER runlyuser

# Expose port 3000
EXPOSE 3000

# Command to run Next.js application in production mode
CMD ["npm", "start"]
