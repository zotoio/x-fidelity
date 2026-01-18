/**
 * SimulationPanel Component
 *
 * Main panel for testing rules against fixture data.
 * Provides:
 * - File selection from fixture data OR manual content input
 * - Rule simulation with real browser plugins
 * - Condition-by-condition result display
 * - Event preview
 * - Loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PlayIcon,
  ReloadIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
  InfoCircledIcon,
  FileTextIcon,
  Pencil1Icon,
  LockClosedIcon,
  GlobeIcon,
  TargetIcon,
  PlusIcon,
  Cross1Icon,
} from '@radix-ui/react-icons';

import { useRuleStore } from '../../store';
import { useSimulation } from './hooks';
import { FileSelector } from './FileSelector';
import { SimulationResults } from './SimulationResults';
import { isGlobalRule } from '../../lib/utils/globalRuleUtils';

/** Input mode for simulation */
type SimulationMode = 'fixtures' | 'manual';

/** Rule scope for simulation */
type RuleScope = 'iterative' | 'global';

/** Additional file entry for global simulation */
interface AdditionalFile {
  id: string;
  fileName: string;
  content: string;
}

/**
 * Progress bar component for initialization
 */
function InitProgress({
  step,
  progress,
}: {
  step: string | null;
  progress: number;
}): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground-muted">
          {step || 'Initializing...'}
        </span>
        <span className="text-foreground-muted">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-accent rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * SimulationPanel - Collapsible panel for rule simulation
 */
