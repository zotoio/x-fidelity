/**
 * TemplatePreview Component
 *
 * Detailed view of a template including:
 * - Full description
 * - Learning points (for teaching templates)
 * - Tags and metadata
 * - JSON preview of the rule
 * - Use template action
 */

import { Cross2Icon, PlayIcon, ArrowLeftIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { pluginInfo, useCaseInfo, complexityInfo } from '../../lib/templates/types';
import type { RuleTemplate } from '../../lib/templates/types';

interface TemplatePreviewProps {
  /** Template to preview */
  template: RuleTemplate;

  /** Called when "Use Template" is clicked */
  onUse: (template: RuleTemplate) => void;

  /** Called when back/close is clicked */
  onClose: () => void;
}

/**
 * Metadata badge component
 */
function MetadataBadge({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-background-secondary">
      <span className="text-lg">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[10px] text-foreground-muted uppercase tracking-wide">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}

/**
 * Learning point item
 */
function LearningPoint({ point }: { point: string }): JSX.Element {
  return (
    <li className="flex items-start gap-2 text-sm text-foreground">
      <span className="text-green-500 mt-0.5">✓</span>
      <span>{point}</span>
    </li>
  );
}

export function TemplatePreview({ template, onUse, onClose }: TemplatePreviewProps): JSX.Element {
  const pluginData = pluginInfo[template.plugin];
  const useCaseData = useCaseInfo[template.useCase];
  const complexityData = complexityInfo[template.complexity];

  const ruleJson = JSON.stringify(template.rule, null, 2);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 rounded-md hover:bg-background-secondary transition-colors focus-ring"
            aria-label="Back to templates"
          >
            <ArrowLeftIcon className="w-4 h-4 text-foreground-muted" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span>{pluginData.icon}</span>
              {template.displayName}
            </h2>
            <p className="text-sm text-foreground-muted">{template.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUse(template)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-dark transition-colors focus-ring"
          >
            <PlayIcon className="w-4 h-4" />
            Use Template
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md hover:bg-background-secondary transition-colors focus-ring"
            aria-label="Close preview"
          >
            <Cross2Icon className="w-4 h-4 text-foreground-muted" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Description */}
        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
          <p className="text-sm text-foreground-muted leading-relaxed">
            {template.longDescription || template.description}
          </p>
        </section>

        {/* Metadata badges */}
        <section>
          <h3 className="text-sm font-medium text-foreground mb-3">Metadata</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetadataBadge icon={pluginData.icon} label="Plugin" value={pluginData.label} />
            <MetadataBadge icon={useCaseData.icon} label="Use Case" value={useCaseData.label} />
            <MetadataBadge
              icon={'⭐'.repeat(complexityData.stars)}
              label="Complexity"
              value={complexityData.label}
            />
            <MetadataBadge
              icon={template.source === 'teaching' ? '📚' : '⚙️'}
              label="Source"
              value={template.source === 'teaching' ? 'Tutorial' : 'Demo Config'}
            />
          </div>
        </section>

        {/* Tags */}
        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-md bg-background-secondary text-foreground-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Learning points (for teaching templates) */}
        {template.learningPoints && template.learningPoints.length > 0 && (
          <section className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
            <h3 className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <InfoCircledIcon className="w-4 h-4 text-green-500" />
              What You'll Learn
            </h3>
            <ul className="space-y-2">
              {template.learningPoints.map((point, index) => (
                <LearningPoint key={index} point={point} />
              ))}
            </ul>
          </section>
        )}

        {/* Author */}
        {template.author && (
          <section>
            <h3 className="text-sm font-medium text-foreground mb-1">Author</h3>
            <p className="text-sm text-foreground-muted">{template.author}</p>
          </section>
        )}

        {/* Rule JSON preview */}
        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">Rule Definition</h3>
          <div className="relative rounded-lg overflow-hidden border border-border bg-background-secondary">
            <div className="absolute top-2 right-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(ruleJson)}
                className="px-2 py-1 text-xs rounded bg-background hover:bg-background-tertiary transition-colors focus-ring"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 text-xs overflow-x-auto font-mono text-foreground">
              <code>{ruleJson}</code>
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}

export default TemplatePreview;
