# X-Fidelity Basic Plugin Example

This is a basic example plugin for x-fidelity that demonstrates how to create custom operators and facts.

## Installation

```bash
npm install xfi-basic-plugin
```

## Usage

1. Create an extensions file (e.g., `xfi-extensions.js`):

```javascript
const basicPlugin = require('xfi-basic-plugin');
module.exports = basicPlugin;
```

2. Run x-fidelity with the plugin:

```bash
xfidelity -e ./xfi-extensions.js
```

## Features

### Custom Operator: customContains

A simple operator that checks if a string contains a substring.

### Custom Fact: customFileInfo

Provides additional file information including:
- File name
- Content size
- Timestamp

## Example Rule

```json
{
  "name": "custom-check",
  "conditions": {
    "all": [
      {
        "fact": "customFileInfo",
        "operator": "customContains",
        "value": "TODO"
      }
    ]
  },
  "event": {
    "type": "warning",
    "params": {
      "message": "Found TODO in file"
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
