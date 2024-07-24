# x-fidelity

x-fidelity is an advanced CLI tool designed to enforce opinionated framework adherence checks within a codebase. It provides a flexible and extensible way to ensure your projects adhere to specific standards and best practices.

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
10. [Contributing](#contributing)
11. [License](#license)

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
xfidelity [-d --dir <directory>] [-c --configUrl <url>] [-a --archetype <archetype>]
```

- `-d --dir <directory>`: Specify the root directory to analyze (default: current directory)
- `-c --configUrl <url>`: URL to fetch the configuration from
- `-a --archetype <archetype>`: Archetype to use for analysis (default: 'node-fullstack')

Examples:

```sh
# Use remote config server
xfidelity --configUrl https://localhost:8888

# Analyze parent directory with java-microservice archetype
xfidelity -d .. -a java-microservice -c https://localhost:8888
```

### Configuration Server

Start the built-in configuration server:

```sh
yarn start-config-server
```

Set a custom port:

```sh
export XFI_SERVER_PORT=8888
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
    config: {
        minimumDependencyVersions: Record<string, string>;
        standardStructure: Record<string, any>;
        blacklistPatterns: string[];
        whitelistPatterns: string[];
    };
}
```

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
2. Set environment variables:

```sh
export OPENAI_API_KEY=your_openai_api_key
export OPENAI_MODEL=gpt-4  # Optional, default is gpt-4o
```

> [!IMPORTANT]
> Be aware of potential costs and data privacy concerns when using OpenAI's API.

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

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
