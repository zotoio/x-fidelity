/**
 * useSimulation Hook
 * 
 * Manages simulation state and execution for the SimulationPanel.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { RuleDefinition } from '../../../types';
import type { SimulationResult, SimulationState, SimulationOptions } from '../../../lib/simulation/types';
import { SimulationEngine, simulationEngine } from '../../../lib/simulation';

/**
 * Hook return type
 */
export interface UseSimulationReturn {
  /** Current simulation state */
  state: SimulationState;
  /** Run simulation for a specific file */
  runSimulation: (fileName: string) => Promise<void>;
  /** Run simulation for the currently selected file */
  runCurrentSimulation: () => Promise<void>;
  /** Run simulation with custom file content (manual mode) */
  runWithContent: (fileName: string, content: string) => Promise<void>;
  /** Run global simulation using all fixture files (for REPO_GLOBAL_CHECK rules) */
  runGlobal: (additionalFiles?: Map<string, string>) => Promise<void>;
  /** Select a file for simulation */
  selectFile: (fileName: string) => void;
  /** Reset simulation state */
  reset: () => void;
  /** Initialize the simulation engine */
  initialize: () => Promise<void>;
  /** Get all simulation results (for multi-file testing) */
  results: Map<string, SimulationResult>;
}

/**
 * Initial simulation state
 */
const initialState: SimulationState = {
  isRunning: false,
  isInitialized: false,
  error: null,
  selectedFile: null,
  availableFiles: [],
  result: null,
  initProgress: 0,
  initStep: null,
};

/**
 * Hook for managing rule simulation
 * 
 * @param rule - The rule definition to simulate
 * @param options - Simulation options
 */
export function useSimulation(
  rule: RuleDefinition | null,
  options: SimulationOptions = {}
): UseSimulationReturn {
  const [state, setState] = useState<SimulationState>(initialState);
  const [results, setResults] = useState<Map<string, SimulationResult>>(new Map());
  const engineRef = useRef<SimulationEngine>(simulationEngine);
  const abortRef = useRef<boolean>(false);
  
  /**
   * Initialize the simulation engine
   */
  const initialize = useCallback(async () => {
    if (state.isInitialized) return;
    
    abortRef.current = false;
    
    setState(prev => ({
      ...prev,
      error: null,
      initProgress: 0,
      initStep: 'Starting initialization...',
    }));
    
    try {
      await engineRef.current.initialize(
        'node-fullstack',
        (step, progress) => {
          if (abortRef.current) return;
          setState(prev => ({
            ...prev,
            initStep: step,
            initProgress: progress,
          }));
        }
      );
      
      if (abortRef.current) return;
      
      const files = engineRef.current.getAvailableFiles();
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        availableFiles: files,
        selectedFile: files.length > 0 ? files[0] ?? null : null,
        initProgress: 100,
        initStep: null,
      }));
    } catch (error) {
      if (abortRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState(prev => ({
        ...prev,
        error: `Initialization failed: ${errorMessage}`,
        initProgress: 0,
        initStep: null,
      }));
    }
  }, [state.isInitialized]);
  
  /**
   * Select a file for simulation
   */
  const selectFile = useCallback((fileName: string) => {
    setState(prev => ({
      ...prev,
      selectedFile: fileName,
      result: null, // Clear previous result when changing file
    }));
  }, []);
  
  /**
   * Run simulation for a specific file
   */
  const runSimulation = useCallback(async (fileName: string) => {
    if (!rule) {
      setState(prev => ({
        ...prev,
        error: 'No rule to simulate. Please create or load a rule first.',
      }));
      return;
    }
    
    if (!state.isInitialized) {
      setState(prev => ({
        ...prev,
        error: 'Simulation engine not initialized. Please wait for initialization.',
      }));
      return;
    }
    
    abortRef.current = false;
    setState(prev => ({
      ...prev,
      isRunning: true,
      error: null,
    }));
    
    try {
      const result = await engineRef.current.simulate(rule, fileName, options);
      
      if (abortRef.current) return;
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        result,
      }));
      
      // Store in results map
      setResults(prev => {
        const next = new Map(prev);
        next.set(fileName, result);
        return next;
      });
    } catch (error) {
      if (abortRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: `Simulation failed: ${errorMessage}`,
      }));
    }
  }, [rule, state.isInitialized, options]);
  
  /**
   * Run simulation for the currently selected file
   */
  const runCurrentSimulation = useCallback(async () => {
    if (state.selectedFile) {
      await runSimulation(state.selectedFile);
    }
  }, [state.selectedFile, runSimulation]);
  
  /**
   * Run simulation with custom file content (manual mode)
   */
  const runWithContent = useCallback(async (fileName: string, content: string) => {
    if (!rule) {
      setState(prev => ({
        ...prev,
        error: 'No rule to simulate. Please create or load a rule first.',
      }));
      return;
    }
    
    if (!state.isInitialized) {
      setState(prev => ({
        ...prev,
        error: 'Simulation engine not initialized. Please wait for initialization.',
      }));
      return;
    }
    
    abortRef.current = false;
    setState(prev => ({
      ...prev,
      isRunning: true,
      error: null,
    }));
    
    try {
      const result = await engineRef.current.simulateWithContent(rule, fileName, content, options);
      
      if (abortRef.current) return;
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        result,
      }));
      
      // Store in results map with "manual:" prefix
      setResults(prev => {
        const next = new Map(prev);
        next.set(`manual:${fileName}`, result);
        return next;
      });
    } catch (error) {
      if (abortRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: `Simulation failed: ${errorMessage}`,
      }));
    }
  }, [rule, state.isInitialized, options]);
  
  /**
   * Run global simulation using all fixture files (for REPO_GLOBAL_CHECK rules)
   */
  const runGlobal = useCallback(async (additionalFiles?: Map<string, string>) => {
    if (!rule) {
      setState(prev => ({
        ...prev,
        error: 'No rule to simulate. Please create or load a rule first.',
      }));
      return;
    }
    
    if (!state.isInitialized) {
      setState(prev => ({
        ...prev,
        error: 'Simulation engine not initialized. Please wait for initialization.',
      }));
      return;
    }
    
    abortRef.current = false;
    setState(prev => ({
      ...prev,
      isRunning: true,
      error: null,
    }));
    
    try {
      const result = await engineRef.current.simulateGlobal(rule, additionalFiles, options);
      
      if (abortRef.current) return;
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        result,
      }));
      
      // Store in results map with "global" key
      setResults(prev => {
        const next = new Map(prev);
        next.set('GLOBAL', result);
        return next;
      });
    } catch (error) {
      if (abortRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: `Global simulation failed: ${errorMessage}`,
      }));
    }
  }, [rule, state.isInitialized, options]);
  
  /**
   * Reset simulation state
   */
  const reset = useCallback(() => {
    abortRef.current = true;
    setState(prev => ({
      ...prev,
      isRunning: false,
      result: null,
      error: null,
    }));
    setResults(new Map());
  }, []);
  
  // Auto-initialize on mount
  useEffect(() => {
    if (!state.isInitialized && !state.error) {
      initialize();
    }
    
    return () => {
      abortRef.current = true;
    };
  }, []);
  
  // Clear results when rule changes
  useEffect(() => {
    setResults(new Map());
    setState(prev => ({
      ...prev,
      result: null,
    }));
  }, [rule]);
  
  return {
    state,
    runSimulation,
    runCurrentSimulation,
    runWithContent,
    runGlobal,
    selectFile,
    reset,
    initialize,
    results,
  };
}

export default useSimulation;
