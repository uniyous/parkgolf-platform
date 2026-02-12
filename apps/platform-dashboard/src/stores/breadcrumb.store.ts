import { create } from 'zustand';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

interface BreadcrumbState {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
  addItem: (item: BreadcrumbItem) => void;
  removeLastItem: () => void;
  updateLastItem: (item: BreadcrumbItem) => void;
  clearItems: () => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeLastItem: () => set((state) => ({ items: state.items.slice(0, -1) })),
  updateLastItem: (item) =>
    set((state) => ({
      items: state.items.length > 0
        ? [...state.items.slice(0, -1), item]
        : [item],
    })),
  clearItems: () => set({ items: [] }),
}));

export const useBreadcrumbs = (items: BreadcrumbItem[]) => {
  const setItems = useBreadcrumbStore((state) => state.setItems);
  if (typeof window !== 'undefined') {
    setItems(items);
  }
  return useBreadcrumbStore((state) => state.items);
};

// Hook to get breadcrumb items and actions - returns { items, push, pop }
export const useBreadcrumb = () => {
  const items = useBreadcrumbStore((state) => state.items);
  const addItem = useBreadcrumbStore((state) => state.addItem);
  const removeLastItem = useBreadcrumbStore((state) => state.removeLastItem);

  return {
    items,
    push: addItem,
    pop: removeLastItem,
  };
};

// Hook to set breadcrumb items - usage: useSetBreadcrumb(items)
export const useSetBreadcrumb = (items: BreadcrumbItem[]) => {
  const setItems = useBreadcrumbStore((state) => state.setItems);
  // Set items on mount
  if (typeof window !== 'undefined' && items.length > 0) {
    setItems(items);
  }
};
