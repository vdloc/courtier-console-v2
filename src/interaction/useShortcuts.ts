import { useEffect } from 'react';
import { COMMANDS, type Command } from './commands';
import { useHelpStore } from './helpStore';

/** Reference-key spellings that differ from `KeyboardEvent.key`. */
const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  del: 'delete',
  ins: 'insert',
  space: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
};

/** `Shift+M` -> `shift+m`. The registry's display string is the source. */
function normalise(shortcut: string): string {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop() as string;
  parts.push(KEY_ALIASES[key] ?? key);
  return parts.join('+');
}

const BY_KEY = new Map<string, Command>();
for (const command of COMMANDS) {
  if (command.shortcut) BY_KEY.set(normalise(command.shortcut), command);
}

/**
 * Build the same form from a real event, using `event.key` (layout-aware)
 * rather than `event.code`. Shift is recorded only where it's a modifier: `?`
 * already arrives as `?` on most layouts, but `Shift+M` arrives as `M`, which
 * needs the flag to tell it apart from a plain `m`.
 */
function describe(event: KeyboardEvent): string {
  const key = event.key.toLowerCase();
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('ctrl');
  if (event.shiftKey && (key.length > 1 || /[a-z]/.test(key))) parts.push('shift');
  if (event.altKey) parts.push('alt');
  parts.push(key);
  return parts.join('+');
}

/** Whether the keystroke belongs to something the user is typing into. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.closest('[role="textbox"], [role="combobox"]') !== null;
}

/** The app's only global key handler — bound once, resolved from the registry per keypress. */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      // Escape only leaves the field; cancelling a measurement is not what
      // leaving a text box should mean.
      if (isTextEntry(event.target)) {
        if (event.key === 'Escape' && event.target instanceof HTMLElement) {
          event.target.blur();
        }
        return;
      }

      // The help overlay owns the keyboard while open; Escape still reaches
      // the cancel command, which closes the innermost thing first.
      if (useHelpStore.getState().open && event.key !== 'Escape') return;

      if (event.altKey) return;

      const command = BY_KEY.get(describe(event));
      if (!command) return;
      if (command.enabled && !command.enabled()) return;

      // Only now, once a real command has matched — taking this earlier would
      // swallow browser shortcuts the app never claimed.
      event.preventDefault();
      command.run();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
