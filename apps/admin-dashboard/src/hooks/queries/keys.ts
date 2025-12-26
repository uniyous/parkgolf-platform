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

// Course Keys
export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters?: CourseFilters) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: number) => [...courseKeys.details(), id] as const,
  byClub: (clubId: number) => [...courseKeys.all, 'club', clubId] as const,
  byCompany: (companyId: number) => [...courseKeys.all, 'company', companyId] as const,
  stats: () => [...courseKeys.all, 'stats'] as const,
  holes: (courseId: number) => [...courseKeys.all, 'holes', courseId] as const,
};

// Club Keys
export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...clubKeys.lists(), filters] as const,
  details: () => [...clubKeys.all, 'detail'] as const,
  detail: (id: number) => [...clubKeys.details(), id] as const,
  byCompany: (companyId: number) => [...clubKeys.all, 'company', companyId] as const,
  search: (query: string) => [...clubKeys.all, 'search', query] as const,
};

// Booking Keys
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters?: BookingFilters) => [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: number) => [...bookingKeys.details(), id] as const,
  stats: () => [...bookingKeys.all, 'stats'] as const,
  calendar: (date: string) => [...bookingKeys.all, 'calendar', date] as const,
};
