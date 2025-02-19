---
sidebar_position: 3
---

# GitLab CI Integration

This guide shows how to integrate x-fidelity into your GitLab CI/CD pipelines.

## Basic Pipeline Configuration

Create `.gitlab-ci.yml` in your repository:

```yaml
image: node:18

stages:
  - test

x-fidelity:
  stage: test
  before_script:
    - yarn global add x-fidelity
    - export PATH="$PATH:$(yarn global bin)"
  script:
    - xfidelity . --configServer https://config-server.example.com
  variables:
    OPENAI_API_KEY: $OPENAI_API_KEY
    XFI_SHARED_SECRET: $XFI_SHARED_SECRET
```

## Advanced Configuration

### With OpenAI Integration

```yaml
x-fidelity:
  script:
    - xfidelity . -o true
  variables:
    OPENAI_API_KEY: $OPENAI_API_KEY
    OPENAI_MODEL: 'gpt-4'
```

### With Local Config

```yaml
x-fidelity:
  script:
    - xfidelity . --localConfigPath ./config
```

### With Custom Archetype

```yaml
x-fidelity:
  script:
    - xfidelity . --archetype java-microservice
```

## GitLab CI Specific Features

### Caching Dependencies

```yaml
x-fidelity:
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .yarn
```

### Matrix Testing

```yaml
x-fidelity:
  parallel:
    matrix:
      - ARCHETYPE: [node-fullstack, java-microservice]
  script:
    - xfidelity . --archetype $ARCHETYPE
```

### Pipeline Artifacts

```yaml
x-fidelity:
  artifacts:
    reports:
      junit: results.xml
    paths:
      - results.json
    expire_in: 1 week
```

## Environment Variables

Set these in your GitLab CI/CD variables:

- `OPENAI_API_KEY`: For OpenAI integration
- `XFI_SHARED_SECRET`: For config server authentication
- `CONFIG_SERVER_URL`: Your config server URL

## Best Practices

1. **Secrets Management**: Use GitLab CI/CD variables for sensitive data
2. **Caching**: Implement proper caching strategy
3. **Versioning**: Pin dependency versions
4. **Error Handling**: Add proper error handling
5. **Notifications**: Configure notifications for failures

## Example Projects

Check out these example repositories:
- [x-fidelity-node-example](https://gitlab.com/example/x-fidelity-node)
- [x-fidelity-java-example](https://gitlab.com/example/x-fidelity-java)

## Troubleshooting

Common issues and solutions:

1. **Authentication Failures**:
   - Check variable configuration
   - Verify environment variables

2. **Timeout Issues**:
   - Increase job timeout
   - Optimize analysis scope

3. **Cache Problems**:
   - Clear cache
   - Update cache key
