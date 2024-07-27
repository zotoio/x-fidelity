# x-fidelity

x-fidelity is an advanced CLI tool designed to enforce opinionated framework adherence checks within a codebase. It provides a flexible and extensible way to ensure your projects follow specific standards and best practices.

```
=====================================
 __    __          ________  ______ 
| ##  | ##        | ######## \######
 \##\/  ## ______ | ##__      | ##  
  >##  ## |      \| ##  \     | ##  
 /  ####\  \######| ######    | ##  
|  ## \##\        | ##       _| ##_ 
| ##  | ##        | ##      |   ## \
 \##   \##         \##       \######
                               
-------------------------------------
```

## Quick Start

1. Install x-fidelity:
   ```
   yarn global add x-fidelity
   export PATH="$PATH:$(yarn global bin)"
   ```

2. Run in your project directory:
   ```
   xfidelity
   ```

3. For more options:
   ```
   xfidelity --help
   ```

## Table of Contents

1. [Intent and Purpose](#intent-and-purpose)
2. [Key Features](#key-features)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Configuration](#configuration)
6. [Extending x-fidelity](#extending-x-fidelity)
7. [OpenAI Integration](#openai-integration)
8. [Hosting Config Servers](#hosting-config-servers)
9. [Best Practices](#best-practices)
10. [Linting](#linting)
11. [Contributing](#contributing)
12. [License](#license)

## Intent and Purpose

x-fidelity aims to streamline the process of maintaining code quality and consistency across projects. By providing a flexible, rule-based system, it allows teams to:

- Enforce coding standards and best practices
- Ensure consistent project structures
- Maintain up-to-date dependencies
- Catch potential issues early in the development process
- Integrate advanced code analysis using AI (via OpenAI)

The tool is designed to be highly customizable, allowing teams to define their own archetypes, rules, and checks tailored to their specific needs and tech stacks.

## Key Features

- **Flexible Archetype System**: Define custom project archetypes with specific rules and configurations.
- **Customizable Rules**: Create and apply rules for various aspects of your codebase.
- **Directory Structure Validation**: Ensure your project follows a predefined directory structure.
- **Dependency Version Checking**: Verify that your project uses up-to-date dependencies.
- **Content Analysis**: Search for specific patterns or strings within your codebase.
- **Remote Configuration**: Fetch configurations from a remote server for centralized management.
- **OpenAI Integration**: Leverage AI for advanced code analysis and suggestions.
- **Extensible Architecture**: Easily add new operators, facts, and rules to suit your needs.

## Installation

Install x-fidelity using Node.js 18+ and Yarn:

```sh
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"
```

For persistent access, add the PATH line to your `~/.bashrc` or `~/.zshrc` file.

## Usage

### Basic Usage

Run x-fidelity in your project directory:

```sh
xfidelity
```

### Advanced Usage

Use command-line options for more control:

```sh
xfidelity [-d --dir <directory>] [-c --configServer <url>] [-a --archetype <archetype>] [-m --mode <cli|server>] [-p --port <port>] [-o --openaiEnabled <boolean>] [-t --telemetryCollector <url>] [-l --localConfig <path>]
```

- `-d --dir <directory>`: Specify the root directory to analyze (default: current directory)
- `-c --configServer <url>`: URL to fetch the configuration from. eg. https://localhost:8888
- `-a --archetype <archetype>`: Archetype to use for analysis (default: 'node-fullstack')
- `-m --mode <mode>`: Run mode: 'cli' or 'server' (default: 'cli')
- `-p --port <port>`: Port number for server mode (default: 8888)
- `-o --openaiEnabled <boolean>`: Enable OpenAI analysis (default: false)
- `-t --telemetryCollector <url>`: The URL telemetry data will be sent to for usage analysis
- `-l --localConfig <path>`: Path to local archetype config and rules

Examples:

```sh
# Use remote config server
xfidelity --configServer https://localhost:8888

# Analyze parent directory with java-microservice archetype and enable OpenAI analysis
xfidelity -d .. -a java-microservice -c https://localhost:8888 -o true

# Run in server mode with custom port and specify telemetry collector
xfidelity --mode server --port 9999 -t https://telemetry.example.com

# Use local config and rules
xfidelity -l /path/to/local/config

```

### Configuration Server

Start the built-in configuration server:

```sh
yarn start-server
```

Or use the CLI:

```sh
xfidelity --mode server
```

Set a custom port:

```sh
xfidelity --mode server --port 9999
```

You can also set the port using an environment variable:

```sh
export XFI_SERVER_PORT=8888
xfidelity --mode server
```

## Configuration

x-fidelity uses archetypes to define project-specific configurations. Archetypes specify:

- Rules to apply
- Operators to use
- Facts to gather
- Dependency version requirements
- Standard directory structure
- File patterns to include or exclude

Example archetype structure:

```typescript
interface ArchetypeConfig {
    rules: string[];
    operators: string[];
    facts: string[];
    configUrl?: string;
    config: {
        minimumDependencyVersions: Record<string, string>;
        standardStructure: Record<string, any>;
        blacklistPatterns: string[];
        whitelistPatterns: string[];
    };
}
```

## Telemetry

x-fidelity now includes telemetry functionality to help improve the tool. Telemetry data is sent to a specified collector URL and includes information about the analysis process, such as:

- Archetype used
- Repository path (anonymized)
- File count
- Failure count
- Host information (platform, CPU, memory)
- User information (anonymized username, home directory, shell)

To specify a telemetry collector, use the `-t` or `--telemetryCollector` option:

```sh
xfidelity -t https://telemetry.example.com
```

If no telemetry collector is specified, telemetry data will not be sent.

## Extending x-fidelity

x-fidelity is designed to be highly extensible:

1. **Custom Rules**: Add new JSON rule files in `src/rules`.
2. **Custom Operators**: Implement new operators in `src/operators` and add them to `src/operators/index.ts`.
3. **Custom Facts**: Create new fact providers in `src/facts` and add them to `src/facts/index.ts`.
4. **New Archetypes**: Define new archetypes in `src/archetypes` and include them in `src/archetypes/index.ts`.

Example of creating a new archetype:

```typescript
// src/archetypes/myNewArchetype.ts
export const myNewArchetype: ArchetypeConfig = {
    rules: ['myCustomRule', 'standardRule1', 'standardRule2'],
    operators: ['myCustomOperator', 'standardOperator1'],
    facts: ['myCustomFact', 'standardFact1'],
    config: {
        minimumDependencyVersions: {
            'my-framework': '^2.0.0'
        },
        standardStructure: {
            src: {
                components: null,
                utils: null
            },
            tests: null
        },
        blacklistPatterns: ['.*\\/\\..*', '.*\\/(dist|build)(\\/.*|$)'],
        whitelistPatterns: ['.*\\.(ts|tsx|js|jsx)$']
    }
};
```

## OpenAI Integration

To enable AI-powered code analysis:

1. Sign up for an [OpenAI API key](https://platform.openai.com).
2. Set the OPENAI_API_KEY environment variable:

```sh
export OPENAI_API_KEY=your_openai_api_key
```

3. Enable OpenAI analysis when running x-fidelity:

```sh
xfidelity -o true
```

You can also set the OpenAI model using an environment variable (optional):

```sh
export OPENAI_MODEL=gpt-4  # Optional, default is gpt-4o
```

> [!IMPORTANT]
> Be aware of potential costs and data privacy concerns when using OpenAI's API.

## Local Configuration

You can now use local configuration files for archetypes and rules. To use local configuration, use the `-l` or `--localConfig` option:

```sh
xfidelity -l /path/to/local/config
```

The local config directory should contain:

- Archetype configuration files (e.g., `node-fullstack.json`)
- A `rules` subdirectory containing rule files

## Hosting Config Servers

To host a config server for x-fidelity:

1. Set up a Node.js server (e.g., Express.js)
2. Implement endpoints for archetype configurations and rules
3. Ensure security, scalability, and performance
4. Use HTTPS and implement proper authentication
5. Consider using a CDN for global distribution

Example server setup:

```javascript
const express = require('express');
const app = express();

app.get('/archetypes/:archetype', (req, res) => {
    // Fetch and return archetype configuration
});

app.get('/archetypes/:archetype/rules/:rule', (req, res) => {
    // Fetch and return specific rule
});

app.listen(8888, () => {
    console.log('Config server running on port 8888');
});
```

## Best Practices

1. **Version Control**: Keep your x-fidelity configurations in version control.
2. **Continuous Integration**: Integrate x-fidelity checks into your CI/CD pipeline.
3. **Regular Updates**: Keep your archetypes, rules, and dependencies up to date.
4. **Documentation**: Document custom rules, operators, and archetypes for your team.
5. **Gradual Implementation**: When introducing x-fidelity to an existing project, start with basic checks and gradually increase strictness.
6. **Team Alignment**: Ensure your team understands and agrees on the rules being enforced.
7. **Performance**: Be mindful of the performance impact, especially for large codebases.

## Contributing

Contributions to x-fidelity are welcome! Please refer to the `CONTRIBUTING.md` file for guidelines on how to contribute to this project.

## Linting

This project uses ESLint for static code analysis. To run the linter:

```sh
yarn lint
```

To automatically fix linting issues:

```sh
yarn lint:fix
```

ESLint is also integrated into the CI pipeline and runs alongside unit tests in GitHub Actions.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
