/**
 * FactValueViewer Component
 * 
 * Expandable view for displaying fact return values.
 */

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, CopyIcon, CheckIcon } from '@radix-ui/react-icons';

export interface FactValueViewerProps {
  /** The fact value to display */
  value: unknown;
  /** Optional label */
  label?: string;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
  /** Maximum depth for nested expansion */
  maxDepth?: number;
  /** Optional className */
  className?: string;
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return `Object { ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''} }`;
  }
  return String(value);
}

/**
 * Get value type for styling
 */
function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'unknown';
}

/**
 * Get color class for value type
 */
function getValueColor(type: string): string {
  switch (type) {
    case 'string': return 'text-green-600 dark:text-green-400';
    case 'number': return 'text-blue-600 dark:text-blue-400';
    case 'boolean': return 'text-purple-600 dark:text-purple-400';
    case 'null':
    case 'undefined': return 'text-gray-500';
    case 'array':
    case 'object': return 'text-orange-600 dark:text-orange-400';
    default: return 'text-foreground';
  }
}

/**
 * Check if value is expandable
 */
function isExpandable(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') return true;
  return false;
}

/**
 * Recursive value renderer
 */
function ValueRenderer({
  value,
  depth = 0,
  maxDepth = 3,
}: {
  value: unknown;
  depth?: number;
  maxDepth?: number;
}): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  
  const type = getValueType(value);
  const color = getValueColor(type);
  const expandable = isExpandable(value) && depth < maxDepth;
  
  // Primitive values
  if (!expandable) {
    return (
      <span className={color}>
        {formatValue(value)}
      </span>
    );
  }
  
  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className={color}>[]</span>;
    }
    
    return (
      <span>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center text-foreground-muted hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-3 h-3" />
          ) : (
            <ChevronRightIcon className="w-3 h-3" />
          )}
        </button>
        <span className={color}>
          {isExpanded ? '[' : `Array(${value.length})`}
        </span>
        {isExpanded && (
          <>
            <div className="ml-4 border-l border-border pl-2">
              {value.map((item, idx) => (
                <div key={idx} className="text-sm">
                  <span className="text-foreground-muted">{idx}: </span>
                  <ValueRenderer value={item} depth={depth + 1} maxDepth={maxDepth} />
                  {idx < value.length - 1 && <span className="text-foreground-muted">,</span>}
                </div>
              ))}
            </div>
            <span className={color}>]</span>
          </>
        )}
      </span>
    );
  }
  
  // Objects
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span className={color}>{'{}'}</span>;
    }
    
    return (
      <span>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center text-foreground-muted hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-3 h-3" />
          ) : (
            <ChevronRightIcon className="w-3 h-3" />
          )}
        </button>
        <span className={color}>
          {isExpanded ? '{' : formatValue(value)}
        </span>
        {isExpanded && (
          <>
            <div className="ml-4 border-l border-border pl-2">
              {entries.map(([key, val], idx) => (
                <div key={key} className="text-sm">
                  <span className="text-cyan-600 dark:text-cyan-400">{key}</span>
                  <span className="text-foreground-muted">: </span>
                  <ValueRenderer value={val} depth={depth + 1} maxDepth={maxDepth} />
                  {idx < entries.length - 1 && <span className="text-foreground-muted">,</span>}
                </div>
              ))}
            </div>
            <span className={color}>{'}'}</span>
          </>
        )}
      </span>
    );
  }
  
  return <span className={color}>{formatValue(value)}</span>;
}

export function FactValueViewer({
  value,
  label,
  defaultExpanded = false,
  maxDepth = 3,
  className = '',
}: FactValueViewerProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      const text = JSON.stringify(value, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };
  
  const expandable = isExpandable(value);
  
  return (
    <div className={`text-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        {expandable && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-foreground-muted hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
            <span className="text-xs">{label || 'View fact data'}</span>
          </button>
        )}
        
        {!expandable && label && (
          <span className="text-xs text-foreground-muted">{label}:</span>
        )}
        
        {!expandable && (
          <span className={getValueColor(getValueType(value))}>
            {formatValue(value)}
          </span>
        )}
        
        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className="ml-auto p-1 text-foreground-muted hover:text-foreground rounded hover:bg-accent"
          title="Copy to clipboard"
        >
          {copied ? (
            <CheckIcon className="w-3 h-3 text-green-500" />
          ) : (
            <CopyIcon className="w-3 h-3" />
          )}
        </button>
      </div>
      
      {/* Expanded content */}
      {expandable && isExpanded && (
        <div className="mt-2 p-2 rounded bg-accent/50 border border-border font-mono text-xs overflow-x-auto">
          <ValueRenderer value={value} maxDepth={maxDepth} />
        </div>
      )}
    </div>
  );
}

export default FactValueViewer;
