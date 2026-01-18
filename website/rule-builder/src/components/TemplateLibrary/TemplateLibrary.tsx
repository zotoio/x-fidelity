/**
 * TemplateLibrary Component
 *
 * Main component for browsing, searching, and loading rule templates.
 * Integrates search, filters, grid view, and preview functionality.
 *
 * Features:
 * - Search templates by name, description, and tags
 * - Filter by plugin, use case, complexity, and source
 * - Preview templates with full details
 * - Load templates into the editor with one click
 */

import { useState, useCallback } from 'react';
import { TemplateSearch } from './TemplateSearch';
import { TemplateFilters } from './TemplateFilters';
import { TemplateGrid } from './TemplateGrid';
import { TemplatePreview } from './TemplatePreview';
import { useTemplateSearch } from './hooks/useTemplateSearch';
import { useRuleStore } from '../../store';
import type { RuleTemplate } from '../../lib/templates/types';

interface TemplateLibraryProps {
  /** Called when a template is selected and loaded */
  onSelect?: (template: RuleTemplate) => void;
}

/**
 * TemplateLibrary component - Modal content for browsing rule templates
 *
 * Provides:
 * - Categorized list of pre-built rule templates
 * - Search and filter functionality
 * - Template preview with learning points
 * - One-click template loading into editor
 */
export function TemplateLibrary({ onSelect }: TemplateLibraryProps): JSX.Element {
  // Template being previewed (null = grid view)
  const [previewTemplate, setPreviewTemplate] = useState<RuleTemplate | null>(null);

  // Store action for loading rules
  const loadRule = useRuleStore((state) => state.loadRule);

  // Search and filter state
  const {
    templates,
    filters,
    setSearch,
    setPluginFilter,
    setUseCaseFilter,
    setComplexityFilter,
    setSourceFilter,
    resetFilters,
    totalCount,
    filteredCount,
    hasActiveFilters,
  } = useTemplateSearch();

  /**
   * Handle using a template - load it into the editor
   */
  const handleUseTemplate = useCallback(
    (template: RuleTemplate) => {
      // Load the rule into the store
      loadRule(template.rule);

      // Notify parent component
      onSelect?.(template);
    },
    [loadRule, onSelect]
  );

  /**
   * Handle previewing a template
   */
  const handlePreview = useCallback((template: RuleTemplate) => {
    setPreviewTemplate(template);
  }, []);

  /**
   * Handle closing preview (back to grid)
   */
  const handleClosePreview = useCallback(() => {
    setPreviewTemplate(null);
  }, []);

  // Show preview if a template is selected
  if (previewTemplate) {
    return (
      <TemplatePreview
        template={previewTemplate}
        onUse={handleUseTemplate}
        onClose={handleClosePreview}
      />
    );
  }

  // Show grid view with search and filters
  return (
    <div className="space-y-5">
      {/* Search */}
      <TemplateSearch
        value={filters.search}
        onChange={setSearch}
        placeholder="Search templates by name, description, or tags..."
        resultCount={filteredCount}
        totalCount={totalCount}
      />

      {/* Filters */}
      <TemplateFilters
        plugin={filters.plugin}
        useCase={filters.useCase}
        complexity={filters.complexity}
        source={filters.source}
        onPluginChange={setPluginFilter}
        onUseCaseChange={setUseCaseFilter}
        onComplexityChange={setComplexityFilter}
        onSourceChange={setSourceFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Results count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground-muted">
          {filteredCount === totalCount ? (
            <>Showing all {totalCount} templates</>
          ) : (
            <>
              Showing {filteredCount} of {totalCount} templates
            </>
          )}
        </span>
      </div>

      {/* Template grid */}
      <TemplateGrid
        templates={templates}
        onUse={handleUseTemplate}
        onPreview={handlePreview}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
      />
    </div>
  );
}

export default TemplateLibrary;
