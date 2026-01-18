/**
 * RuleForm component - Center panel for editing rule properties
 *
 * Dynamically renders the appropriate form based on the selected node type:
 * - Root: RootForm for rule name and priority
 * - Condition Group: ConditionGroupForm for all/any/not selection
 * - Condition: ConditionForm for fact, operator, value
 * - Event: EventForm for event type and message
 *
 * Features:
 * - Bidirectional sync with store
 * - Debounced updates for smooth typing
 * - Comprehensive tooltips and documentation
 * - Validation error display
 */

import { MixerHorizontalIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useSelectedNode, useValidation } from '../../hooks';
import { RootForm } from './forms/RootForm';
import { ConditionGroupForm } from './forms/ConditionGroupForm';
import { ConditionForm } from './forms/ConditionForm';
import { EventForm } from './forms/EventForm';
import { EventParamForm } from './forms/EventParamForm';
import type { RuleCondition, RuleEvent, NestedCondition } from '../../types';

/**
 * Empty state component when nothing is selected
 */
function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <MixerHorizontalIcon className="w-12 h-12 mb-4 text-foreground-muted opacity-50" />
      <h3 className="text-lg font-medium text-foreground mb-2">Rule Editor</h3>
      <p className="text-sm text-foreground-muted max-w-xs">
        Select a rule, condition, or event from the tree to edit its properties
      </p>
    </div>
  );
}

/**
 * Conditions root node component (when conditions object itself is selected)
 */
function ConditionsRootForm(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Conditions</h3>
        <p className="text-sm text-foreground-muted mt-1">
          The root container for all rule conditions
        </p>
      </div>

      {/* Info */}
      <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-1">About Conditions</h4>
        <p className="text-xs text-foreground-muted">
          Conditions determine when this rule should fire. Expand the tree to view and edit
          individual conditions or condition groups. Use the tree view to add new conditions
          or change the logical grouping (ALL/ANY/NOT).
        </p>
      </div>

      {/* Tip */}
      <div className="p-4 bg-background-secondary rounded-lg border border-border">
        <h4 className="text-sm font-medium text-foreground mb-2">Quick Actions</h4>
        <ul className="space-y-2 text-sm text-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Click on condition groups to change between ALL/ANY/NOT logic</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Click on individual conditions to edit fact, operator, and value</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Use the tree context menu to add, delete, or move conditions</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Unknown node type fallback component
 */
function UnknownNodeForm({ nodeType }: { nodeType: string }): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">Unknown Node</h3>
        <p className="text-sm text-foreground-muted mt-1">
          Cannot edit this node type: {nodeType}
        </p>
      </div>

      {/* Warning */}
      <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-warning mb-1">Unsupported Node Type</h4>
          <p className="text-xs text-foreground-muted">
            This node type is not recognized. Please select a different node from the tree.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Main RuleForm component
 */
export function RuleForm(): JSX.Element {
  // Get selected node information
  const { path, node, nodeType, hasSelection } = useSelectedNode();

  // Get validation state for error summary
  const { errorCount } = useValidation();

  // If no selection or no rule loaded, show empty state
  if (!hasSelection || !node) {
    return (
      <div className="h-full flex flex-col">
        <EmptyState />
      </div>
    );
  }

  // Render appropriate form based on node type
  const renderForm = (): JSX.Element => {
    switch (nodeType) {
      case 'rule':
        return <RootForm path={path} />;

      case 'conditions':
        return <ConditionsRootForm />;

      case 'condition-group':
        return (
          <ConditionGroupForm
            path={path}
            data={node as NestedCondition}
          />
        );

      case 'condition':
        return (
          <ConditionForm
            path={path}
            data={node as RuleCondition}
          />
        );

      case 'event':
        return (
          <EventForm
            path={path}
            data={node as RuleEvent}
          />
        );

      case 'event-param':
        return (
          <EventParamForm
            path={path}
            data={node}
          />
        );

      default:
        return <UnknownNodeForm nodeType={nodeType} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Validation status bar */}
      {errorCount > 0 && (
        <div className="shrink-0 px-4 py-2 bg-error/10 border-b border-error/20 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-error" />
          <span className="text-sm text-error">
            {errorCount} validation {errorCount === 1 ? 'error' : 'errors'}
          </span>
        </div>
      )}

      {/* Form content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderForm()}
      </div>
    </div>
  );
}
