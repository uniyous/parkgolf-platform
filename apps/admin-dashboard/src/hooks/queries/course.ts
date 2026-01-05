import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi, type CourseFilters, type ClubFilters, type CreateClubDto, type UpdateClubDto } from '@/lib/api/courses';
import { courseKeys, clubKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import type { CreateCourseDto, UpdateCourseDto, CreateHoleDto, UpdateHoleDto } from '@/types';

// ============================================
// Club Queries
// ============================================

export const useClubsQuery = (filters?: ClubFilters) => {
  return useQuery({
    queryKey: clubKeys.list(filters),
    queryFn: () => courseApi.getClubs(filters),
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useClubQuery = (id: number) => {
  return useQuery({
    queryKey: clubKeys.detail(id),
    queryFn: () => courseApi.getClubById(id),
    enabled: !!id,
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useClubsByCompanyQuery = (companyId: number) => {
  return useQuery({
    queryKey: clubKeys.byCompany(companyId),
    queryFn: () => courseApi.getClubsByCompany(companyId),
    enabled: !!companyId,
  });
};

export const useSearchClubsQuery = (query: string) => {
  return useQuery({
    queryKey: clubKeys.search(query),
    queryFn: () => courseApi.searchClubs(query),
    enabled: query.length >= 2,
  });
};

// ============================================
// Course Queries
// ============================================

export const useCoursesQuery = (filters?: CourseFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: courseKeys.list({ ...filters, page, limit }),
    queryFn: () => courseApi.getCourses(filters, page, limit),
  });
};

export const useCourseQuery = (id: number) => {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: () => courseApi.getCourseById(id),
    enabled: !!id,
  });
};

export const useCoursesByClubQuery = (clubId: number) => {
  return useQuery({
    queryKey: courseKeys.byClub(clubId),
    queryFn: () => courseApi.getCoursesByClub(clubId),
    enabled: !!clubId,
  });
};

export const useCoursesByCompanyQuery = (companyId: number) => {
  return useQuery({
    queryKey: courseKeys.byCompany(companyId),
    queryFn: () => courseApi.getCoursesByCompany(companyId),
    enabled: !!companyId,
  });
};

export const useCourseStatsQuery = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: courseKeys.stats(),
    queryFn: () => courseApi.getCourseStats(startDate, endDate),
  });
};

// ============================================
// Hole Queries
// ============================================

export const useHolesByCourseQuery = (courseId: number) => {
  return useQuery({
    queryKey: courseKeys.holes(courseId),
    queryFn: () => courseApi.getHolesByCourse(courseId),
    enabled: !!courseId,
  });
};

// ============================================
// Club Mutations
// ============================================

export const useCreateClubMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClubDto) => courseApi.createClub(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() });
      showSuccessToast('골프장이 생성되었습니다.');
    },
    meta: { errorMessage: '골프장 생성에 실패했습니다.' },
  });
};

export const useUpdateClubMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClubDto }) =>
      courseApi.updateClub(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clubKeys.detail(id) });
      showSuccessToast('골프장 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '골프장 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteClubMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => courseApi.deleteClub(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      showSuccessToast('골프장이 삭제되었습니다.');
    },
    meta: { errorMessage: '골프장 삭제에 실패했습니다.' },
  });
};

// ============================================
// Course Mutations
// ============================================

export const useCreateCourseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCourseDto) => courseApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: courseKeys.stats() });
      showSuccessToast('코스가 생성되었습니다.');
    },
    meta: { errorMessage: '코스 생성에 실패했습니다.' },
  });
};

export const useUpdateCourseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCourseDto }) =>
      courseApi.updateCourse(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: courseKeys.stats() });
      showSuccessToast('코스 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '코스 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteCourseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => courseApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      showSuccessToast('코스가 삭제되었습니다.');
    },
    meta: { errorMessage: '코스 삭제에 실패했습니다.' },
  });
};

// ============================================
// Hole Mutations
// ============================================

export const useCreateHoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: CreateHoleDto }) =>
      courseApi.createHole(courseId, data),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.holes(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      showSuccessToast('홀이 생성되었습니다.');
    },
    meta: { errorMessage: '홀 생성에 실패했습니다.' },
  });
};

export const useUpdateHoleMutation = () => {
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
      showSuccessToast('홀 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '홀 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteHoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, holeId }: { courseId: number; holeId: number }) =>
      courseApi.deleteHole(courseId, holeId),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.holes(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      showSuccessToast('홀이 삭제되었습니다.');
    },
    meta: { errorMessage: '홀 삭제에 실패했습니다.' },
  });
};
