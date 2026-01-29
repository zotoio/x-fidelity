/**
 * FileSelector Component
 * 
 * Dropdown for selecting which fixture file to test against.
 */

import { ChevronDownIcon, FileIcon } from '@radix-ui/react-icons';
import { useState, useRef, useEffect } from 'react';

export interface FileSelectorProps {
  /** List of available files */
  files: string[];
  /** Currently selected file */
  selectedFile: string | null;
  /** Callback when file selection changes */
  onSelect: (file: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Get file extension icon color
 */
function getExtensionColor(extension: string): string {
  switch (extension) {
    case '.tsx':
    case '.ts':
      return 'text-blue-500';
    case '.jsx':
    case '.js':
      return 'text-yellow-500';
    case '.json':
      return 'text-orange-500';
    case '.css':
    case '.scss':
      return 'text-pink-500';
    case '.md':
      return 'text-gray-500';
    default:
      return 'text-foreground-muted';
  }
}

/**
 * Get file display name (truncated path)
 */
function getDisplayName(path: string, maxLength: number = 40): string {
  if (path.length <= maxLength) return path;
  
  const parts = path.split('/');
  if (parts.length <= 2) return path;
  
  // Show first and last parts
  return `${parts[0]}/.../${parts[parts.length - 1]}`;
}

export function FileSelector({
  files,
  selectedFile,
  onSelect,
  disabled = false,
  className = '',
}: FileSelectorProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Filter files based on search term
  const filteredFiles = files.filter(file =>
    file.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  const handleSelect = (file: string) => {
    onSelect(file);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  const selectedExtension = selectedFile ? 
    selectedFile.substring(selectedFile.lastIndexOf('.')) : '';
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 w-full px-3 py-2 text-left
          rounded-md border border-border bg-background
          hover:bg-accent transition-colors focus-ring
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <FileIcon className={`w-4 h-4 flex-shrink-0 ${getExtensionColor(selectedExtension)}`} />
        <span className="flex-1 text-sm truncate text-foreground">
          {selectedFile ? getDisplayName(selectedFile) : 'Select a file...'}
        </span>
        <ChevronDownIcon 
          className={`w-4 h-4 text-foreground-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files..."
              className="w-full px-2 py-1 text-sm bg-accent rounded border-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          {/* File list */}
          <ul 
            className="overflow-y-auto max-h-48"
            role="listbox"
            aria-label="Available files"
          >
            {filteredFiles.length === 0 ? (
              <li className="px-3 py-2 text-sm text-foreground-muted italic">
                No files match your search
              </li>
            ) : (
              filteredFiles.map((file) => {
                const extension = file.substring(file.lastIndexOf('.'));
                const isSelected = file === selectedFile;
                
                return (
                  <li key={file}>
                    <button
                      type="button"
                      onClick={() => handleSelect(file)}
                      className={`
                        flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm
                        hover:bg-accent transition-colors
                        ${isSelected ? 'bg-primary/10 text-primary' : 'text-foreground'}
                      `}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <FileIcon className={`w-4 h-4 flex-shrink-0 ${getExtensionColor(extension)}`} />
                      <span className="truncate">{file}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          
          {/* File count */}
          <div className="px-3 py-1.5 border-t border-border text-xs text-foreground-muted">
            {filteredFiles.length} of {files.length} files
          </div>
        </div>
      )}
    </div>
  );
}

export default FileSelector;
