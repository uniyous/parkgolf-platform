import { useState, useMemo } from 'react';
import { 
  useSearchCoursesQuery,
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  CourseSearchFilters 
} from '../redux/api/courseApi';

export const useCourses = () => {
  const [searchFilters, setSearchFilters] = useState<CourseSearchFilters>({});
  const [hasSearched, setHasSearched] = useState(false);
  
  // Search courses with filters
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
    refetch: refetchSearch,
  } = useSearchCoursesQuery(searchFilters, {
    skip: !hasSearched || Object.keys(searchFilters).length === 0,
  });

  // Get all courses
  const {
    data: allCourses,
    isLoading: isLoadingAll,
    error: loadError,
  } = useGetCoursesQuery();

  const updateSearchFilters = (filters: Partial<CourseSearchFilters>) => {
    setSearchFilters(prev => ({ ...prev, ...filters }));
  };

  const clearSearchFilters = () => {
    setSearchFilters({});
    setHasSearched(false);
  };

  const searchCourses = async (filters: CourseSearchFilters) => {
    setSearchFilters(filters);
    setHasSearched(true);
    // 상태가 업데이트되면 자동으로 쿼리가 실행됩니다
  };

  return {
    // Data
    courses: hasSearched ? (searchResults || []) : (allCourses || []),
    allCourses: allCourses || [],
    searchFilters,
    hasSearched,
    
    // States
    isLoading: isSearching || isLoadingAll,
    isSearching,
    error: searchError || loadError,
    
    // Actions
    searchCourses,
    updateSearchFilters,
    clearSearchFilters,
  };
};

export const useCourse = (courseId: number) => {
  const {
    data: course,
    isLoading,
    error,
    refetch,
  } = useGetCourseByIdQuery(courseId, {
    skip: !courseId,
  });

  return {
    course,
    isLoading,
    error,
    refetch,
  };
};