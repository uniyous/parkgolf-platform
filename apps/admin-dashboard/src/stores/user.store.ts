import { create } from 'zustand';
import type { User, UserFilters } from '@/types';

type ViewMode = 'list' | 'create' | 'edit' | 'permissions';

interface UserUIState {
  // View state
  viewMode: ViewMode;
  editingUser: User | null;
  permissionUser: User | null;
  selectedUser: User | null;

  // Selection state
  selectedUsers: User[];
  showBulkActions: boolean;

  // Filter state
  filters: UserFilters;

  // Pagination state
  page: number;
  limit: number;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setEditingUser: (user: User | null) => void;
  setPermissionUser: (user: User | null) => void;
  setSelectedUser: (user: User | null) => void;
  setSelectedUsers: (users: User[]) => void;
  addToSelection: (user: User) => void;
  removeFromSelection: (userId: number) => void;
  clearSelection: () => void;
  toggleSelection: (user: User) => void;
  setShowBulkActions: (show: boolean) => void;
  setFilters: (filters: Partial<UserFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // View transitions
  startCreate: () => void;
  startEdit: (user: User) => void;
  startPermissions: (user: User) => void;
  goBack: () => void;
  resetUI: () => void;
}

const defaultFilters: UserFilters = {
  search: '',
  membershipTier: undefined,
  status: undefined,
  sortBy: 'name',
  sortOrder: 'asc',
};

export const useUserUIStore = create<UserUIState>((set, get) => ({
  // Initial state
  viewMode: 'list',
  editingUser: null,
  permissionUser: null,
  selectedUser: null,
  selectedUsers: [],
  showBulkActions: false,
  filters: { ...defaultFilters },
  page: 1,
  limit: 20,

  // Basic setters
  setViewMode: (mode) => set({ viewMode: mode }),
  setEditingUser: (user) => set({ editingUser: user }),
  setPermissionUser: (user) => set({ permissionUser: user }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setSelectedUsers: (users) => set({ selectedUsers: users }),
  setShowBulkActions: (show) => set({ showBulkActions: show }),

  // Selection actions
  addToSelection: (user) =>
    set((state) => ({
      selectedUsers: state.selectedUsers.some((u) => u.id === user.id)
        ? state.selectedUsers
        : [...state.selectedUsers, user],
    })),

  removeFromSelection: (userId) =>
    set((state) => ({
      selectedUsers: state.selectedUsers.filter((u) => u.id !== userId),
    })),

  clearSelection: () => set({ selectedUsers: [], showBulkActions: false }),

  toggleSelection: (user) => {
    const { selectedUsers } = get();
    const isSelected = selectedUsers.some((u) => u.id === user.id);

    if (isSelected) {
      set({
        selectedUsers: selectedUsers.filter((u) => u.id !== user.id),
      });
    } else {
      set({
        selectedUsers: [...selectedUsers, user],
      });
    }
  },

  // Filter actions
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1,
    })),

  resetFilters: () =>
    set({
      filters: { ...defaultFilters },
      page: 1,
    }),

  // Pagination actions
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),

  // View transitions
  startCreate: () =>
    set({
      viewMode: 'create',
      editingUser: null,
    }),

  startEdit: (user) =>
    set({
      viewMode: 'edit',
      editingUser: user,
    }),

  startPermissions: (user) =>
    set({
      viewMode: 'permissions',
      permissionUser: user,
    }),

  goBack: () =>
    set({
      viewMode: 'list',
      editingUser: null,
      permissionUser: null,
    }),

  resetUI: () =>
    set({
      viewMode: 'list',
      editingUser: null,
      permissionUser: null,
      selectedUser: null,
      selectedUsers: [],
      showBulkActions: false,
      filters: { ...defaultFilters },
      page: 1,
    }),
}));

// Selector hooks for convenience
export const useUserViewMode = () => useUserUIStore((state) => state.viewMode);
export const useEditingUser = () => useUserUIStore((state) => state.editingUser);
export const usePermissionUser = () => useUserUIStore((state) => state.permissionUser);
export const useSelectedUser = () => useUserUIStore((state) => state.selectedUser);
export const useSelectedUsers = () => useUserUIStore((state) => state.selectedUsers);
export const useShowUserBulkActions = () => useUserUIStore((state) => state.showBulkActions);
export const useUserFilters = () => useUserUIStore((state) => state.filters);
export const useUserPagination = () =>
  useUserUIStore((state) => ({ page: state.page, limit: state.limit }));
