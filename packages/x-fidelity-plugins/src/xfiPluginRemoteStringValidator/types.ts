// Remote String Validator Plugin specific types

// Remote validation parameters
export interface RemoteValidationParams {
    content?: string;
    pattern?: string;
    substring: string;
    url: string;
    headers?: Record<string, string>;
    timeout?: number;
    jsonPath?: string;
    options?: {
        caseSensitive?: boolean;
        multiline?: boolean;
        global?: boolean;
    };
}

// Remote validation result
export interface RemoteValidationResult {
    isValid: boolean;
    matches?: string[];
    error?: string;
} 