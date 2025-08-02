# Integration Test Container for X-Fidelity Release Workflow
# Simulates GitHub Actions environment for local testing

FROM node:22.16.0-bullseye

# Install dependencies similar to GitHub Actions
RUN apt-get update && apt-get install -y \
    git \
    jq \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install yarn globally (matching workspace requirements)
RUN npm install -g yarn@1.22.22

# Create workspace directory
WORKDIR /workspace

# Set git config for semantic-release
RUN git config --global user.name "Integration Test Bot" && \
    git config --global user.email "test@x-fidelity.com" && \
    git config --global init.defaultBranch master

# Copy package files for dependency installation
COPY package.json yarn.lock ./
COPY packages/*/package.json ./packages/
RUN find packages -name package.json -exec dirname {} \; | xargs -I {} mkdir -p {}

# Install all dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Set environment variables for testing
ENV NODE_ENV=test
ENV CI=true
ENV GITHUB_ACTIONS=true

# Default command runs the integration test
CMD ["./scripts/integration-tests/run-release-integration-test.sh"]