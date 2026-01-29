import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './Header';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronDownIcon, ChevronUpIcon, EnterFullScreenIcon, ExitFullScreenIcon, Cross2Icon, SizeIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import type { Theme } from '../../hooks';

interface LayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  bottomPanel: ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
}

/** State to preserve when maximizing the simulation panel */
interface SimulationPanelPreMaxState {
  height: number;
  wasOpen: boolean;
}

/** Which panel is currently expanded in a modal */
type ExpandedPanel = 'left' | 'center' | 'right' | null;

interface PanelHeaderProps {
  title: string;
  onExpand: () => void;
  tooltip?: string;
}

/**
 * Panel header with title, optional tooltip, and expand button
 */
function PanelHeader({ title, onExpand, tooltip }: PanelHeaderProps): JSX.Element {
  return (
    <div className="panel-header flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span>{title}</span>
        {tooltip && (
          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-accent transition-colors focus-ring"
                  aria-label="Show help"
                >
                  <InfoCircledIcon className="w-3.5 h-3.5 text-foreground-muted" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-background-elevated text-foreground text-xs px-3 py-2 rounded-md shadow-lg border border-border max-w-xs z-50"
                  sideOffset={5}
                >
                  {tooltip}
                  <Tooltip.Arrow className="fill-background-elevated" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
      </div>
      <button
        onClick={onExpand}
        className="p-1 rounded hover:bg-accent transition-colors focus-ring"
        aria-label={`Expand ${title}`}
        title={`Open ${title} in modal`}
      >
        <SizeIcon className="w-3.5 h-3.5 text-foreground-muted" />
      </button>
    </div>
  );
}

interface PanelModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Default modal dimensions */
const MODAL_DEFAULTS = {
  width: 900,
  height: 600,
  minWidth: 400,
  minHeight: 300,
  maxWidth: 1400,
  maxHeight: 900,
};

/**
 * Modal dialog for expanded panel view
 * - Draggable from the header
 * - Resizable from edges and corners
 * - Minimum height enforced
 */
function PanelModal({ title, open, onClose, children }: PanelModalProps): JSX.Element {
  // Modal position and size state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: MODAL_DEFAULTS.width, height: MODAL_DEFAULTS.height });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // Reset position and size when opening
  useEffect(() => {
    if (open) {
      setPosition({ x: 0, y: 0 });
      setSize({ width: MODAL_DEFAULTS.width, height: MODAL_DEFAULTS.height });
    }
  }, [open]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  }, [position]);

  // Handle resize start
  const handleResizeStart = useCallback((edge: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(edge);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    };
  }, [size, position]);

  // Global mouse move and up handlers
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        setPosition({
          x: dragStartRef.current.posX + deltaX,
          y: dragStartRef.current.posY + deltaY,
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        const { width: startWidth, height: startHeight, posX, posY } = resizeStartRef.current;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newPosX = posX;
        let newPosY = posY;

        // Handle different resize edges
        if (isResizing.includes('e')) {
          newWidth = Math.max(MODAL_DEFAULTS.minWidth, Math.min(MODAL_DEFAULTS.maxWidth, startWidth + deltaX));
        }
        if (isResizing.includes('w')) {
          const widthDelta = Math.max(MODAL_DEFAULTS.minWidth, Math.min(MODAL_DEFAULTS.maxWidth, startWidth - deltaX)) - startWidth;
          newWidth = startWidth + widthDelta;
          newPosX = posX - widthDelta;
        }
        if (isResizing.includes('s')) {
          newHeight = Math.max(MODAL_DEFAULTS.minHeight, Math.min(MODAL_DEFAULTS.maxHeight, startHeight + deltaY));
        }
        if (isResizing.includes('n')) {
          const heightDelta = Math.max(MODAL_DEFAULTS.minHeight, Math.min(MODAL_DEFAULTS.maxHeight, startHeight - deltaY)) - startHeight;
          newHeight = startHeight + heightDelta;
          newPosY = posY - heightDelta;
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newPosX, y: newPosY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  // Set cursor during drag/resize
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'move';
      document.body.style.userSelect = 'none';
    } else if (isResizing) {
      const cursors: Record<string, string> = {
        n: 'ns-resize', s: 'ns-resize',
        e: 'ew-resize', w: 'ew-resize',
        ne: 'nesw-resize', sw: 'nesw-resize',
        nw: 'nwse-resize', se: 'nwse-resize',
      };
      document.body.style.cursor = cursors[isResizing] || 'default';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing]);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in z-50" />
        <Dialog.Content
          className="fixed bg-background rounded-lg shadow-xl border border-border overflow-hidden focus-ring z-50"
          style={{
            top: `calc(50% + ${position.y}px)`,
            left: `calc(50% + ${position.x}px)`,
            transform: 'translate(-50%, -50%)',
            width: size.width,
            height: size.height,
            minWidth: MODAL_DEFAULTS.minWidth,
            minHeight: MODAL_DEFAULTS.minHeight,
          }}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Expanded view of {title}
          </Dialog.Description>

          {/* Resize handles - edges */}
          <div className="absolute top-0 left-2 right-2 h-1 cursor-ns-resize hover:bg-primary/30" onMouseDown={handleResizeStart('n')} />
          <div className="absolute bottom-0 left-2 right-2 h-1 cursor-ns-resize hover:bg-primary/30" onMouseDown={handleResizeStart('s')} />
          <div className="absolute left-0 top-2 bottom-2 w-1 cursor-ew-resize hover:bg-primary/30" onMouseDown={handleResizeStart('w')} />
          <div className="absolute right-0 top-2 bottom-2 w-1 cursor-ew-resize hover:bg-primary/30" onMouseDown={handleResizeStart('e')} />
          
          {/* Resize handles - corners */}
          <div className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize" onMouseDown={handleResizeStart('nw')} />
          <div className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize" onMouseDown={handleResizeStart('ne')} />
          <div className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize" onMouseDown={handleResizeStart('sw')} />
          <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize" onMouseDown={handleResizeStart('se')} />

          {/* Draggable header */}
          <div
            className="flex items-center justify-between p-4 border-b border-border bg-background-secondary cursor-move select-none"
            onMouseDown={handleDragStart}
          >
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <Dialog.Close asChild>
              <button
                className="p-2 rounded-md hover:bg-accent transition-colors focus-ring cursor-pointer"
                aria-label={`Close ${title}`}
              >
                <Cross2Icon className="w-4 h-4 text-foreground-muted" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content area */}
          <div className="p-4 overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Three-panel layout for the Rule Builder
 *
 * Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Header: X-Fidelity Rule Builder              [Templates]   │
 * ├──────────────┬─────────────────────┬────────────────────────┤
 * │              │                     │                        │
 * │  Rule Tree   │    Rule Form        │    JSON Editor         │
 * │  (Navigation)│    (Edit selected)  │    (Monaco)            │
 * │              │                     │                        │
 * │              │                     │                        │
 * ├──────────────┴─────────────────────┴────────────────────────┤
 * │ Simulation Panel (collapsible)                              │
 * └─────────────────────────────────────────────────────────────┘
 */
export function Layout({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomPanel,
  theme,
  onToggleTheme,
}: LayoutProps): JSX.Element {
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [leftWidth, setLeftWidth] = useState(250); // pixels
  const [rightWidth, setRightWidth] = useState(380); // pixels
  const [bottomHeight, setBottomHeight] = useState(200); // pixels for simulation panel
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
  const isDraggingBottom = useRef(false);
  
  // Store the state before maximizing so we can restore it
  const preMaxState = useRef<SimulationPanelPreMaxState | null>(null);
  
  const handleExpandPanel = useCallback((panel: ExpandedPanel) => {
    setExpandedPanel(panel);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setExpandedPanel(null);
  }, []);

  const handleToggleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isMaximized) {
      // Entering maximize mode - save current state
      preMaxState.current = {
        height: bottomHeight,
        wasOpen: bottomPanelOpen,
      };
      setIsMaximized(true);
      // Ensure panel is open when maximizing
      if (!bottomPanelOpen) {
        setBottomPanelOpen(true);
      }
    } else {
      // Exiting maximize mode - restore previous state
      setIsMaximized(false);
      if (preMaxState.current) {
        setBottomHeight(preMaxState.current.height);
        setBottomPanelOpen(preMaxState.current.wasOpen);
        preMaxState.current = null;
      }
    }
  };
  
  const handleBottomMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingBottom.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingBottom.current) return;
      // Calculate height from bottom of viewport
      const newHeight = Math.max(100, Math.min(600, window.innerHeight - e.clientY - 40));
      setBottomHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDraggingBottom.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseDown = useCallback((side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    if (side === 'left') {
      isDraggingLeft.current = true;
    } else {
      isDraggingRight.current = true;
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      
      if (isDraggingLeft.current) {
        const newWidth = Math.max(180, Math.min(400, e.clientX - containerRect.left - 16));
        setLeftWidth(newWidth);
      } else if (isDraggingRight.current) {
        const newWidth = Math.max(200, Math.min(500, containerRect.right - e.clientX - 16));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDraggingLeft.current = false;
      isDraggingRight.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header theme={theme} onToggleTheme={onToggleTheme} />

      {/* Main content area - hidden when maximized */}
      {!isMaximized && (
        <div ref={containerRef} className="flex-1 flex overflow-hidden p-4 gap-0">
          {/* Left Panel - Rule Tree */}
          <div 
            className="panel overflow-hidden flex flex-col flex-shrink-0"
            style={{ width: leftWidth }}
          >
            <PanelHeader 
              title="Rule Tree" 
              onExpand={() => handleExpandPanel('left')}
              tooltip="Right-click on tree items to add conditions, change logic operators (all/any), or reorder items"
            />
            <div className="panel-content flex-1 overflow-auto">
              {leftPanel}
            </div>
          </div>

          {/* Left resize handle */}
          <div 
            className="resizer-handle"
            onMouseDown={handleMouseDown('left')}
          >
            <div className="resizer-indicator" />
          </div>

          {/* Center Panel - Rule Form */}
          <div className="flex-1 panel overflow-hidden flex flex-col min-w-0">
            <PanelHeader title="Rule Editor" onExpand={() => handleExpandPanel('center')} />
            <div className="panel-content flex-1 overflow-auto">
              {centerPanel}
            </div>
          </div>

          {/* Right resize handle */}
          <div 
            className="resizer-handle"
            onMouseDown={handleMouseDown('right')}
          >
            <div className="resizer-indicator" />
          </div>

          {/* Right Panel - JSON Editor */}
          <div 
            className="panel overflow-hidden flex flex-col flex-shrink-0"
            style={{ width: rightWidth }}
          >
            <PanelHeader title="JSON Preview" onExpand={() => handleExpandPanel('right')} />
            <div className="panel-content flex-1 overflow-auto">
              {rightPanel}
            </div>
          </div>
        </div>
      )}
      
      {/* Panel Modals - render content in expanded view */}
      <PanelModal
        title="Rule Tree"
        open={expandedPanel === 'left'}
        onClose={handleCloseModal}
      >
        {leftPanel}
      </PanelModal>
      
      <PanelModal
        title="Rule Editor"
        open={expandedPanel === 'center'}
        onClose={handleCloseModal}
      >
        {centerPanel}
      </PanelModal>
      
      <PanelModal
        title="JSON Preview"
        open={expandedPanel === 'right'}
        onClose={handleCloseModal}
      >
        {rightPanel}
      </PanelModal>

      {/* Bottom Panel - Simulation (Collapsible, Maximizable, Resizable) */}
      <Collapsible.Root
        open={bottomPanelOpen}
        onOpenChange={setBottomPanelOpen}
        className={`border-t border-border ${isMaximized ? 'flex-1 flex flex-col' : 'flex-shrink-0'}`}
      >
        {/* Vertical resize handle - only visible when panel is open and not maximized */}
        {bottomPanelOpen && !isMaximized && (
          <div 
            className="resizer-handle-horizontal"
            onMouseDown={handleBottomMouseDown}
          >
            <div className="resizer-indicator-horizontal" />
          </div>
        )}
        
        <div className="flex items-center bg-background-secondary">
          <Collapsible.Trigger asChild>
            <button
              className="flex-1 flex items-center justify-between px-4 py-2 hover:bg-accent transition-colors focus-ring"
              aria-label={bottomPanelOpen ? 'Collapse simulation panel' : 'Expand simulation panel'}
            >
              <span className="text-sm font-medium text-foreground-muted uppercase tracking-wide">
                Simulation Panel
              </span>
              {bottomPanelOpen ? (
                <ChevronDownIcon className="w-4 h-4 text-foreground-muted" />
              ) : (
                <ChevronUpIcon className="w-4 h-4 text-foreground-muted" />
              )}
            </button>
          </Collapsible.Trigger>
          {/* Maximize/Minimize toggle */}
          <button
            onClick={handleToggleMaximize}
            className="px-3 py-2 hover:bg-accent transition-colors focus-ring border-l border-border"
            aria-label={isMaximized ? 'Exit full screen' : 'Enter full screen'}
            title={isMaximized ? 'Exit full screen' : 'Maximize simulation panel'}
          >
            {isMaximized ? (
              <ExitFullScreenIcon className="w-4 h-4 text-foreground-muted" />
            ) : (
              <EnterFullScreenIcon className="w-4 h-4 text-foreground-muted" />
            )}
          </button>
        </div>
        <Collapsible.Content className={`bg-background-secondary ${isMaximized ? 'flex-1' : ''}`}>
          <div 
            className={`p-4 overflow-auto ${isMaximized ? 'h-full' : ''}`}
            style={!isMaximized ? { height: bottomHeight } : undefined}
          >
            {bottomPanel}
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}
