// Global type declarations for VSCode test environment

declare global {
  var testConsole: {
    log: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  
  var isVerboseMode: boolean;
}

export {}; 