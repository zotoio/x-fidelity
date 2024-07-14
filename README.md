# x-fidelity

CLI for opinionated framework adherence checks

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

## What is x-fidelity?

x-fidelity is a CLI tool designed to enforce adherence to a set of opinionated framework rules within a codebase. It checks for various conditions such as directory structure, dependency versions, and the presence of certain strings in files.

## Features

- Ensures the directory structure matches a predefined standard.
- Verifies that dependencies are up-to-date according to a specified minimum version.
- Checks for the presence or absence of specific strings in files.
- Configurable via a remote JSON configuration file.
- Integrates with OpenAI for advanced code analysis.

## Installation

Install x-fidelity with Node.js 18+ and Yarn:

```sh
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"
```

You may want to add the path line to your `~/.bashrc` or `~/.zshrc` file for persistence of the binary in your path.

## Usage

### CLI

To run x-fidelity, use the following command:

```sh
xfidelity

# you can use the following options for more advanced setups such as the remote config server
xfidelity [-d --dir <directory>] [-c --configUrl <url>] [-a --archtype <archetype>]
```

- `-d --dir <directory>`: (Optional) The root directory of the local repo dir to analyze.  Default is current dir.
- `-c --configUrl <url>`: (Optional) The URL to fetch the configuration from.
- `-a --archetype <archetype>`: (Optional) The archetype to use for analysis. 'node-fullstack' is the default, or 'java-microservice' and these are extensible)

**Example for node-fullstack archetype in current dir with remove config server:**

```sh
xfidelity --configUrl https://localhost:8888
```

**Example for java-microservice archetype in parent dir with remote config server (in this example running locally on port 8888):**

```sh
xfidelity -d .. -a java-microservice --c https://localhost:8888
```

### Configuration Server

x-fidelity includes an optional configuration server that can be used to serve configuration  per archetype.  This includes config for fact provders and custom operators, and also the rule json to use per archetype. 

This is of most use when you need to be able to globally rollout config updates for minor/patch releases without relying cli users run to upgrade x-fidelity.

**To start the server:**

1. Navigate to the x-fidelity directory.
2. Run the following command:

```sh
yarn start-config-server
```

> **By default, the server will start on port 8888**. You can override this using the `XFI_SERVER_PORT` environment variable You can then use the server URL as the `--configUrl` parameter when running the CLI.
```sh
export XFI_SERVER_PORT=8888
```

## OpenAI Integration

To enable OpenAI features for experimental LLM-based codebase analysis:

1. Sign up for a developer account at [OpenAI](https://platform.openai.com).
2. Navigate to the API section and generate a new API key.
3. Set the `OPENAI_API_KEY` environment variable:

```sh
export OPENAI_API_KEY=your_openai_api_key
```
4. Optionally set the OPENAI_MODEL environment var (default is gpt-4o):
```sh
export OPENAI_MODEL=gpt-4
```
Note that not all models consistently return parseable JSON results, so some experimentation is required.

> [!IMPORTANT]
> Using OpenAI's API may incur costs. Please refer to OpenAI's pricing page for more details.
> 
>The 'collectOpenaiAnalysisFacts' function will concatenate all files that are not blacklisted but are included in the whitelist and send this to OpenAI.  Ensure you consider any sensitive data that may be sent, and the cost based on the token count this will be per rule check that is executed.

## Configuration

The configuration for x-fidelity is based on archetypes, which define the rules, operators, facts, and other settings for a specific type of project. You can find example configuration files in the `src/archetypes` directory of the repository.

### Archetype Schema

An archetype is defined with the following structure:

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

- `rules`: An array of rule names to be applied for this archetype.
- `operators`: An array of operator names used in the rules.
- `facts`: An array of fact provider names used to gather information about the codebase.
- `config`: Additional configuration specific to the archetype:
  - `minimumDependencyVersions`: Minimum required versions for dependencies.
  - `standardStructure`: Expected directory structure for the project.
  - `blacklistPatterns`: Patterns for files/directories to be ignored.
  - `whitelistPatterns`: Patterns for files/directories to be included.

### Rule Structure

Each rule is defined in a JSON file with the following structure:

```json
{
  "name": "ruleName",
  "conditions": {
    "all": [
      {
        "fact": "factName",
        "operator": "operatorName",
        "value": "expectedValue"
      }
    ]
  },
  "event": {
    "type": "violation",
    "params": {
      "message": "Error message when the rule fails"
    }
  }
}
```

## Creating New Archetypes

To create a new archetype:

1. Create a new file in the `src/archetypes` directory, e.g., `myNewArchetype.ts`.
2. Define the archetype configuration following the `ArchetypeConfig` interface.
3. Add any necessary rules in the `src/rules` directory.
4. If needed, create custom operators in the `src/operators` directory.
5. If needed, create custom fact providers in the `src/facts` directory.
6. Update the `src/archetypes/index.ts` file to include your new archetype.

Example of a new archetype:

```typescript
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

## Extensibility

x-fidelity is designed to be highly extensible:

1. **Custom Rules**: Create new rules by adding JSON files in the `src/rules` directory.
2. **Custom Operators**: Implement new operators in the `src/operators` directory and add them to `src/operators/index.ts`.
3. **Custom Facts**: Create new fact providers in the `src/facts` directory and add them to `src/facts/index.ts`.
4. **New Archetypes**: As described above, create new archetypes to support different project types or frameworks.

## Hosting Config Servers

To host a config server for x-fidelity:

1. Set up a Node.js server environment (e.g., using Express.js).
2. Implement endpoints that serve the archetype configurations and rules.
3. Ensure the server is secure and can handle the expected load.
4. Use HTTPS for secure communication.
5. Implement caching mechanisms to improve performance.
6. Consider using a CDN for global distribution and lower latency.

Example server setup (simplified):

```javascript
const express = require('express');
const app = express();

app.get('/archetypes/:archetype', (req, res) => {
    const archetype = req.params.archetype;
    // Fetch and return the archetype configuration
});

app.get('/archetypes/:archetype/rules/:rule', (req, res) => {
    const archetype = req.params.archetype;
    const rule = req.params.rule;
    // Fetch and return the specific rule for the archetype
});

app.listen(8888, () => {
    console.log('Config server running on port 8888');
});
```

Best practices for hosting:

- Use environment variables for sensitive information.
- Implement proper error handling and logging.
- Set up monitoring and alerting for the server.
- Regularly update and maintain the server and its dependencies.
- Implement rate limiting to prevent abuse.
- Consider using containerization (e.g., Docker) for easy deployment and scaling.

## License

This project is licensed under the MIT License.
