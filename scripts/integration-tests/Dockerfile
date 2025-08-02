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

# Create workspace directory with proper permissions
WORKDIR /workspace

# Create user with same UID as host to avoid permission issues
RUN groupadd -r testuser && useradd -r -g testuser -u 1000 testuser

# Set git config for semantic-release
RUN git config --global user.name "Integration Test Bot" && \
    git config --global user.email "test@x-fidelity.com" && \
    git config --global init.defaultBranch master && \
    git config --global --add safe.directory /workspace

# Copy package files for dependency installation
COPY package.json yarn.lock ./
COPY packages/*/package.json ./packages/
RUN find packages -name package.json -exec dirname {} \; | xargs -I {} mkdir -p {}

# Install all dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Set proper ownership for workspace
RUN chown -R testuser:testuser /workspace

# Set environment variables for testing
ENV NODE_ENV=test
ENV CI=true
ENV GITHUB_ACTIONS=true

# Switch to testuser for proper permissions
USER testuser

# Default command runs the integration test
CMD ["./scripts/integration-tests/run-release-integration-test.sh"]