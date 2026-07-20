FROM node:20-slim AS builder

WORKDIR /calcom

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Enable Corepack/Yarn 4
RUN corepack enable

ARG NEXT_PUBLIC_LICENSE_CONSENT
ARG NEXT_PUBLIC_WEBSITE_TERMS_URL
ARG NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL
ARG CALCOM_TELEMETRY_DISABLED
ARG DATABASE_URL
ARG NEXTAUTH_SECRET=secret
ARG CALENDSO_ENCRYPTION_KEY=secret
ARG MAX_OLD_SPACE_SIZE=8192
ARG NEXT_PUBLIC_API_V2_URL
ARG CSP_POLICY
ARG NEXT_PUBLIC_SINGLE_ORG_SLUG
ARG ORGANIZATIONS_ENABLED

ENV NEXT_PUBLIC_WEBAPP_URL=http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER \
    NEXT_PUBLIC_API_V2_URL=$NEXT_PUBLIC_API_V2_URL \
    NEXT_PUBLIC_LICENSE_CONSENT=$NEXT_PUBLIC_LICENSE_CONSENT \
    NEXT_PUBLIC_WEBSITE_TERMS_URL=$NEXT_PUBLIC_WEBSITE_TERMS_URL \
    NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL=$NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL \
    CALCOM_TELEMETRY_DISABLED=$CALCOM_TELEMETRY_DISABLED \
    DATABASE_URL=$DATABASE_URL \
    DATABASE_DIRECT_URL=$DATABASE_URL \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    CALENDSO_ENCRYPTION_KEY=$CALENDSO_ENCRYPTION_KEY \
    NEXT_PUBLIC_SINGLE_ORG_SLUG=$NEXT_PUBLIC_SINGLE_ORG_SLUG \
    ORGANIZATIONS_ENABLED=$ORGANIZATIONS_ENABLED \
    NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE} \
    BUILD_STANDALONE=true \
    CSP_POLICY=$CSP_POLICY

# Root files
COPY package.json yarn.lock .yarnrc.yml turbo.json i18n.json playwright.config.ts ./

# IMPORTANT: keep .yarn because patches are required
COPY .yarn ./.yarn

# Source
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN chmod +x scripts/*

# Install
RUN yarn install

# Build
RUN npx turbo prune --scope=@calcom/web --scope=@calcom/trpc --docker

RUN NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE} \
    yarn workspace @calcom/trpc run build

RUN yarn --cwd packages/embeds/embed-core \
    workspace @calcom/embed-core run build

RUN yarn --cwd apps/web \
    workspace @calcom/web run copy-app-store-static

RUN NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE} \
    yarn --cwd apps/web \
    workspace @calcom/web run build --no-lint --no-typescript

RUN rm -rf \
    node_modules/.cache \
    apps/web/.next/cache

############################################################

FROM node:20-slim AS runner

WORKDIR /calcom

RUN apt-get update && apt-get install -y \
    wget \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY --from=builder /calcom ./

ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000

ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    NODE_ENV=production

RUN chmod +x scripts/*

RUN scripts/replace-placeholder.sh \
    http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER \
    ${NEXT_PUBLIC_WEBAPP_URL}

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --retries=5 \
 CMD wget --spider http://localhost:3000 || exit 1

CMD ["/calcom/scripts/start.sh"]