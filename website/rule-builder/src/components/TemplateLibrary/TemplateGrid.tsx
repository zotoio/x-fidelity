/**
 * TemplateGrid Component
 *
 * Displays templates in a responsive grid layout with empty state handling.
 */

import { FileIcon } from '@radix-ui/react-icons';
import { TemplateCard } from './TemplateCard';
import type { RuleTemplate } from '../../lib/templates/types';

interface TemplateGridProps {
  /** Templates to display */
  templates: RuleTemplate[];

  /** Called when "Use Template" is clicked on a card */
  onUse: (template: RuleTemplate) => void;

  /** Called when "Preview" is clicked on a card */
  onPreview: (template: RuleTemplate) => void;

  /** Whether filters are active (for empty state messaging) */
  hasActiveFilters?: boolean;

  /** Called when filters should be reset */
  onResetFilters?: () => void;
}

/**
 * Empty state component
 */
function EmptyState({
  hasActiveFilters,
  onResetFilters,
}: {
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mb-4">
        <FileIcon className="w-8 h-8 text-foreground-muted" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
      <p className="text-sm text-foreground-muted max-w-sm mb-4">
        {hasActiveFilters
          ? "No templates match your current filters. Try adjusting your search or filter criteria."
          : "No templates are available. This shouldn't happen - please report this issue."}
      </p>
      {hasActiveFilters && onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-dark transition-colors focus-ring"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

export function TemplateGrid({
  templates,
  onUse,
  onPreview,
  hasActiveFilters,
  onResetFilters,
}: TemplateGridProps): JSX.Element {
  if (templates.length === 0) {
    return <EmptyState hasActiveFilters={hasActiveFilters} onResetFilters={onResetFilters} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onUse={onUse}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}

export default TemplateGrid;
