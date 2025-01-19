# X-Fidelity External API Plugin

This plugin enables x-fidelity to extract values from files using regex and validate them against external APIs.

## Installation

```bash
npm install xfi-external-api-plugin
```

## Usage

Run x-fidelity with the plugin:

```bash
xfidelity -e xfi-external-api-plugin
```

## Features

### Regex Extract Operator

Extracts values from files using configurable regex patterns.

### External API Call Fact

Makes HTTP calls to external APIs with extracted values for validation.

### Sample Rule

```json
{
  "name": "externalApiCheck-iterative",
  "conditions": {
    "all": [
      {
        "fact": "repoFileAnalysis",
        "params": {
          "checkPattern": "version:\\s*['\"]([^'\"]+)['\"]",
          "resultFact": "versionMatch"
        },
        "operator": "regexExtract",
        "value": true
      },
      {
        "fact": "externalApiCall",
        "params": {
          "regex": "version:\\s*['\"]([^'\"]+)['\"]",
          "url": "https://api.example.com/validate-version",
          "method": "POST",
          "includeValue": true,
          "headers": {
            "Content-Type": "application/json"
          }
        },
        "operator": "equal",
        "value": { "success": true }
      }
    ]
  },
  "event": {
    "type": "warning",
    "params": {
      "message": "External API validation failed",
      "details": {
        "fact": "externalApiCall"
      }
    }
  }
}
```

## Development

1. Build the plugin:
```bash
npm run build
```

2. Run tests:
```bash
npm test
```

## Configuration

The external API call fact supports:

- HTTP methods: GET, POST, PUT, DELETE
- Custom headers
- Request timeout
- Including extracted value in request body
