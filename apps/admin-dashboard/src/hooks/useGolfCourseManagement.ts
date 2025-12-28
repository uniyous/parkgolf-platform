import { useState, useCallback } from 'react';
import { useCourses, useCourse, useCreateCourse, useUpdateCourse, useDeleteCourse } from './queries';
import type { Course, CreateCourseDto, UpdateCourseDto } from '@/types';

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

export const useGolfCourseManagement = () => {
  const [selectedCourseState, setSelectedCourseState] = useState<Course | null>(null);
  const [viewModeState, setViewModeState] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Queries
  const coursesQuery = useCourses({}, page, limit);
  const selectedCourseQuery = useCourse(selectedCourseState?.id ?? 0);

  // Mutations
  const createCourseMutation = useCreateCourse();
  const updateCourseMutation = useUpdateCourse();
  const deleteCourseMutation = useDeleteCourse();

  // Derived data
  const courses = coursesQuery.data?.data ?? [];
  const selectedCourse = selectedCourseQuery.data ?? selectedCourseState;

  // Loading & Error
  const loading = {
    list: coursesQuery.isLoading,
    detail: selectedCourseQuery.isLoading,
    create: createCourseMutation.isPending,
    update: updateCourseMutation.isPending,
    delete: deleteCourseMutation.isPending,
  };

  const errors = {
    list: coursesQuery.error?.message ?? null,
    detail: selectedCourseQuery.error?.message ?? null,
    create: createCourseMutation.error?.message ?? null,
    update: updateCourseMutation.error?.message ?? null,
    delete: deleteCourseMutation.error?.message ?? null,
  };

  // Actions
  const loadCourses = useCallback(() => {
    coursesQuery.refetch();
  }, [coursesQuery]);

  const selectCourse = useCallback((course: Course | null) => {
    setSelectedCourseState(course);
    if (course) {
      setViewModeState('detail');
    } else {
      setViewModeState('list');
    }
  }, []);

  const clearSelectedCourse = useCallback(() => {
    setSelectedCourseState(null);
    setViewModeState('list');
  }, []);

  const createCourse = useCallback(async (data: CreateCourseDto) => {
    const result = await createCourseMutation.mutateAsync(data);
    setViewModeState('list');
    return result;
  }, [createCourseMutation]);

  const updateCourse = useCallback(async (id: number, data: UpdateCourseDto) => {
    const result = await updateCourseMutation.mutateAsync({ id, data });
    return result;
  }, [updateCourseMutation]);

  const deleteCourse = useCallback(async (id: number) => {
    await deleteCourseMutation.mutateAsync(id);
    setSelectedCourseState(null);
    setViewModeState('list');
  }, [deleteCourseMutation]);

  // View mode actions
  const backToList = useCallback(() => {
    setViewModeState('list');
    setSelectedCourseState(null);
  }, []);

  const createCourseMode = useCallback(() => {
    setSelectedCourseState(null);
    setViewModeState('create');
  }, []);

  const editCourse = useCallback((course: Course) => {
    setSelectedCourseState(course);
    setViewModeState('edit');
  }, []);

  const viewCourseDetail = useCallback((course: Course) => {
    setSelectedCourseState(course);
    setViewModeState('detail');
  }, []);

  return {
    courses,
    selectedCourse,
    viewMode: viewModeState,
    loading,
    errors,
    page,
    limit,
    setPage,
    setLimit,
    actions: {
      loadCourses,
      selectCourse,
      clearSelectedCourse,
      createCourse,
      updateCourse,
      deleteCourse,
      backToList,
      createCourseMode,
      editCourse,
      viewCourseDetail,
    },
  };
};
