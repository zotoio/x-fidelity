---
sidebar_position: 11
---

# OpenAI Integration

x-fidelity offers advanced AI-powered code analysis through integration with OpenAI's language models. This feature provides in-depth insights and suggestions for improving your codebase.

## Overview

The OpenAI integration:
- Analyzes code patterns and practices
- Identifies potential issues
- Suggests improvements
- Provides severity ratings
- Supports custom prompts

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_api_key_here

# Optional
OPENAI_MODEL=gpt-4  # Default is 'gpt-4'
```

### CLI Options

Enable OpenAI analysis:
```bash
xfidelity . -o true
```

## Creating OpenAI Rules

Rules using OpenAI must:
- Have names starting with 'openai'
- Use the `openaiAnalysis` fact
- Use the `openaiAnalysisHighSeverity` operator

Example rule:
```json
{
    "name": "openaiAnalysisA11y-global",
    "conditions": {
        "all": [
            {
                "fact": "fileData",
                "path": "$.fileName",
                "operator": "equal",
                "value": "REPO_GLOBAL_CHECK"
            },
            {
                "fact": "openaiAnalysis",
                "params": {
                    "prompt": "Identify accessibility issues",
                    "resultFact": "openaiAnalysisA11y"
                },
                "operator": "openaiAnalysisHighSeverity",
                "value": 7
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "OpenAI detected accessibility issues",
            "details": {
                "fact": "openaiAnalysisA11y"
            }
        }
    }
}
```

## Response Format

OpenAI responses follow this structure:
```json
{
    "issues": [
        {
            "issue": "Missing alt text",
            "severity": 8,
            "description": "Images lack alt text for screen readers",
            "filePaths": ["src/components/Image.tsx"],
            "suggestion": "Add alt attributes to all img elements",
            "codeSnippets": [
                {
                    "filePath": "src/components/Image.tsx",
                    "lineNumber": 15,
                    "before": "<img src=\"logo.png\" />",
                    "after": "<img src=\"logo.png\" alt=\"Company logo\" />"
                }
            ]
        }
    ]
}
```

## Best Practices

1. **Cost Management**:
   - Use specific prompts
   - Limit analysis scope
   - Monitor API usage
   - Cache results when possible

2. **Security**:
   - Never send sensitive data
   - Review code before sending
   - Use data masking
   - Set rate limits

3. **Performance**:
   - Use async analysis
   - Implement timeouts
   - Handle API errors
   - Cache responses

4. **Prompts**:
   - Be specific
   - Focus on one aspect
   - Include context
   - Set clear expectations

## Example Rules

### Security Analysis
```json
{
    "name": "openaiSecurityCheck-global",
    "conditions": {
        "all": [
            {
                "fact": "openaiAnalysis",
                "params": {
                    "prompt": "Identify security vulnerabilities",
                    "resultFact": "securityAnalysis"
                },
                "operator": "openaiAnalysisHighSeverity",
                "value": 9
            }
        ]
    },
    "event": {
        "type": "fatality",
        "params": {
            "message": "Critical security issues detected",
            "details": {
                "fact": "securityAnalysis"
            }
        }
    }
}
```

### Performance Analysis
```json
{
    "name": "openaiPerformance-global",
    "conditions": {
        "all": [
            {
                "fact": "openaiAnalysis",
                "params": {
                    "prompt": "Identify performance bottlenecks",
                    "resultFact": "performanceAnalysis"
                },
                "operator": "openaiAnalysisHighSeverity",
                "value": 7
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "Performance issues detected",
            "details": {
                "fact": "performanceAnalysis"
            }
        }
    }
}
```

## Limitations

1. **Cost**: API usage incurs charges
2. **Privacy**: Code is sent to OpenAI
3. **Rate Limits**: API has request limits
4. **Response Time**: Analysis adds processing time
5. **Accuracy**: Results may need human review

## Next Steps

- Configure [Local Rules](local-config)
- Set up [Remote Configuration](remote-config)
- Learn about [Telemetry](telemetry)
