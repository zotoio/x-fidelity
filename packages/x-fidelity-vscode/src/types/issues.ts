export interface IssueFilter {
  severity: string[];
  files: string[];
  rules: string[];
  searchText: string;
  showExempted: boolean;
  showFixed: boolean;
}

export interface IssueSortOptions {
  field: 'file' | 'severity' | 'rule' | 'line' | 'date';
  direction: 'asc' | 'desc';
}

export interface ProcessedIssue {
  id: string;
  file: string;
  rule: string;
  severity: string;
  message: string;
  line?: number;
  column?: number;
  range?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  category: string;
  fixable: boolean;
  exempted: boolean;
  dateFound: number;
  isUnhandled?: boolean;
  failureReason?: string;
  originalData?: any;

  // Flag indicating this is a global/repository-wide issue
  isGlobalCheck?: boolean;

  // Unified enhanced details structure for all issue types
  // This allows commands and tooltips to access issue-specific data consistently
  enhancedDetails?: EnhancedIssueDetails;
}

/**
 * Unified structure for enhanced issue details
 * All issue types coerce their data into this structure for consistent access
 */
export interface EnhancedIssueDetails {
  // Type discriminator for issue-specific handling
  type:
    | 'dependency'
    | 'complexity'
    | 'sensitive-data'
    | 'pattern-match'
    | 'validation'
    | 'generic';

  // Common fields available for all issue types
  summary: string; // Brief summary for display
  actionable: boolean; // Whether the issue has specific actionable items

  // Issue-specific data arrays - populated based on type
  items: EnhancedIssueItem[];

  // Raw details for advanced use cases
  rawDetails?: any;
}

/**
 * Unified item structure that can represent any issue-specific detail
 * Each issue type maps its data to these common fields
 */
export interface EnhancedIssueItem {
  // Display label (dependency name, function name, pattern, etc.)
  label: string;

  // Description or context
  description?: string;

  // Location information
  file?: string;
  line?: number;
  column?: number;

  // Current/expected values for comparison issues
  currentValue?: string;
  expectedValue?: string;

  // Severity/priority for this specific item
  itemSeverity?: 'high' | 'medium' | 'low';

  // Metrics for numeric data (complexity, counts, etc.)
  metrics?: Record<string, number>;

  // Additional context-specific data
  metadata?: Record<string, any>;
}

/**
 * Legacy interface - kept for backward compatibility
 * @deprecated Use EnhancedIssueDetails instead
 */
export interface DependencyDetail {
  dependency: string;
  currentVersion: string;
  requiredVersion: string;
  manifestPath: string;
  lineNumber?: number;
  columnNumber?: number;
}

/**
 * Legacy interface - kept for backward compatibility
 * @deprecated Use EnhancedIssueDetails instead
 */
export interface ComplexityDetail {
  functionName: string;
  cyclomaticComplexity?: number;
  cognitiveComplexity?: number;
  nestingDepth?: number;
  parameterCount?: number;
  returnCount?: number;
  lineNumber?: number;
}

// New interface for tracking failed diagnostic conversions
export interface FailedIssue {
  originalData: any;
  filePath: string;
  ruleId: string;
  message: string;
  failureReason: string;
  severity: string;
  rawError?: any;
  category?: string;
}

// New interface for comprehensive processed analysis results
export interface ProcessedAnalysisResult {
  totalIssues: number;
  successfulIssues: number;
  failedIssuesCount: number;
  issueBreakdown: {
    error: number;
    warning: number;
    info: number;
    hint: number;
    exempt: number;
    unhandled: number;
  };
  diagnostics: Map<string, any[]>;
  processedIssues: ProcessedIssue[];
  failedIssues: FailedIssue[];
  metadata: any;
  timestamp: number;
  duration: number;
}
