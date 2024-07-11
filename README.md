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

Install x-fidelity with Node.js 20+ and Yarn:

```sh
corepack enable
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"
```

You may want to add the path line to your `~/.bashrc` or `~/.zshrc` file for persistence.

## Usage

### CLI

To run x-fidelity, use the following command:

```sh
xfidelity --dir <directory> [--configUrl <url>]
```

- `-d --dir <directory>`: The directory of the repository to analyze.  Default is current dir.
- `-c --configUrl <url>`: (Optional) The URL to fetch the configuration from.
- `-a --archetype <archetype>`: (Optional) The archetype to use for analysis. 'node-fullstack' is the default, or 'java-microservice' and these are extensible)

Example for node-fullstack in current dir:

```sh
xfidelity --configUrl https://localhost:8888
```

### Configuration Server

x-fidelity also includes a configuration server that can be used to serve configuration files. To start the server:

1. Navigate to the x-fidelity directory.
2. Run the following command:

```sh
yarn start-config-server
```

By default, the server will start on port 8888. You can then use the server URL as the `--configUrl` parameter when running the CLI.

## OpenAI Integration

To enable OpenAI features for advanced code analysis:

1. Sign up for an account at [OpenAI](https://www.openai.com/).
2. Navigate to the API section and generate a new API key.
3. Set the `OPENAI_API_KEY` environment variable:

```sh
export OPENAI_API_KEY=your_openai_api_key
```

### Disclaimer

Using OpenAI's API may incur costs. Please refer to OpenAI's pricing page for more details.

## Configuration

The configuration file should be a JSON file containing rules, operators, facts, and other settings. You can find example configuration files in the `src/rules` directory of the repository.

## License

This project is licensed under the MIT License.
