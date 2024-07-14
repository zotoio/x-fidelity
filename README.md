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

The configuration file should be a JSON file containing rules, operators, facts, and other settings. You can find example configuration files in the `src/rules` directory of the repository.

### Rule Structure

Each rule is defined in a JSON file with the following structure:

```json
{
  "name": "ruleName",
  "description": "A brief description of the rule",
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
    "type": "ruleFailure",
    "params": {
      "message": "Error message when the rule fails"
    }
  }
}
```

## License

This project is licensed under the MIT License.
