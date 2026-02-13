import type { BookingFilters } from '@/lib/api/bookingApi';
import type { CompanyFiltersQuery } from '@/lib/api/companyApi';
import type { CourseFilters } from '@/lib/api/courses';

// Auth Keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

// Admin Keys
export const adminKeys = {
  all: ['admins'] as const,
  lists: () => [...adminKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...adminKeys.lists(), filters] as const,
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
  list: (filters?: Record<string, any>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
  bookings: (id: number, filters?: Record<string, any>) => [...userKeys.all, 'bookings', id, filters] as const,
  preferences: (id: number) => [...userKeys.all, 'preferences', id] as const,
};

// Company Keys
export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (filters?: CompanyFiltersQuery) => [...companyKeys.lists(), filters] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: number) => [...companyKeys.details(), id] as const,
  stats: () => [...companyKeys.all, 'stats'] as const,
};

// Course Keys (company-scoped)
export const courseKeys = {
  all: (companyId?: number | null) => ['courses', companyId] as const,
  lists: (companyId?: number | null) => [...courseKeys.all(companyId), 'list'] as const,
  list: (companyId?: number | null, filters?: CourseFilters) => [...courseKeys.lists(companyId), filters] as const,
  details: (companyId?: number | null) => [...courseKeys.all(companyId), 'detail'] as const,
  detail: (companyId?: number | null, id?: number) => [...courseKeys.details(companyId), id] as const,
  byClub: (companyId?: number | null, clubId?: number) => [...courseKeys.all(companyId), 'club', clubId] as const,
  byCompany: (companyId?: number | null, targetCompanyId?: number) => [...courseKeys.all(companyId), 'company', targetCompanyId] as const,
  stats: (companyId?: number | null) => [...courseKeys.all(companyId), 'stats'] as const,
  holes: (companyId?: number | null, courseId?: number) => [...courseKeys.all(companyId), 'holes', courseId] as const,
};

// Club Keys (company-scoped)
export const clubKeys = {
  all: (companyId?: number | null) => ['clubs', companyId] as const,
  lists: (companyId?: number | null) => [...clubKeys.all(companyId), 'list'] as const,
  list: (companyId?: number | null, filters?: Record<string, unknown>) => [...clubKeys.lists(companyId), filters] as const,
  details: (companyId?: number | null) => [...clubKeys.all(companyId), 'detail'] as const,
  detail: (companyId?: number | null, id?: number) => [...clubKeys.details(companyId), id] as const,
  byCompany: (companyId?: number | null, targetCompanyId?: number) => [...clubKeys.all(companyId), 'company', targetCompanyId] as const,
  search: (companyId?: number | null, query?: string) => [...clubKeys.all(companyId), 'search', query] as const,
};

// Booking Keys (company-scoped)
export const bookingKeys = {
  all: (companyId?: number | null) => ['bookings', companyId] as const,
  lists: (companyId?: number | null) => [...bookingKeys.all(companyId), 'list'] as const,
  list: (companyId?: number | null, filters?: BookingFilters) => [...bookingKeys.lists(companyId), filters] as const,
  details: (companyId?: number | null) => [...bookingKeys.all(companyId), 'detail'] as const,
  detail: (companyId?: number | null, id?: number) => [...bookingKeys.details(companyId), id] as const,
  stats: (companyId?: number | null) => [...bookingKeys.all(companyId), 'stats'] as const,
  calendar: (companyId?: number | null, date?: string) => [...bookingKeys.all(companyId), 'calendar', date] as const,
};

// Game Keys (company-scoped)
export const gameKeys = {
  all: (companyId?: number | null) => ['games', companyId] as const,
  lists: (companyId?: number | null) => [...gameKeys.all(companyId), 'list'] as const,
  list: (companyId?: number | null, filters?: Record<string, unknown>) => [...gameKeys.lists(companyId), filters] as const,
  details: (companyId?: number | null) => [...gameKeys.all(companyId), 'detail'] as const,
  detail: (companyId?: number | null, id?: number) => [...gameKeys.details(companyId), id] as const,
  byClub: (companyId?: number | null, clubId?: number) => [...gameKeys.all(companyId), 'club', clubId] as const,
  weeklySchedules: (companyId?: number | null, gameId?: number) => [...gameKeys.all(companyId), 'weekly-schedules', gameId] as const,
  timeSlots: (companyId?: number | null, gameId?: number, filter?: Record<string, unknown>) => [...gameKeys.all(companyId), 'time-slots', gameId, filter] as const,
  timeSlotStats: (companyId?: number | null, filter?: Record<string, unknown>) => [...gameKeys.all(companyId), 'time-slot-stats', filter] as const,
};

// Dashboard Keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (startDate?: string, endDate?: string) => [...dashboardKeys.all, 'overview', startDate, endDate] as const,
  realTime: () => [...dashboardKeys.all, 'realTime'] as const,
  trends: (period: string) => [...dashboardKeys.all, 'trends', period] as const,
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
