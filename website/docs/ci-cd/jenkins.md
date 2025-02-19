---
sidebar_position: 4
---

# Jenkins Integration

This guide shows how to integrate x-fidelity into your Jenkins pipelines.

## Basic Pipeline Configuration

Create `Jenkinsfile` in your repository:

```groovy
pipeline {
    agent {
        docker {
            image 'node:18'
        }
    }
    
    stages {
        stage('x-fidelity') {
            steps {
                sh '''
                    yarn global add x-fidelity
                    export PATH="$PATH:$(yarn global bin)"
                    xfidelity . --configServer https://config-server.example.com
                '''
            }
            environment {
                OPENAI_API_KEY = credentials('openai-api-key')
                XFI_SHARED_SECRET = credentials('xfi-shared-secret')
            }
        }
    }
}
```

## Advanced Configuration

### With OpenAI Integration

```groovy
stage('x-fidelity') {
    steps {
        sh 'xfidelity . -o true'
    }
    environment {
        OPENAI_API_KEY = credentials('openai-api-key')
        OPENAI_MODEL = 'gpt-4'
    }
}
```

### With Local Config

```groovy
stage('x-fidelity') {
    steps {
        sh 'xfidelity . --localConfigPath ./config'
    }
}
```

### With Custom Archetype

```groovy
stage('x-fidelity') {
    steps {
        sh 'xfidelity . --archetype java-microservice'
    }
}
```

## Jenkins Specific Features

### Parallel Execution

```groovy
stage('x-fidelity') {
    parallel {
        stage('node-fullstack') {
            steps {
                sh 'xfidelity . --archetype node-fullstack'
            }
        }
        stage('java-microservice') {
            steps {
                sh 'xfidelity . --archetype java-microservice'
            }
        }
    }
}
```

### Artifacts

```groovy
post {
    always {
        archiveArtifacts artifacts: 'results.json', fingerprint: true
        junit 'results.xml'
    }
}
```

### Notifications

```groovy
post {
    failure {
        emailext (
            subject: "x-fidelity Check Failed: ${env.JOB_NAME} [${env.BUILD_NUMBER}]",
            body: "Check console output at ${env.BUILD_URL}",
            to: 'team@example.com'
        )
    }
}
```

## Environment Variables

Set these in Jenkins credentials:

- `openai-api-key`: For OpenAI integration
- `xfi-shared-secret`: For config server authentication
- `config-server-url`: Your config server URL

## Best Practices

1. **Secrets Management**: Use Jenkins credentials for sensitive data
2. **Workspace Cleanup**: Clean workspace before and after builds
3. **Versioning**: Pin dependency versions
4. **Error Handling**: Add proper error handling
5. **Notifications**: Configure notifications for failures

## Example Projects

Check out these example repositories:
- [x-fidelity-node-example](https://github.com/example/x-fidelity-node)
- [x-fidelity-java-example](https://github.com/example/x-fidelity-java)

## Troubleshooting

Common issues and solutions:

1. **Authentication Failures**:
   - Check credentials configuration
   - Verify environment variables

2. **Timeout Issues**:
   - Increase build timeout
   - Optimize analysis scope

3. **Workspace Problems**:
   - Clean workspace
   - Check file permissions
