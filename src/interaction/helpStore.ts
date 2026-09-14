import { create } from 'zustand';

// UI-only, not domain data — kept out of useAppStore on purpose.
interface HelpState {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

export const useHelpStore = create<HelpState>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));