export function SimulationPanel(): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mode, setMode] = useState<SimulationMode>('fixtures');
  const [scope, setScope] = useState<RuleScope>('iterative');
  const [manualFileName, setManualFileName] = useState('example.ts');
  const [manualContent, setManualContent] = useState('// Paste your file content here\n');
  const [additionalFiles, setAdditionalFiles] = useState<AdditionalFile[]>([]);
  const rule = useRuleStore((state) => state.rule);

  // Check if the rule has REPO_GLOBAL_CHECK condition
  const ruleIsGlobal = isGlobalRule(rule);

  // Auto-switch to iterative if rule is not global and scope is global
  useEffect(() => {
    if (!ruleIsGlobal && scope === 'global') {
      setScope('iterative');
    }
  }, [ruleIsGlobal, scope]);

  const {
    state,
    runCurrentSimulation,
    runWithContent,
    runGlobal,
    selectFile,
    reset,
    initialize,
  } = useSimulation(rule);

  const {
    isRunning,
    isInitialized,
    error,
    selectedFile,
    availableFiles,
    result,
    initProgress,
    initStep,
  } = state;

  // Auto-initialize on mount
  useEffect(() => {
    if (!isInitialized && !error) {
      initialize();
    }
  }, [isInitialized, error, initialize]);

  const handleRunSimulation = useCallback(async () => {
    if (scope === 'global') {
      // Build additional files map from the additionalFiles state
      const additionalFilesMap = new Map<string, string>();
      for (const file of additionalFiles) {
        if (file.fileName.trim() && file.content.trim()) {
          additionalFilesMap.set(file.fileName, file.content);
        }
      }
      await runGlobal(additionalFilesMap.size > 0 ? additionalFilesMap : undefined);
    } else if (mode === 'manual') {
      await runWithContent(manualFileName, manualContent);
    } else {
      await runCurrentSimulation();
    }
  }, [scope, mode, runCurrentSimulation, runWithContent, runGlobal, manualFileName, manualContent, additionalFiles]);
  
  const handleAddFile = useCallback(() => {
    setAdditionalFiles(prev => [
      ...prev,
      { id: `file-${Date.now()}`, fileName: '', content: '' }
    ]);
  }, []);
  
  const handleRemoveFile = useCallback((id: string) => {
    setAdditionalFiles(prev => prev.filter(f => f.id !== id));
  }, []);
  
  const handleUpdateFile = useCallback((id: string, field: 'fileName' | 'content', value: string) => {
    setAdditionalFiles(prev => prev.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  }, []);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const handleRetryInit = useCallback(async () => {
    await initialize();
  }, [initialize]);

  // Check if we can run simulation
  const canRunFixtures = isInitialized && !isRunning && rule && selectedFile;
  const canRunManual = isInitialized && !isRunning && rule && manualFileName.trim() && manualContent.trim();
  const canRunGlobal = isInitialized && !isRunning && rule;
  const canRun = scope === 'global' ? canRunGlobal : (mode === 'fixtures' ? canRunFixtures : canRunManual);

  return (
    <div className="rounded-lg border border-border bg-background-soft">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full p-4 text-left hover:bg-accent/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-5 h-5 text-foreground-muted" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 text-foreground-muted" />
        )}
        <h3 className="font-semibold text-foreground">Rule Simulation</h3>
        <span className="ml-auto flex items-center gap-2 text-sm">
          {/* Status indicators */}
          {!isInitialized && !error && (
            <span className="flex items-center gap-1 text-yellow-500">
              <InfoCircledIcon className="w-4 h-4" />
              Initializing...
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-red-500">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Error
            </span>
          )}
          {isInitialized && !error && !result && (
            <span className="flex items-center gap-1 text-foreground-muted">
              <CheckCircledIcon className="w-4 h-4" />
              Ready
            </span>
          )}
          {result && (
            <span
              className={`flex items-center gap-1 ${
                result.finalResult === 'triggered'
                  ? 'text-yellow-500'
                  : result.finalResult === 'error'
                    ? 'text-red-500'
                    : 'text-green-500'
              }`}
            >
              {result.finalResult === 'triggered' && (
                <ExclamationTriangleIcon className="w-4 h-4" />
              )}
              {result.finalResult === 'not-triggered' && (
                <CheckCircledIcon className="w-4 h-4" />
              )}
              {result.finalResult === 'error' && (
                <ExclamationTriangleIcon className="w-4 h-4" />
              )}
              {result.finalResult === 'triggered'
                ? 'Triggered'
                : result.finalResult === 'error'
                  ? 'Error'
                  : 'Not Triggered'}
            </span>
          )}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Initialization in progress */}
          {!isInitialized && !error && (
            <InitProgress step={initStep} progress={initProgress} />
          )}

          {/* Error state */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800 dark:text-red-200">
                    Simulation Error
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryInit}
                    className="mt-3 px-3 py-1.5 text-sm rounded-md bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-800 dark:text-red-100 transition-colors"
                  >
                    Retry Initialization
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ready state - show controls and results */}
          {isInitialized && !error && (
            <>
              {/* Scope and Mode toggles */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {/* Scope toggle (Iterative vs Global) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground-muted uppercase">Scope:</span>
                  <div className="inline-flex rounded-md border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setScope('iterative')}
                      disabled={isRunning}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                        scope === 'iterative'
                          ? 'bg-primary text-white'
                          : 'bg-background hover:bg-accent text-foreground'
                      }`}
                      title="Test rule against a single file (for iterative rules)"
                    >
                      <TargetIcon className="w-3.5 h-3.5" />
                      Iterative
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('global')}
                      disabled={isRunning || !ruleIsGlobal}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-l border-border transition-colors ${
                        scope === 'global'
                          ? 'bg-primary text-white'
                          : !ruleIsGlobal
                            ? 'bg-background text-foreground-muted opacity-50 cursor-not-allowed'
                            : 'bg-background hover:bg-accent text-foreground'
                      }`}
                      title={ruleIsGlobal 
                        ? "Test rule against entire repository (for REPO_GLOBAL_CHECK rules)" 
                        : "Enable 'Global Rule' in Rule Properties to use this mode"
                      }
                    >
                      <GlobeIcon className="w-3.5 h-3.5" />
                      Global
                    </button>
                  </div>
                </div>

                {/* Input mode toggle - only show for iterative scope */}
                {scope === 'iterative' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground-muted uppercase">Input:</span>
                    <div className="inline-flex rounded-md border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMode('fixtures')}
                        disabled={isRunning}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                          mode === 'fixtures'
                            ? 'bg-primary text-white'
                            : 'bg-background hover:bg-accent text-foreground'
                        }`}
                      >
                        <FileTextIcon className="w-3.5 h-3.5" />
                        Fixtures
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('manual')}
                        disabled={isRunning}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-l border-border transition-colors ${
                          mode === 'manual'
                            ? 'bg-primary text-white'
                            : 'bg-background hover:bg-accent text-foreground'
                        }`}
                      >
                        <Pencil1Icon className="w-3.5 h-3.5" />
                        Manual
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Global scope */}
              {scope === 'global' && (
                <div className="space-y-4">
                  {/* Info about global mode */}
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <GlobeIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Global Simulation:</strong> Tests against all {availableFiles.length} fixture files.
                        Use this for <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">REPO_GLOBAL_CHECK</code> rules
                        that evaluate repository-wide facts like <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">repoFilesystemFacts</code> or <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">repoDependencyVersions</code>.
                      </div>
                    </div>
                  </div>

                  {/* Additional files section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-foreground-muted uppercase">
                        Additional Files (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddFile}
                        disabled={isRunning}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-border hover:bg-accent transition-colors"
                      >
                        <PlusIcon className="w-3 h-3" />
                        Add File
                      </button>
                    </div>
                    <p className="text-xs text-foreground-muted">
                      Add custom files to include in the global analysis alongside fixture files.
                    </p>
                    
                    {additionalFiles.length > 0 && (
                      <div className="space-y-3 mt-2">
                        {additionalFiles.map((file, index) => (
                          <div key={file.id} className="p-3 rounded-lg border border-border bg-background-soft">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-foreground-muted">
                                File {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(file.id)}
                                disabled={isRunning}
                                className="p-1 rounded hover:bg-accent transition-colors"
                                aria-label="Remove file"
                              >
                                <Cross1Icon className="w-3 h-3 text-foreground-muted" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={file.fileName}
                                onChange={(e) => handleUpdateFile(file.id, 'fileName', e.target.value)}
                                disabled={isRunning}
                                placeholder="src/example.ts"
                                className="w-full px-2 py-1.5 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                              <textarea
                                value={file.content}
                                onChange={(e) => handleUpdateFile(file.id, 'content', e.target.value)}
                                disabled={isRunning}
                                rows={4}
                                placeholder="// File content..."
                                className="w-full px-2 py-1.5 text-sm rounded-md border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Privacy notice */}
                  <div className="flex items-center gap-2 text-xs text-foreground-muted">
                    <LockClosedIcon className="w-3.5 h-3.5 text-green-500" />
                    <span>* All processing is done locally in your browser.</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRunSimulation}
                      disabled={!canRun}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-md font-medium
                        transition-colors focus-ring
                        ${
                          canRun
                            ? 'bg-primary text-white hover:bg-primary-dark'
                            : 'bg-accent text-foreground-muted cursor-not-allowed'
                        }
                      `}
                      aria-label="Run global simulation"
                    >
                      {isRunning ? (
                        <>
                          <ReloadIcon className="w-4 h-4 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4" />
                          <span>Run Global Simulation</span>
                        </>
                      )}
                    </button>

                    {result && (
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-accent transition-colors focus-ring"
                        aria-label="Reset simulation"
                      >
                        <ReloadIcon className="w-4 h-4" />
                        <span className="text-sm">Reset</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Fixtures mode (iterative scope only) */}
              {scope === 'iterative' && mode === 'fixtures' && (
                <div className="flex items-center gap-4">
                  {/* File selector */}
                  <div className="flex-1 max-w-md">
                    <label className="block text-xs font-medium text-foreground-muted uppercase mb-1">
                      Test File
                    </label>
                    <FileSelector
                      files={availableFiles}
                      selectedFile={selectedFile}
                      onSelect={selectFile}
                      disabled={isRunning}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-5">
                    <button
                      type="button"
                      onClick={handleRunSimulation}
                      disabled={!canRun}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-md font-medium
                        transition-colors focus-ring
                        ${
                          canRun
                            ? 'bg-primary text-white hover:bg-primary-dark'
                            : 'bg-accent text-foreground-muted cursor-not-allowed'
                        }
                      `}
                      aria-label="Run simulation"
                    >
                      {isRunning ? (
                        <>
                          <ReloadIcon className="w-4 h-4 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4" />
                          <span>Run Simulation</span>
                        </>
                      )}
                    </button>

                    {result && (
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-accent transition-colors focus-ring"
                        aria-label="Reset simulation"
                      >
                        <ReloadIcon className="w-4 h-4" />
                        <span className="text-sm">Reset</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Manual mode (iterative scope only) */}
              {scope === 'iterative' && mode === 'manual' && (
                <div className="space-y-3">
                  {/* Filename input */}
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted uppercase mb-1">
                      Filename <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualFileName}
                      onChange={(e) => setManualFileName(e.target.value)}
                      disabled={isRunning}
                      placeholder="example.ts"
                      className="w-full max-w-md px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="text-xs text-foreground-muted mt-1">
                      The filename is used to determine file type for analysis (e.g., .ts, .tsx, .js)
                    </p>
                  </div>

                  {/* Content textarea */}
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted uppercase mb-1">
                      File Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      disabled={isRunning}
                      rows={8}
                      placeholder="Paste your file content here..."
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                    />
                  </div>

                  {/* Privacy notice */}
                  <div className="flex items-center gap-2 text-xs text-foreground-muted">
                    <LockClosedIcon className="w-3.5 h-3.5 text-green-500" />
                    <span>* Your content never leaves your browser. All processing is done locally.</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRunSimulation}
                      disabled={!canRun}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-md font-medium
                        transition-colors focus-ring
                        ${
                          canRun
                            ? 'bg-primary text-white hover:bg-primary-dark'
                            : 'bg-accent text-foreground-muted cursor-not-allowed'
                        }
                      `}
                      aria-label="Run simulation"
                    >
                      {isRunning ? (
                        <>
                          <ReloadIcon className="w-4 h-4 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4" />
                          <span>Run Simulation</span>
                        </>
                      )}
                    </button>

                    {result && (
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-accent transition-colors focus-ring"
                        aria-label="Reset simulation"
                      >
                        <ReloadIcon className="w-4 h-4" />
                        <span className="text-sm">Reset</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* No rule warning */}
              {!rule && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <InfoCircledIcon className="w-5 h-5" />
                    <span>
                      Create or load a rule to run simulations against fixture data.
                    </span>
                  </div>
                </div>
              )}

              {/* Results */}
              {result && <SimulationResults result={result} />}

              {/* Help text when no result yet */}
              {!result && rule && (
                <div className="p-4 rounded-lg bg-accent/50 border border-border">
                  <div className="flex items-start gap-3">
                    <InfoCircledIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm text-foreground">
                        <strong>How to use:</strong>
                      </p>
                      <ol className="text-sm text-foreground-muted space-y-1 list-decimal list-inside">
                        <li>Select a file from the fixture to test against</li>
                        <li>Click &quot;Run Simulation&quot; to evaluate your rule</li>
                        <li>Review condition-by-condition results</li>
                        <li>See what event would be triggered (if any)</li>
                      </ol>
                      <p className="text-xs text-foreground-muted mt-2">
                        The simulation uses real browser-based plugins to evaluate
                        facts and operators against the bundled fixture data.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SimulationPanel;
