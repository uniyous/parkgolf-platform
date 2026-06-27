import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useClubQuery,
  useCoursesByClubQuery,
  useUpdateClubMutation,
  useDeleteClubMutation,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
} from './queries';
import type { UpdateClubDto } from '@/types/club';
import type { CreateCourseDto, UpdateCourseDto } from '@/types';

/**
 * ClubDetailPage 전용 훅
 *
 * 골프장 상세 페이지에서 필요한 모든 데이터 조회와 액션을 제공합니다.
 * - 골프장 상세 정보 (useClubQuery)
 * - 코스 목록 (useCoursesByClubQuery)
 * - 골프장/코스 CRUD mutations
 */
export const useClubDetail = (clubId: number | null) => {
  const navigate = useNavigate();

  // ============================================
  // Queries
  // ============================================

  // 골프장 상세 정보
  const clubQuery = useClubQuery(clubId ?? 0);

  // 코스 목록 (별도 쿼리로 분리하여 캐싱 효율화)
  const coursesQuery = useCoursesByClubQuery(clubId ?? 0);

  // ============================================
  // Mutations
  // ============================================

  const updateClubMutation = useUpdateClubMutation();
  const deleteClubMutation = useDeleteClubMutation();

  // 코스 관련 mutations
  const createCourseMutation = useCreateCourseMutation();
  const updateCourseMutation = useUpdateCourseMutation();
  const deleteCourseMutation = useDeleteCourseMutation();

  // ============================================
  // Derived Data
  // ============================================

  const club = clubQuery.data ?? null;

  const courses = useMemo(() => {
    const data = coursesQuery.data ?? [];
    // clubId로 필터링 (백엔드가 필터링 안 할 경우 대비)
    return data.filter((c) => c.clubId === clubId);
  }, [coursesQuery.data, clubId]);

  // 통계 데이터 계산
  const stats = useMemo(() => {
    const totalHoles = courses.reduce(
      (sum, course) => sum + (course.holeCount || course.holes?.length || 0),
      0
    );
    const totalCourses = courses.length;

    return {
      totalHoles,
      totalCourses,
    };
  }, [courses]);

  // ============================================
  // Loading & Error States
  // ============================================

  const isLoading = clubQuery.isLoading;
  const isCoursesLoading = coursesQuery.isLoading;
  const error = clubQuery.error?.message ?? null;
  const coursesError = coursesQuery.error?.message ?? null;

  const isMutating =
    updateClubMutation.isPending ||
    deleteClubMutation.isPending ||
    createCourseMutation.isPending ||
    updateCourseMutation.isPending ||
    deleteCourseMutation.isPending;

  // ============================================
  // Club Actions
  // ============================================

  // 골프장 수정
  const updateClub = useCallback(
    async (data: UpdateClubDto) => {
      if (!clubId) return;
      return updateClubMutation.mutateAsync({ id: clubId, data });
    },
    [clubId, updateClubMutation]
  );

  // 골프장 삭제
  const deleteClub = useCallback(async () => {
    if (!clubId) return;
    await deleteClubMutation.mutateAsync(clubId);
    navigate('/clubs');
  }, [clubId, deleteClubMutation, navigate]);

  // 골프장 데이터 새로고침
  const refetchClub = useCallback(() => {
    return clubQuery.refetch();
  }, [clubQuery]);

  // ============================================
  // Course Actions
  // ============================================

  // 코스 목록 새로고침
  const refetchCourses = useCallback(() => {
    return coursesQuery.refetch();
  }, [coursesQuery]);

  // 코스 생성
  const createCourse = useCallback(
    async (data: CreateCourseDto) => {
      const result = await createCourseMutation.mutateAsync(data);
      // mutation의 onSuccess에서 자동으로 캐시 무효화됨
      return result;
    },
    [createCourseMutation]
  );

  // 코스 수정
  const updateCourse = useCallback(
    async (id: number, data: UpdateCourseDto) => {
      return updateCourseMutation.mutateAsync({ id, data });
    },
    [updateCourseMutation]
  );

  // 코스 삭제
  const deleteCourse = useCallback(
    async (id: number) => {
      return deleteCourseMutation.mutateAsync(id);
    },
    [deleteCourseMutation]
  );

  return {
    // Data
    club,
    courses,
    stats,

    // Loading States
    isLoading,
    isCoursesLoading,
    isMutating,

    // Error States
    error,
    coursesError,

    // Club Actions
    updateClub,
    deleteClub,
    refetchClub,

    // Course Actions
    refetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,

    // Mutation States (for detailed UI feedback)
    isUpdatingClub: updateClubMutation.isPending,
    isDeletingClub: deleteClubMutation.isPending,
    isCreatingCourse: createCourseMutation.isPending,
    isUpdatingCourse: updateCourseMutation.isPending,
    isDeletingCourse: deleteCourseMutation.isPending,
  };
};
