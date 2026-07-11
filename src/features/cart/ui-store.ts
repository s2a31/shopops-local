import { create } from "zustand";

/** Tiny client-only UI state (not persisted): is the cart drawer open? */
interface CartUiState {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

export const useCartUiStore = create<CartUiState>()((set) => ({
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
}));
