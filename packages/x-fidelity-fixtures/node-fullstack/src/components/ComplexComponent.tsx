import React, { useState, useEffect } from 'react';
import { Button, Form, Input, Select, Table, Modal, Checkbox } from 'antd';

// This component intentionally has highly complex functions
// This should trigger the functionComplexity-iterative rule

interface ComplexData {
  id: string;
  type: 'A' | 'B' | 'C' | 'D' | 'E';
  status: 'active' | 'inactive' | 'pending' | 'error' | 'processing';
  metadata: Record<string, any>;
  children?: ComplexData[];
}

const ComplexComponent: React.FC = () => {
  const [data, setData] = useState<ComplexData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Extremely complex function with high cyclomatic complexity (20+ paths)
  // High cognitive complexity, deep nesting, many parameters, multiple returns
  const processComplexDataWithManyConditions = (
    inputData: ComplexData[],
    filterType: string,
    sortOrder: string,
    includeInactive: boolean,
    groupBy: string,
    transformOptions: Record<string, any>,
    validationRules: any[],
    processingMode: 'sync' | 'async' | 'batch',
    retryCount: number = 0,
    maxRetries: number = 5
  ): ComplexData[] | Promise<ComplexData[]> | null => {
    // Parameter count > 5, triggering complexity rule
    
    if (!inputData || inputData.length === 0) {
      if (retryCount < maxRetries) {
        return processComplexDataWithManyConditions(
          inputData, filterType, sortOrder, includeInactive, 
          groupBy, transformOptions, validationRules, 
          processingMode, retryCount + 1, maxRetries
        );
      }
      return null; // Return count: 1
    }

    if (processingMode === 'async') {
      return Promise.resolve().then(() => {
        if (inputData.some(item => item.type === 'A')) {
          if (filterType === 'complex') {
            if (sortOrder === 'asc') {
              if (includeInactive) {
                if (groupBy === 'type') {
                  if (transformOptions.enableDeepTransform) {
                    if (validationRules.length > 0) {
                      if (retryCount === 0) {
                        if (inputData.length > 100) {
                          if (transformOptions.batchSize && transformOptions.batchSize > 10) {
                            // Deep nesting level 10
                            return inputData
                              .filter(item => item.status !== 'error')
                              .sort((a, b) => a.id.localeCompare(b.id))
                              .map(item => ({
                                ...item,
                                metadata: { ...item.metadata, processed: true }
                              }));
                          } else {
                            return inputData.slice(0, 50); // Return count: 2
                          }
                        } else {
                          return inputData.reverse(); // Return count: 3
                        }
                      } else {
                        return []; // Return count: 4
                      }
                    } else {
                      return inputData.filter(item => item.type !== 'E'); // Return count: 5
                    }
                  } else {
                    return inputData.map(item => ({ ...item, id: item.id + '_transformed' })); // Return count: 6
                  }
                } else {
                  return inputData.sort((a, b) => a.type.localeCompare(b.type)); // Return count: 7
                }
              } else {
                return inputData.filter(item => item.status === 'active'); // Return count: 8
              }
            } else {
              return inputData.reverse(); // Return count: 9
            }
          } else {
            return inputData.slice(0, 10); // Return count: 10
          }
        } else {
          return []; // Return count: 11 (exceeds threshold of 10)
        }
      });
    }

    // More complex synchronous processing with additional branches
    let result = [...inputData];
    
    switch (filterType) {
      case 'type_A':
        result = result.filter(item => item.type === 'A');
        break;
      case 'type_B':
        result = result.filter(item => item.type === 'B');
        break;
      case 'type_C':
        result = result.filter(item => item.type === 'C');
        break;
      case 'type_D':
        result = result.filter(item => item.type === 'D');
        break;
      case 'type_E':
        result = result.filter(item => item.type === 'E');
        break;
      default:
        // No filtering
        break;
    }

    if (sortOrder === 'asc') {
      result.sort((a, b) => a.id.localeCompare(b.id));
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.id.localeCompare(a.id));
    } else if (sortOrder === 'type') {
      result.sort((a, b) => a.type.localeCompare(b.type));
    }

    return result; // Final return
  };

  // Another complex function with high cognitive complexity
  const validateAndTransformComplexStructure = (
    data: ComplexData,
    rules: any[],
    context: Record<string, any>,
    options: any,
    callback?: (result: any) => void
  ) => {
    // Deep nesting and complex logic
    if (data.type === 'A') {
      if (data.status === 'active') {
        if (data.children && data.children.length > 0) {
          if (rules.some(rule => rule.applies)) {
            if (context.environment === 'production') {
              if (options.strictMode) {
                if (data.metadata.version >= 2) {
                  if (data.metadata.features.includes('advanced')) {
                    // Very deep nesting (level 8)
                    const result = data.children.map(child => {
                      if (child.type === 'B' && child.status !== 'error') {
                        return {
                          ...child,
                          validated: true,
                          transformedAt: new Date().toISOString()
                        };
                      }
                      return child;
                    });
                    
                    if (callback) callback(result);
                    return result;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return data;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Complex Component (triggers complexity rules)</h2>
      <p>This component intentionally has complex functions to trigger X-Fidelity rules.</p>
      
      <Button 
        onClick={() => {
          const result = processComplexDataWithManyConditions(
            data, 'complex', 'asc', true, 'type', 
            { enableDeepTransform: true, batchSize: 20 },
            [{ applies: true }], 'sync'
          );
          console.log('Complex processing result:', result);
        }}
      >
        Process Complex Data
      </Button>
    </div>
  );
};

export default ComplexComponent; 