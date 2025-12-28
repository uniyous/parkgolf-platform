import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi, type CourseFilters, type ClubFilters, type CreateClubDto, type UpdateClubDto } from '@/lib/api/courses';
import { courseKeys, clubKeys } from './keys';
import type { CreateCourseDto, UpdateCourseDto, CreateHoleDto, UpdateHoleDto } from '@/types';

// ============================================
// Club Queries
// ============================================

export const useClubs = (filters?: ClubFilters) => {
  return useQuery({
    queryKey: clubKeys.list(filters),
    queryFn: () => courseApi.getClubs(filters),
  });
};

export const useClub = (id: number) => {
  return useQuery({
    queryKey: clubKeys.detail(id),
    queryFn: () => courseApi.getClubById(id),
    enabled: !!id,
  });
};

export const useClubsByCompany = (companyId: number) => {
  return useQuery({
    queryKey: clubKeys.byCompany(companyId),
    queryFn: () => courseApi.getClubsByCompany(companyId),
    enabled: !!companyId,
  });
};

export const useSearchClubs = (query: string) => {
  return useQuery({
    queryKey: clubKeys.search(query),
    queryFn: () => courseApi.searchClubs(query),
    enabled: query.length >= 2,
  });
};

// ============================================
// Course Queries
// ============================================

export const useCourses = (filters?: CourseFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: courseKeys.list({ ...filters, page, limit }),
    queryFn: () => courseApi.getCourses(filters, page, limit),
  });
};

export const useCourse = (id: number) => {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: () => courseApi.getCourseById(id),
    enabled: !!id,
  });
};

export const useCoursesByClub = (clubId: number) => {
  return useQuery({
    queryKey: courseKeys.byClub(clubId),
    queryFn: () => courseApi.getCoursesByClub(clubId),
    enabled: !!clubId,
  });
};

export const useCoursesByCompany = (companyId: number) => {
  return useQuery({
    queryKey: courseKeys.byCompany(companyId),
    queryFn: () => courseApi.getCoursesByCompany(companyId),
    enabled: !!companyId,
  });
};

export const useCourseStats = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: courseKeys.stats(),
    queryFn: () => courseApi.getCourseStats(startDate, endDate),
  });
};

// ============================================
// Hole Queries
// ============================================

export const useHolesByCourse = (courseId: number) => {
  return useQuery({
    queryKey: courseKeys.holes(courseId),
    queryFn: () => courseApi.getHolesByCourse(courseId),
    enabled: !!courseId,
  });
};

// ============================================
// Club Mutations
// ============================================

export const useCreateClub = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClubDto) => courseApi.createClub(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() });
    },
  });
};

export const useUpdateClub = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClubDto }) =>
      courseApi.updateClub(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clubKeys.detail(id) });
    },
  });
};

export const useDeleteClub = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => courseApi.deleteClub(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });
};

// ============================================
// Course Mutations
// ============================================

export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCourseDto) => courseApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: courseKeys.stats() });
    },
  });
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCourseDto }) =>
      courseApi.updateCourse(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: courseKeys.stats() });
    },
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => courseApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
};

// ============================================
// Hole Mutations
// ============================================

export const useCreateHole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: CreateHoleDto }) =>
      courseApi.createHole(courseId, data),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.holes(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
    },
  });
};

export const useUpdateHole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      holeId,
      data,
    }: {
      courseId: number;
      holeId: number;
      data: UpdateHoleDto;
    }) => courseApi.updateHole(courseId, holeId, data),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.holes(courseId) });
    },
  });
};

export const useDeleteHole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, holeId }: { courseId: number; holeId: number }) =>
      courseApi.deleteHole(courseId, holeId),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.holes(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
    },
  });
};
