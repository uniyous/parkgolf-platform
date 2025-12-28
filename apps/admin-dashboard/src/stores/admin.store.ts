import { create } from 'zustand';
import type { Admin } from '@/types';

type ViewMode = 'list' | 'create' | 'edit' | 'permissions';

interface AdminUIState {
  // View state
  viewMode: ViewMode;
  editingAdmin: Admin | null;
  permissionAdmin: Admin | null;

  // Selection state
  selectedAdmins: Admin[];
  showBulkActions: boolean;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setEditingAdmin: (admin: Admin | null) => void;
  setPermissionAdmin: (admin: Admin | null) => void;
  setSelectedAdmins: (admins: Admin[]) => void;
  addToSelection: (admin: Admin) => void;
  removeFromSelection: (adminId: number) => void;
  clearSelection: () => void;
  toggleSelection: (admin: Admin) => void;
  setShowBulkActions: (show: boolean) => void;

  // View transitions
  startCreate: () => void;
  startEdit: (admin: Admin) => void;
  startPermissions: (admin: Admin) => void;
  goBack: () => void;
  resetUI: () => void;
}

export const useAdminUIStore = create<AdminUIState>((set, get) => ({
  // Initial state
  viewMode: 'list',
  editingAdmin: null,
  permissionAdmin: null,
  selectedAdmins: [],
  showBulkActions: false,

  // Basic setters
  setViewMode: (mode) => set({ viewMode: mode }),
  setEditingAdmin: (admin) => set({ editingAdmin: admin }),
  setPermissionAdmin: (admin) => set({ permissionAdmin: admin }),
  setSelectedAdmins: (admins) => set({ selectedAdmins: admins }),
  setShowBulkActions: (show) => set({ showBulkActions: show }),

  // Selection actions
  addToSelection: (admin) =>
    set((state) => ({
      selectedAdmins: state.selectedAdmins.some((a) => a.id === admin.id)
        ? state.selectedAdmins
        : [...state.selectedAdmins, admin],
    })),

  removeFromSelection: (adminId) =>
    set((state) => ({
      selectedAdmins: state.selectedAdmins.filter((a) => a.id !== adminId),
    })),

  clearSelection: () => set({ selectedAdmins: [], showBulkActions: false }),

  toggleSelection: (admin) => {
    const { selectedAdmins } = get();
    const isSelected = selectedAdmins.some((a) => a.id === admin.id);

    if (isSelected) {
      set({
        selectedAdmins: selectedAdmins.filter((a) => a.id !== admin.id),
      });
    } else {
      set({
        selectedAdmins: [...selectedAdmins, admin],
      });
    }
  },

  // View transitions
  startCreate: () =>
    set({
      viewMode: 'create',
      editingAdmin: null,
    }),

  startEdit: (admin) =>
    set({
      viewMode: 'edit',
      editingAdmin: admin,
    }),

  startPermissions: (admin) =>
    set({
      viewMode: 'permissions',
      permissionAdmin: admin,
    }),

  goBack: () =>
    set({
      viewMode: 'list',
      editingAdmin: null,
      permissionAdmin: null,
    }),

  resetUI: () =>
    set({
      viewMode: 'list',
      editingAdmin: null,
      permissionAdmin: null,
      selectedAdmins: [],
      showBulkActions: false,
    }),
}));

// Selector hooks for convenience
export const useAdminViewMode = () => useAdminUIStore((state) => state.viewMode);
export const useEditingAdmin = () => useAdminUIStore((state) => state.editingAdmin);
export const usePermissionAdmin = () => useAdminUIStore((state) => state.permissionAdmin);
export const useSelectedAdmins = () => useAdminUIStore((state) => state.selectedAdmins);
export const useShowBulkActions = () => useAdminUIStore((state) => state.showBulkActions);
