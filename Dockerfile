# Rise In Harmony production image (web + API + Convert worker)
# Includes ffmpeg + rubberband for TrueHz Convert offline DSP.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    rubberband-cli \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY packages ./packages
COPY apps/mobile/package.json ./apps/mobile/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
RUN pnpm build

# Drop source maps noise if present; keep dist
EXPOSE 3000

# Health: /healthz  Ready: /readyz
CMD ["node", "dist/index.js"]
