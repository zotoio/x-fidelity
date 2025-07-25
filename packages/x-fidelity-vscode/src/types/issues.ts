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
