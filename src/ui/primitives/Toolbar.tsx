import * as RadixToolbar from '@radix-ui/react-toolbar';
import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

/** Radix gives the row roving-focus keyboard behaviour; the look is ours. */
export function Toolbar({ children, label }: { children: ReactNode; label: string }) {
  return (
    <RadixToolbar.Root className={styles.toolbar} aria-label={label}>
      {children}
    </RadixToolbar.Root>
  );
}

export function ToolbarSeparator() {
  return <RadixToolbar.Separator className={styles.separator} />;
}
