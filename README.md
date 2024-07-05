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

## OpenAI Integration

x-fidelity can integrate with OpenAI to provide advanced code analysis. To enable OpenAI features, you need to set the `OPENAI_API_KEY` environment variable with your OpenAI API key.

### Getting an OpenAI API Key

1. Sign up for an account at [OpenAI](https://www.openai.com/).
2. Navigate to the API section and generate a new API key.
3. Set the `OPENAI_API_KEY` environment variable in your terminal or CI/CD pipeline.

```sh
export OPENAI_API_KEY=your_openai_api_key
```

### Disclaimer

Using OpenAI's API may incur costs. Please refer to OpenAI's pricing page for more details.

## Rules

### Sensitive Logging

This rule checks for the presence of sensitive data in the logs.

```json
{
  "name": "sensitiveLogging",
  "conditions": {
    "any": [
      {
        "fact": "fileData",
        "path": "$.fileContent",
        "operator": "fileContains",
        "value": "token"
      },
      {
        "fact": "fileData",
        "path": "$.fileContent",
        "operator": "fileContains",
        "value": "secret"
      },
      {
        "fact": "fileData",
        "path": "$.fileContent",
        "operator": "fileContains",
        "value": "todo: expand with regex operator for more sensitive data patterns"
      }
    ]
  },
  "event": {
    "type": "violation",
    "params": {
      "message": "Sensitive data must not be logged."
    }
  }
}
```

### Outdated Framework

This rule checks if any core framework dependencies are outdated.

```json
{
  "name": "outdatedFramework",
  "conditions": {
    "all": [
      {
        "fact": "fileData",
        "path": "$.fileName",
        "operator": "outdatedFramework",
        "value": {
          "fact": "dependencyData"
        }
      }    
    ]
  },
  "event": {
    "type": "violation",
    "params": {
      "message": "Some core framework dependencies have expired!",
      "filePath": {
        "fact": "fileData",
        "path": "$.filePath"
      },
      "minimumDependencyVersions": {
        "fact": "dependencyData",
        "path": "$.minimumDependencyVersions"
      }
    }
  }
}
```

### No Databases

This rule ensures that code does not directly call databases.

```json
{
  "name": "noDatabases",
  "conditions": {
    "any": [
      {
        "fact": "fileData",
        "path": "$.fileContent",
        "operator": "fileContains",
        "value": "oracle"
      }
    ]
  },
  "event": {
    "type": "violation",
    "params": {
      "message": "Code must not directly call databases."
    }
  }
}
```

### Non-Standard Directory Structure

This rule checks if the directory structure matches the standard structure.

```json
{
  "name": "nonStandardDirectoryStructure",
  "conditions": {
    "all": [
      {
        "fact": "fileData",
        "path": "$.fileName",
        "operator": "equal",
        "value": "yarn.lock"
      },
      {
        "fact": "fileData",
        "path": "$.filePath",
        "operator": "nonStandardDirectoryStructure",
        "value": {
          "fact": "standardStructure"
        }
      }
    ]
  },
  "event": {
    "type": "violation",
    "params": {
      "message": "Directory structure does not match the standard.",
      "details": {
        "fact": "fileData",
        "path": "$.filePath"
      }
    }
  }
}
```

### OpenAI Analysis

This rule uses OpenAI to analyze the codebase for various issues.

#### Top 5 Issues

```json
{
  "name": "openaiAnalysisTop5Rule",
  "conditions": {
    "all": [
      {
        "fact": "fileData",
        "path": "$.fileName",
        "operator": "equal",
        "value": "yarn.lock"
      },
      {
        "fact": "openaiAnalysis",
        "params": {
          "prompt": "What are the most important 5 things to fix?",
          "resultFact": "openaiAnalysisTop5"
        },
        "operator": "openaiAnalysisHighSeverity",
        "value": 8
      }
    ]
  },
  "event": {
    "type": "violation",
    "params": {
      "message": "OpenAI analysis failed for the provided prompt.",
      "results": {
        "fact": "openaiAnalysisTop5"
      }
    }
  }
}
```

#### Accessibility Issues

```json
{
  "name": "openaiAnalysisA11yRule",
  "conditions": {
    "all": [
      {
        "fact": "fileData",
        "path": "$.fileName",
        "operator": "equal",
        "value": "yarn.lock"
      },
      {
        "fact": "openaiAnalysis",
        "params": {
          "prompt": "Identify any accessibility (a11y) issues in the codebase.",
          "resultFact": "openaiAnalysisA11y"
        },
        "operator": "openaiAnalysisHighSeverity",
        "value": 8
      }
    ]
  },
  "event": {
    "type": "violation",
    "params": {
      "message": "OpenAI analysis detected accessibility (a11y) issues in the codebase.",
      "results": {
        "fact": "openaiAnalysisA11y"
      }
    }
  }
}
```

## License

This project is licensed under the MIT License.
