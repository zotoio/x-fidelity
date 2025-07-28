/**
 * Boundary interfaces for serialization points
 * These types define safe, serializable versions of VSCode and X-Fidelity objects
 */

import * as vscode from 'vscode';

// Basic serializable types
export type SerializablePrimitive =
  | string
  | number
  | boolean
  | null
  | undefined;
export type SerializableObject = { [key: string]: SerializableValue };
export type SerializableArray = SerializableValue[];
export type SerializableValue =
  | SerializablePrimitive
  | SerializableObject
  | SerializableArray;

// Safe position that can be serialized
export interface SerializablePosition {
  line: number;
  character: number;
}

// Safe range that can be serialized
export interface SerializableRange {
  start: SerializablePosition;
  end: SerializablePosition;
}

// Safe URI that can be serialized
export interface SerializableUri {
  scheme: string;
  authority?: string;
  path: string;
  query?: string;
  fragment?: string;
  fsPath: string;
}

// Diagnostic that can be safely serialized
export interface SerializableDiagnostic {
  range: SerializableRange;
  message: string;
  severity: number; // vscode.DiagnosticSeverity
  source?: string;
  code?: string | number;
  tags?: number[]; // vscode.DiagnosticTag[]
  relatedInformation?: SerializableDiagnosticRelatedInformation[];
}

// Related information for diagnostics
export interface SerializableDiagnosticRelatedInformation {
  location: SerializableLocation;
  message: string;
}

// Location that can be safely serialized
export interface SerializableLocation {
  uri: SerializableUri;
  range: SerializableRange;
}

// Analysis result that can be safely passed to webviews
export interface SerializableAnalysisResult {
  metadata: SerializableObject;
  timestamp: number;
  duration: number;
  summary: SerializableObject;
  operationId: string;
  [key: string]: SerializableValue;
}

// Safe issue representation
export interface SerializableIssue {
  filePath: string;
  errors: SerializableRuleFailure[];
}

// Safe rule failure representation
export interface SerializableRuleFailure {
  ruleFailure: string;
  level: string;
  details?: SerializableObject;
}

// Webview message types
export interface SerializableWebviewMessage {
  command: string;
  data: SerializableValue;
  timestamp: number;
  operationId: string;
}

// Error message format for webviews
export interface SerializableErrorMessage {
  command: 'error';
  data: {
    message: string;
    originalCommand?: string;
    error?: string;
    stack?: string;
  };
  timestamp: number;
  operationId: string;
}

// Convert VSCode types to serializable types
export function toSerializablePosition(
  pos: vscode.Position
): SerializablePosition {
  return {
    line: pos.line,
    character: pos.character
  };
}

export function toSerializableRange(range: vscode.Range): SerializableRange {
  return {
    start: toSerializablePosition(range.start),
    end: toSerializablePosition(range.end)
  };
}

export function toSerializableUri(uri: vscode.Uri): SerializableUri {
  return {
    scheme: uri.scheme,
    authority: uri.authority,
    path: uri.path,
    query: uri.query,
    fragment: uri.fragment,
    fsPath: uri.fsPath
  };
}

export function toSerializableDiagnostic(
  diag: vscode.Diagnostic
): SerializableDiagnostic {
  const result: SerializableDiagnostic = {
    range: toSerializableRange(diag.range),
    message: diag.message,
    severity: diag.severity,
    source: diag.source
  };

  if (diag.code !== undefined) {
    result.code = typeof diag.code === 'object' ? String(diag.code) : diag.code;
  }

  if (diag.tags) {
    result.tags = [...diag.tags];
  }

  if (diag.relatedInformation) {
    result.relatedInformation = diag.relatedInformation.map(info => ({
      location: {
        uri: toSerializableUri(info.location.uri),
        range: toSerializableRange(info.location.range)
      },
      message: info.message
    }));
  }

  return result;
}

export function toSerializableLocation(
  location: vscode.Location
): SerializableLocation {
  return {
    uri: toSerializableUri(location.uri),
    range: toSerializableRange(location.range)
  };
}

// Convert back from serializable to VSCode types (for reconstruction)
export function fromSerializablePosition(
  pos: SerializablePosition
): vscode.Position {
  return new vscode.Position(pos.line, pos.character);
}

export function fromSerializableRange(range: SerializableRange): vscode.Range {
  return new vscode.Range(
    fromSerializablePosition(range.start),
    fromSerializablePosition(range.end)
  );
}

export function fromSerializableUri(uri: SerializableUri): vscode.Uri {
  return vscode.Uri.from({
    scheme: uri.scheme,
    authority: uri.authority,
    path: uri.path,
    query: uri.query,
    fragment: uri.fragment
  });
}

// Type guards for runtime checking
export function isSerializableRange(obj: any): obj is SerializableRange {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.start &&
    obj.end &&
    typeof obj.start.line === 'number' &&
    typeof obj.start.character === 'number' &&
    typeof obj.end.line === 'number' &&
    typeof obj.end.character === 'number'
  );
}

export function isSerializableDiagnostic(
  obj: any
): obj is SerializableDiagnostic {
  return (
    obj &&
    typeof obj === 'object' &&
    isSerializableRange(obj.range) &&
    typeof obj.message === 'string' &&
    typeof obj.severity === 'number'
  );
}

// Validation helpers
export function validateSerializableObject(
  obj: unknown
): obj is SerializableValue {
  try {
    JSON.stringify(obj);
    return true;
  } catch {
    return false;
  }
}

// Type assertion helpers for strict typing
export function assertSerializable<T extends SerializableValue>(
  value: unknown
): asserts value is T {
  if (!validateSerializableObject(value)) {
    throw new Error(`Value is not serializable: ${typeof value}`);
  }
}
