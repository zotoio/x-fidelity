/**
 * useTemplateSearch Hook
 *
 * Provides search and filter functionality for the template library.
 * Supports text search, plugin filter, use case filter, complexity filter,
 * and source filter with memoized results.
 */

import { useMemo, useState, useCallback } from 'react';
import { allTemplates } from '../../../lib/templates';
import type {
  RuleTemplate,
  TemplateFilters,
  PluginType,
  UseCaseType,
  ComplexityLevel,
  TemplateSource,
} from '../../../lib/templates/types';
import { defaultFilters } from '../../../lib/templates/types';

export interface UseTemplateSearchResult {
  /** Filtered templates based on current filters */
  templates: RuleTemplate[];

  /** Current filter state */
  filters: TemplateFilters;

  /** Update search text */
  setSearch: (search: string) => void;

  /** Update plugin filter */
  setPluginFilter: (plugin: PluginType | 'all') => void;

  /** Update use case filter */
  setUseCaseFilter: (useCase: UseCaseType | 'all') => void;

  /** Update complexity filter */
  setComplexityFilter: (complexity: ComplexityLevel | 'all') => void;

  /** Update source filter */
  setSourceFilter: (source: TemplateSource | 'all') => void;

  /** Reset all filters to defaults */
  resetFilters: () => void;

  /** Total number of templates (unfiltered) */
  totalCount: number;

  /** Number of templates matching current filters */
  filteredCount: number;

  /** Whether any filters are active */
  hasActiveFilters: boolean;
}

/**
 * Normalize text for search comparison
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Check if a template matches the search query
 */
function matchesSearch(template: RuleTemplate, query: string): boolean {
  if (!query) return true;

  const normalizedQuery = normalizeText(query);
  const searchableFields = [
    template.displayName,
    template.description,
    template.longDescription || '',
    ...template.tags,
    template.plugin,
    template.useCase,
    template.name,
  ];

  return searchableFields.some((field) => normalizeText(field).includes(normalizedQuery));
}

/**
 * Check if a template matches all active filters
 */
function matchesFilters(template: RuleTemplate, filters: TemplateFilters): boolean {
  // Search filter
  if (filters.search && !matchesSearch(template, filters.search)) {
    return false;
  }

  // Plugin filter
  if (filters.plugin !== 'all' && template.plugin !== filters.plugin) {
    return false;
  }

  // Use case filter
  if (filters.useCase !== 'all' && template.useCase !== filters.useCase) {
    return false;
  }

  // Complexity filter
  if (filters.complexity !== 'all' && template.complexity !== filters.complexity) {
    return false;
  }

  // Source filter
  if (filters.source !== 'all' && template.source !== filters.source) {
    return false;
  }

  return true;
}

/**
 * Hook for searching and filtering templates
 */
export function useTemplateSearch(initialFilters?: Partial<TemplateFilters>): UseTemplateSearchResult {
  const [filters, setFilters] = useState<TemplateFilters>({
    ...defaultFilters,
    ...initialFilters,
  });

  // Filter templates based on current filters
  const templates = useMemo(() => {
    return allTemplates.filter((template) => matchesFilters(template, filters));
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.plugin !== 'all' ||
      filters.useCase !== 'all' ||
      filters.complexity !== 'all' ||
      filters.source !== 'all'
    );
  }, [filters]);

  // Individual filter setters
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setPluginFilter = useCallback((plugin: PluginType | 'all') => {
    setFilters((prev) => ({ ...prev, plugin }));
  }, []);

  const setUseCaseFilter = useCallback((useCase: UseCaseType | 'all') => {
    setFilters((prev) => ({ ...prev, useCase }));
  }, []);

  const setComplexityFilter = useCallback((complexity: ComplexityLevel | 'all') => {
    setFilters((prev) => ({ ...prev, complexity }));
  }, []);

  const setSourceFilter = useCallback((source: TemplateSource | 'all') => {
    setFilters((prev) => ({ ...prev, source }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  return {
    templates,
    filters,
    setSearch,
    setPluginFilter,
    setUseCaseFilter,
    setComplexityFilter,
    setSourceFilter,
    resetFilters,
    totalCount: allTemplates.length,
    filteredCount: templates.length,
    hasActiveFilters,
  };
}

export default useTemplateSearch;
