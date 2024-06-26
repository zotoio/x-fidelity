# x-fidelity

cli for opinionated framework adherence checks

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

## Installation

Install x-fidelity with node 20+ and yarn:

```sh
corepack enable
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"
```

You may want to add that path line to ~/.bashrc

## Usage

To run x-fidelity, use the following command:

```sh
xfidelity --dir <directory> [--configUrl <url>]
```

- `--dir <directory>`: The directory of the repository to analyze.
- `--configUrl <url>`: (Optional) The URL to fetch the configuration from.

Example:

```sh
xfidelity --dir ./my-repo --configUrl https://example.com/config.json
```

## Configuration

The configuration file should be a JSON file containing the following structure:

```json
{
  "minimumDependencyVersions": {
    "commander": "^2.0.0",
    "nodemon": "^3.9.0"
  },
  "standardStructure": {
    "src": {
      "core": null,
      "utils": null,
      "operators": null,
      "rules": null,
      "facts": null
    }
  }
}
```

TODO REMOTE CONF + LLM

## License

This project is licensed under the MIT License.
