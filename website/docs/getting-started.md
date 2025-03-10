---
sidebar_position: 2
---

# Getting Started

This guide will help you get up and running with x-fidelity quickly.

## Installation

Install x-fidelity using Node.js 18+ and Yarn:

```bash
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"
```

For persistent access, add the PATH line to your `~/.bashrc` or `~/.zshrc` file.

## run with demo config

1. Run x-fidelity in your project directory:

```bash
xfidelity .
```

2. View the help documentation:

```bash
xfidelity --help
```

## Command Line Options

```bash
Options:
  -d, --dir <directory>                   code directory to analyze
  -a, --archetype <archetype>             archetype to use (default: "node-fullstack")
  -c, --configServer <configServer>       config server URL
  -o, --openaiEnabled <boolean>           enable OpenAI analysis
  -t, --telemetryCollector <url>          telemetry collector URL
  -m, --mode <mode>                       'client' or 'server' (default: "client") 
  -p, --port <port>                       server port (default: "8888")
  -l, --localConfigPath <path>            path to local config
  -j, --jsonTTL <minutes>                 server cache TTL (default: "10")
  -e, --extensions <modules...>           space-separated plugin modules
  -x, --examine                           validate archetype config only
  -v, --version                           output version number
  -h, --help                              display help
```

**Note:** Plugins can be loaded in two ways:
1. Via the `-e` option (CLI-specified plugins)
2. Via the `plugins` array in your archetype configuration

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_MODEL`: OpenAI model to use (default: 'gpt-4')
- `XFI_LISTEN_PORT`: Config server port
- `CERT_PATH`: SSL certificate path
- `NODE_TLS_REJECT_UNAUTHORIZED`: Allow self-signed certs
- `XFI_SHARED_SECRET`: Shared secret for security
- `NOTIFICATIONS_ENABLED`: Enable notification system
- `NOTIFICATION_PROVIDERS`: Comma-separated list of notification providers to use
- `CODEOWNERS_PATH`: Path to CODEOWNERS file (default: .github/CODEOWNERS)
- `CODEOWNERS_ENABLED`: Enable code owners integration

## Example Commands

```bash
# Analyze current directory
xfidelity .

# Use specific archetype
xfidelity . -a java-microservice

# Use remote config server
xfidelity . -c https://config-server.example.com

# Enable OpenAI analysis
xfidelity . -o true

# Run as config server
xfidelity -m server -p 9999

# Use local config
xfidelity . -l /path/to/config

# Load plugins
xfidelity . -e plugin1 plugin2
```

## Next Steps

- Learn about [Archetypes](./archetypes)
- Configure [Rules](./rules)
- Set up [Remote Configuration](./remote-config)
