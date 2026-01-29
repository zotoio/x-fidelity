import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, HamburgerMenuIcon, MoonIcon, SunIcon, ArrowLeftIcon } from '@radix-ui/react-icons';
import { TemplateLibrary } from '../TemplateLibrary';
import type { Theme } from '../../hooks';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

/**
 * Application header with logo, navigation, and theme toggle
 */
export function Header({ theme, onToggleTheme }: HeaderProps): JSX.Element {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  return (
    <header className="h-[var(--xfi-header-height)] flex items-center justify-between px-4 border-b border-border bg-background-secondary">
      {/* Logo and title */}
      <div className="flex items-center gap-3">
        <img 
          src="/x-fidelity/rule-builder/x-fi.png" 
          alt="X-Fidelity logo" 
          className="w-10 h-10 rounded-lg"
        />
        <span className="text-lg font-semibold text-foreground">X-Fi Rule Builder</span>
      </div>

      {/* Navigation actions */}
      <nav className="flex items-center gap-2">
        {/* Back to Docs link */}
        <a
          href="/x-fidelity/docs/rules/rule-builder-guide"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground-muted hover:text-foreground hover:bg-accent transition-colors focus-ring"
          aria-label="Back to documentation"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm">Docs</span>
        </a>

        {/* Template Library Button */}
        <Dialog.Root open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <Dialog.Trigger asChild>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-dark transition-colors focus-ring"
              aria-label="Open template library"
            >
              <HamburgerMenuIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Templates</span>
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl max-h-[85vh] bg-background rounded-lg shadow-xl border border-border overflow-hidden focus-ring">
              <Dialog.Title className="sr-only">Template Library</Dialog.Title>
              <Dialog.Description className="sr-only">
                Browse and select from pre-built rule templates
              </Dialog.Description>

              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Template Library</h2>
                <Dialog.Close asChild>
                  <button
                    className="p-2 rounded-md hover:bg-accent transition-colors focus-ring"
                    aria-label="Close template library"
                  >
                    <Cross2Icon className="w-4 h-4 text-foreground-muted" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="p-4 overflow-auto max-h-[calc(85vh-60px)]">
                <TemplateLibrary onSelect={() => setTemplateDialogOpen(false)} />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-md hover:bg-accent transition-colors focus-ring"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <SunIcon className="w-5 h-5 text-foreground-muted" />
          ) : (
            <MoonIcon className="w-5 h-5 text-foreground-muted" />
          )}
        </button>
      </nav>
    </header>
  );
}
