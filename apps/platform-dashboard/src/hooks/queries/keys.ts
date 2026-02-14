// Auth Keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

// Admin Keys
export const adminKeys = {
  all: ['admins'] as const,
  lists: () => [...adminKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...adminKeys.lists(), filters] as const,
  details: () => [...adminKeys.all, 'detail'] as const,
  detail: (id: number) => [...adminKeys.details(), id] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  permissions: () => [...adminKeys.all, 'permissions'] as const,
};

// Role Keys
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (userType?: string) => [...roleKeys.lists(), userType] as const,
  withPermissions: (userType?: string) => [...roleKeys.all, 'withPermissions', userType] as const,
  permissions: (roleCode: string) => [...roleKeys.all, 'permissions', roleCode] as const,
};

// User Keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

// Company Keys
export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...companyKeys.lists(), filters] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: number) => [...companyKeys.details(), id] as const,
  stats: () => [...companyKeys.all, 'stats'] as const,
};

// Club Keys
export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...clubKeys.lists(), filters] as const,
  details: () => [...clubKeys.all, 'detail'] as const,
  detail: (id: number) => [...clubKeys.details(), id] as const,
};

// Booking Keys
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: number) => [...bookingKeys.details(), id] as const,
  stats: () => [...bookingKeys.all, 'stats'] as const,
};

// Game Keys
export const gameKeys = {
  all: ['games'] as const,
  lists: () => [...gameKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...gameKeys.lists(), filters] as const,
  details: () => [...gameKeys.all, 'detail'] as const,
  detail: (id: number) => [...gameKeys.details(), id] as const,
};

// Menu Keys
export const menuKeys = {
  all: ['menus'] as const,
  tree: (companyType: string, scope: string) => [...menuKeys.all, 'tree', companyType, scope] as const,
};

// Policy Keys (company-scoped)
export const policyKeys = {
  all: (companyId?: number | null) => ['policies', companyId] as const,
  cancellation: (companyId?: number | null) => [...policyKeys.all(companyId), 'cancellation'] as const,
  cancellationDefault: (companyId?: number | null, clubId?: number) => [...policyKeys.cancellation(companyId), 'default', clubId] as const,
  cancellationDetail: (companyId?: number | null, id?: number) => [...policyKeys.cancellation(companyId), 'detail', id] as const,
  refund: (companyId?: number | null) => [...policyKeys.all(companyId), 'refund'] as const,
  refundDefault: (companyId?: number | null, clubId?: number) => [...policyKeys.refund(companyId), 'default', clubId] as const,
  refundDetail: (companyId?: number | null, id?: number) => [...policyKeys.refund(companyId), 'detail', id] as const,
  noShow: (companyId?: number | null) => [...policyKeys.all(companyId), 'noShow'] as const,
  noShowDefault: (companyId?: number | null, clubId?: number) => [...policyKeys.noShow(companyId), 'default', clubId] as const,
  noShowDetail: (companyId?: number | null, id?: number) => [...policyKeys.noShow(companyId), 'detail', id] as const,
};

// Analytics Keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: () => [...analyticsKeys.all, 'dashboard'] as const,
  bookings: (filters?: Record<string, unknown>) => [...analyticsKeys.all, 'bookings', filters] as const,
  clubs: (filters?: Record<string, unknown>) => [...analyticsKeys.all, 'clubs', filters] as const,
  revenue: (filters?: Record<string, unknown>) => [...analyticsKeys.all, 'revenue', filters] as const,
};
