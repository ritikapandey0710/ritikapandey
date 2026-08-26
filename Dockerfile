FROM node:22-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies using npm
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client
WORKDIR /app/server
RUN npx prisma generate

# Build client
WORKDIR /app/client
RUN npm run build

# Build server (TypeScript to JavaScript)
WORKDIR /app/server
RUN npx tsc -p tsconfig.json

# Expose port
EXPOSE 3001

# Start the server
WORKDIR /app
CMD ["node", "server/dist/index.js"]