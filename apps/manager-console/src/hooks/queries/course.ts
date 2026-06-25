import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi, type CourseFilters, type ClubFilters, type CreateClubDto, type UpdateClubDto } from '@/lib/api/courses';
import { courseKeys, clubKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import { useActiveCompanyId } from '@/hooks/useActiveCompany';
import type { CreateCourseDto, UpdateCourseDto, CreateHoleDto, UpdateHoleDto } from '@/types';

// ============================================
// Club Queries
// ============================================

export const useClubsQuery = (filters?: ClubFilters) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: clubKeys.list(companyId, filters),
    queryFn: () => courseApi.getClubs(filters),
    meta: { globalLoading: false },
  });
};

export const useClubQuery = (id: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: clubKeys.detail(companyId, id),
    queryFn: () => courseApi.getClubById(id),
    enabled: !!id,
    meta: { globalLoading: false },
  });
};

export const useClubsByCompanyQuery = (targetCompanyId: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: clubKeys.byCompany(companyId, targetCompanyId),
    queryFn: () => courseApi.getClubsByCompany(targetCompanyId),
    enabled: !!targetCompanyId,
    meta: { globalLoading: false },
  });
};

export const useSearchClubsQuery = (query: string) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: clubKeys.search(companyId, query),
    queryFn: () => courseApi.searchClubs(query),
    enabled: query.length >= 2,
    meta: { globalLoading: false },
  });
};

// ============================================
// Course Queries
// ============================================

export const useCoursesQuery = (filters?: CourseFilters, page = 1, limit = 20) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: courseKeys.list(companyId, { ...filters, page, limit }),
    queryFn: () => courseApi.getCourses(filters, page, limit),
    meta: { globalLoading: false },
  });
};

export const useCourseQuery = (id: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: courseKeys.detail(companyId, id),
    queryFn: () => courseApi.getCourseById(id),
    enabled: !!id,
    meta: { globalLoading: false },
  });
};

export const useCoursesByClubQuery = (clubId: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: courseKeys.byClub(companyId, clubId),
    queryFn: () => courseApi.getCoursesByClub(clubId),
    enabled: !!clubId,
    meta: { globalLoading: false },
  });
};

export const useCoursesByCompanyQuery = (targetCompanyId: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: courseKeys.byCompany(companyId, targetCompanyId),
    queryFn: () => courseApi.getCoursesByCompany(targetCompanyId),
    enabled: !!targetCompanyId,
    meta: { globalLoading: false },
  });
};

export const useCourseStatsQuery = (startDate?: string, endDate?: string) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: courseKeys.stats(companyId),
    queryFn: () => courseApi.getCourseStats(startDate, endDate),
    meta: { globalLoading: false },
  });
};

// ============================================
// Hole Queries
// ============================================

export const useHolesByCourseQuery = (courseId: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: courseKeys.holes(companyId, courseId),
    queryFn: () => courseApi.getHolesByCourse(courseId),
    enabled: !!courseId,
    meta: { globalLoading: false },
  });
};

// ============================================
// Club Mutations
// ============================================

export const useCreateClubMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (data: CreateClubDto) => courseApi.createClub(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.lists(companyId) });
      showSuccessToast('골프장이 생성되었습니다.');
    },
    meta: { errorMessage: '골프장 생성에 실패했습니다.' },
  });
};

export const useUpdateClubMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClubDto }) =>
      courseApi.updateClub(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: clubKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: clubKeys.detail(companyId, id) });
      showSuccessToast('골프장 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '골프장 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteClubMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (id: number) => courseApi.deleteClub(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all(companyId) });
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
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (data: CreateCourseDto) => courseApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.stats(companyId) });
      showSuccessToast('코스가 생성되었습니다.');
    },
    meta: { errorMessage: '코스 생성에 실패했습니다.' },
  });
};

export const useUpdateCourseMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCourseDto }) =>
      courseApi.updateCourse(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(companyId, id) });
      queryClient.invalidateQueries({ queryKey: courseKeys.stats(companyId) });
      showSuccessToast('코스 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '코스 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteCourseMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (id: number) => courseApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all(companyId) });
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
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: CreateHoleDto }) =>
      courseApi.createHole(courseId, data),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.holes(companyId, courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(companyId, courseId) });
      showSuccessToast('홀이 생성되었습니다.');
    },
    meta: { errorMessage: '홀 생성에 실패했습니다.' },
  });
};

export const useUpdateHoleMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

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
      queryClient.invalidateQueries({ queryKey: courseKeys.holes(companyId, courseId) });
      showSuccessToast('홀 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '홀 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteHoleMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ courseId, holeId }: { courseId: number; holeId: number }) =>
      courseApi.deleteHole(courseId, holeId),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.holes(companyId, courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(companyId, courseId) });
      showSuccessToast('홀이 삭제되었습니다.');
    },
    meta: { errorMessage: '홀 삭제에 실패했습니다.' },
  });
};
