import React, { useState, useCallback, useMemo } from 'react';

// Second file to trigger functionComplexity-iterative rule
// Contains different complexity patterns than ComplexComponent.tsx

interface ProcessingNode {
  id: string;
  type: 'input' | 'process' | 'output' | 'condition' | 'loop';
  data: any;
  connections: string[];
  metadata: Record<string, any>;
}

const OverlyComplexProcessor: React.FC = () => {
  const [nodes, setNodes] = useState<ProcessingNode[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extremely complex function with high cognitive and cyclomatic complexity
  const executeComplexWorkflow = useCallback((
    workflowNodes: ProcessingNode[],
    executionMode: 'sequential' | 'parallel' | 'conditional',
    validationRules: any[],
    transformations: Record<string, any>,
    errorHandling: 'strict' | 'lenient' | 'ignore',
    retryStrategy: any,
    loggingLevel: 'debug' | 'info' | 'warn' | 'error',
    cacheConfig: any,
    performanceThresholds: any
  ) => {
    // High parameter count (9 parameters > 5 threshold)
    
    let processedNodes: ProcessingNode[] = [];
    let errors: any[] = [];
    let warnings: any[] = [];
    let executionStats = {
      totalTime: 0,
      nodesProcessed: 0,
      errorsEncountered: 0,
      warningsGenerated: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Deep nesting and complex conditional logic
    for (const node of workflowNodes) {
      if (node.type === 'input') {
        if (validationRules.length > 0) {
          for (const rule of validationRules) {
            if (rule.enabled) {
              if (rule.type === 'schema') {
                if (node.data) {
                  if (typeof node.data === 'object') {
                    if (Array.isArray(node.data)) {
                      if (node.data.length > 0) {
                        for (let i = 0; i < node.data.length; i++) {
                          if (node.data[i]) {
                            if (rule.schema.properties) {
                              // Deep nesting level 9
                              const validation = validateAgainstSchema(node.data[i], rule.schema);
                              if (!validation.valid) {
                                if (errorHandling === 'strict') {
                                  throw new Error(`Validation failed for node ${node.id}`);
                                } else if (errorHandling === 'lenient') {
                                  warnings.push({ node: node.id, issue: validation.error });
                                }
                              }
                            }
                          }
                        }
                      }
                    } else {
                      // Handle object validation with different complexity
                      const keys = Object.keys(node.data);
                      for (const key of keys) {
                        if (rule.schema.properties[key]) {
                          if (rule.schema.properties[key].required) {
                            if (!node.data[key]) {
                              errors.push({ node: node.id, field: key, error: 'Required field missing' });
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } else if (rule.type === 'custom') {
                // Another complex branch
                try {
                  const customValidation = rule.validator(node.data);
                  if (!customValidation.success) {
                    if (customValidation.severity === 'error') {
                      errors.push({ node: node.id, error: customValidation.message });
                    } else {
                      warnings.push({ node: node.id, warning: customValidation.message });
                    }
                  }
                } catch (validationError) {
                  if (retryStrategy.enabled) {
                    for (let retry = 0; retry < retryStrategy.maxRetries; retry++) {
                      try {
                        const retryResult = rule.validator(node.data);
                        if (retryResult.success) {
                          break;
                        }
                      } catch (retryError) {
                        if (retry === retryStrategy.maxRetries - 1) {
                          errors.push({ node: node.id, error: 'Max retries exceeded' });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } else if (node.type === 'process') {
        // Another complex processing branch
        if (transformations[node.id]) {
          const transformation = transformations[node.id];
          switch (transformation.type) {
            case 'map':
              node.data = node.data.map(transformation.fn);
              break;
            case 'filter':
              node.data = node.data.filter(transformation.fn);
              break;
            case 'reduce':
              node.data = node.data.reduce(transformation.fn, transformation.initial);
              break;
            case 'custom':
              if (transformation.async) {
                // Async processing adds more complexity
                try {
                  node.data = await transformation.fn(node.data);
                } catch (error) {
                  if (errorHandling !== 'ignore') {
                    errors.push({ node: node.id, error: error.message });
                  }
                }
              } else {
                node.data = transformation.fn(node.data);
              }
              break;
            default:
              if (loggingLevel === 'debug') {
                console.log(`Unknown transformation type: ${transformation.type}`);
              }
              break;
          }
        }
      }
      
      processedNodes.push(node);
      executionStats.nodesProcessed++;
    }

    // More complex return logic with multiple conditions  
    if (errors.length > 0 && errorHandling === 'strict') {
      throw new Error(`Processing failed with ${errors.length} errors`);
    } else if (warnings.length > performanceThresholds.maxWarnings) {
      console.warn(`High warning count: ${warnings.length}`);
      return { success: false, processedNodes, errors, warnings, stats: executionStats };
    } else if (executionStats.totalTime > performanceThresholds.maxExecutionTime) {
      return { success: false, reason: 'timeout', processedNodes, stats: executionStats };
    } else {
      return { success: true, processedNodes, errors, warnings, stats: executionStats };
    }
  }, []); // useCallback dependency

  // Another complex function with different patterns
  const optimizeNodeConnections = (
    nodes: ProcessingNode[],
    optimizationStrategy: string,
    constraints: any,
    preferences: any
  ) => {
    // Complex graph optimization logic
    const adjacencyMatrix = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(0));
    const nodeMap = new Map<string, number>();
    
    nodes.forEach((node, index) => {
      nodeMap.set(node.id, index);
    });

    // Build adjacency matrix with complex conditions
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.connections && node.connections.length > 0) {
        for (const connectionId of node.connections) {
          const targetIndex = nodeMap.get(connectionId);
          if (targetIndex !== undefined) {
            if (constraints.allowedConnections) {
              if (constraints.allowedConnections[node.type]) {
                if (constraints.allowedConnections[node.type].includes(nodes[targetIndex].type)) {
                  adjacencyMatrix[i][targetIndex] = 1;
                } else {
                  console.warn(`Invalid connection: ${node.type} -> ${nodes[targetIndex].type}`);
                }
              }
            } else {
              adjacencyMatrix[i][targetIndex] = 1;
            }
          }
        }
      }
    }

    return adjacencyMatrix;
  };

  // Helper function with complexity
  const validateAgainstSchema = (data: any, schema: any) => {
    // Simplified validation logic with multiple return paths
    if (!data) return { valid: false, error: 'No data provided' };
    if (!schema) return { valid: false, error: 'No schema provided' };
    if (!schema.properties) return { valid: true };
    
    for (const [key, value] of Object.entries(schema.properties)) {
      if ((value as any).required && !data[key]) {
        return { valid: false, error: `Missing required field: ${key}` };
      }
    }
    
    return { valid: true };
  };

  return (
    <div>
      <h2>Overly Complex Processor</h2>
      <p>This component has extremely complex functions (different patterns from ComplexComponent)</p>
      <button onClick={() => setIsProcessing(true)}>
        Start Complex Processing
      </button>
    </div>
  );
};

export default OverlyComplexProcessor; 