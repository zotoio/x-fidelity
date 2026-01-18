/**
 * TemplateCard Component
 *
 * Displays a single template as a card with icon, name, description,
 * complexity indicator, and action buttons.
 */

import { EyeOpenIcon, PlayIcon } from '@radix-ui/react-icons';
import { pluginInfo, complexityInfo } from '../../lib/templates/types';
import type { RuleTemplate } from '../../lib/templates/types';

interface TemplateCardProps {
  /** Template to display */
  template: RuleTemplate;

  /** Called when "Use Template" is clicked */
  onUse: (template: RuleTemplate) => void;

  /** Called when "Preview" is clicked */
  onPreview: (template: RuleTemplate) => void;
}

/**
 * Render complexity stars
 */
function ComplexityStars({ level }: { level: RuleTemplate['complexity'] }): JSX.Element {
  const { stars, label } = complexityInfo[level];
  return (
    <div className="flex items-center gap-1" title={label}>
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className={`text-xs ${i < stars ? 'text-yellow-500' : 'text-foreground-muted/30'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

/**
 * Source badge
 */
function SourceBadge({ source }: { source: RuleTemplate['source'] }): JSX.Element {
  const isTeaching = source === 'teaching';
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
        isTeaching
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      }`}
    >
      {isTeaching ? 'Tutorial' : 'Demo'}
    </span>
  );
}

export function TemplateCard({ template, onUse, onPreview }: TemplateCardProps): JSX.Element {
  const pluginData = pluginInfo[template.plugin];

  return (
    <div className="group flex flex-col p-4 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-background-secondary/50 transition-all duration-200">
      {/* Header: Icon and badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label={pluginData.label}>
            {pluginData.icon}
          </span>
          <SourceBadge source={template.source} />
        </div>
        <ComplexityStars level={template.complexity} />
      </div>

      {/* Title */}
      <h3 className="font-medium text-foreground mb-1 line-clamp-1">{template.displayName}</h3>

      {/* Description */}
      <p className="text-sm text-foreground-muted mb-3 line-clamp-2 flex-1">
        {template.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded bg-background-tertiary text-foreground-muted"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="text-[10px] text-foreground-muted">+{template.tags.length - 3}</span>
        )}
      </div>

      {/* Plugin badge */}
      <div className="text-xs text-foreground-muted mb-3">
        <span className="font-medium">{pluginData.label}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-border/50">
        <button
          type="button"
          onClick={() => onPreview(template)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-background-secondary transition-colors focus-ring"
          aria-label={`Preview ${template.displayName}`}
        >
          <EyeOpenIcon className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => onUse(template)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary-dark transition-colors focus-ring"
          aria-label={`Use ${template.displayName}`}
        >
          <PlayIcon className="w-3.5 h-3.5" />
          Use
        </button>
      </div>
    </div>
  );
}

export default TemplateCard;
