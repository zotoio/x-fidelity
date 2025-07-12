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
}
