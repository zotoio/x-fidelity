export interface Logger {
    error: (message: any) => void;
    info: (message: any) => void;
    warn: (message: any) => void;
    debug: (message: any) => void;
}

export interface Metrics {
    increment: (key: string) => void;
}
