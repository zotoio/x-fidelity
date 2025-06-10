export interface Logger {
    error: (obj: object | string, msg?: string, ...args: any[]) => void;
    info: (obj: object | string, msg?: string, ...args: any[]) => void;
    warn: (obj: object | string, msg?: string, ...args: any[]) => void;
    debug: (obj: object | string, msg?: string, ...args: any[]) => void;
    trace: (obj: object | string, msg?: string, ...args: any[]) => void;
    fatal: (obj: object | string, msg?: string, ...args: any[]) => void;
    level: string;
}

export interface Metrics {
    increment: (key: string) => void;
}
