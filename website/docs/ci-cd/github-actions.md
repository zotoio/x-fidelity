---
sidebar_position: 2
---

# GitHub Actions Integration

This guide shows how to integrate x-fidelity into your GitHub Actions workflows.

## Basic Workflow

Create `.github/workflows/x-fidelity.yml`:

```yaml
name: x-fidelity

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'yarn'
    
    - name: Install x-fidelity
      run: |
        yarn global add x-fidelity
        echo "$(yarn global bin)" >> $GITHUB_PATH
    
    - name: Run x-fidelity
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        XFI_SHARED_SECRET: ${{ secrets.XFI_SHARED_SECRET }}
      run: xfidelity . --configServer https://config-server.example.com
```

## Advanced Configuration

### With OpenAI Integration

```yaml
- name: Run x-fidelity with OpenAI
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    OPENAI_MODEL: 'gpt-4'
  run: xfidelity . -o true
```

### With Local Config

```yaml
- name: Run x-fidelity with local config
  run: xfidelity . --localConfigPath ./config
```

### With Custom Archetype

```yaml
- name: Run x-fidelity with custom archetype
  run: xfidelity . --archetype java-microservice
```

## GitHub Actions Specific Features

### Caching Dependencies

```yaml
- uses: actions/cache@v3
  with:
    path: |
      **/node_modules
      $(yarn cache dir)
    key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
    restore-keys: |
      ${{ runner.os }}-yarn-
```

### Matrix Testing

```yaml
jobs:
  check:
    strategy:
      matrix:
        archetype: [node-fullstack, java-microservice]
    
    steps:
    - name: Run x-fidelity
      run: xfidelity . --archetype ${{ matrix.archetype }}
```

### Pull Request Comments

```yaml
- name: Comment PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v6
  with:
    script: |
      const fs = require('fs');
      const results = JSON.parse(fs.readFileSync('results.json', 'utf8'));
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `x-fidelity results:\n\`\`\`\n${JSON.stringify(results, null, 2)}\n\`\`\``
      });
```

## Environment Variables

Set these in your repository secrets:

- `OPENAI_API_KEY`: For OpenAI integration
- `XFI_SHARED_SECRET`: For config server authentication
- `CONFIG_SERVER_URL`: Your config server URL

## Best Practices

1. **Secrets Management**: Use GitHub Secrets for sensitive data
2. **Caching**: Implement proper caching strategy
3. **Versioning**: Pin action and dependency versions
4. **Error Handling**: Add proper error handling
5. **Notifications**: Configure notifications for failures

## Example Projects

Check out these example repositories:
- [x-fidelity-node-example](https://github.com/example/x-fidelity-node)
- [x-fidelity-java-example](https://github.com/example/x-fidelity-java)

## Troubleshooting

Common issues and solutions:

1. **Authentication Failures**:
   - Check secret configuration
   - Verify environment variables

2. **Timeout Issues**:
   - Increase GitHub Actions timeout
   - Optimize analysis scope

3. **Cache Problems**:
   - Clear cache
   - Update cache key
