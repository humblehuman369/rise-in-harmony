# Rise In Harmony production image (web + API + Convert worker)
# Includes ffmpeg + rubberband for TrueHz Convert offline DSP.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    rubberband-cli \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install corepack for pinned pnpm version
RUN npm install -g corepack@latest

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY packages ./packages
COPY apps/mobile/package.json ./apps/mobile/package.json

RUN corepack pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

# VITE_* vars must be present at build time so Vite bakes them into the JS bundle.
# Railway automatically passes service variables as build args when using Dockerfile builder.
ARG VITE_APP_ID
ARG VITE_OAUTH_PORTAL_URL
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL

RUN corepack pnpm build

# Drop source maps noise if present; keep dist
EXPOSE 3000

# Health: /healthz  Ready: /readyz
CMD ["node", "dist/index.js"]
