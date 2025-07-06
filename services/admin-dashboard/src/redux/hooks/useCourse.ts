import { useAppDispatch, useAppSelector } from './reduxHooks';
import { 
  fetchCompanies,
  fetchCoursesByCompany, 
  setCompanies,
  selectCompany, 
  selectCourse 
} from '../slices/courseSlice';
import { courseApi } from '../../api/courseApi';
import type { Company, Course, UpdateCourseDto } from '../../types';

export interface UseGolfCourseManagementReturn {
  // 상태
  companies: Company[];
  courses: Course[];
  selectedCompanyId: number | null;
  selectedCourse: Course | null;
  
  // 로딩 상태
  companiesLoading: boolean;
  coursesLoading: boolean;
  
  // 에러 상태
  companiesError: string | null;
  coursesError: string | null;
  
  // 액션
  fetchCompanies: () => Promise<void>;
  setGolfCompanies: (companies: Company[]) => void;
  selectCompanyAndFetchCourses: (companyId: number) => Promise<void>;
  selectCourse: (companyId: number, courseId: number | null) => void;
  updateCourseData: (courseId: number, data: UpdateCourseDto) => Promise<{ success: boolean }>
}

export const useGolfCourseManagement = (): UseGolfCourseManagementReturn => {
  const dispatch = useAppDispatch();
  const { 
    companies, 
    courses, 
    selectedCompanyId, 
    selectedCourseId, 
    isLoading, 
    error 
  } = useAppSelector((state: any) => state.course);
  
  // 디버깅용 로그
  console.log('useGolfCourseManagement - Redux state:', {
    companies, 
    courses, 
    selectedCompanyId, 
    selectedCourseId, 
    isLoading, 
    error
  });

  const selectedCourse = selectedCourseId 
    ? courses.find((course: any) => course.id === selectedCourseId) || null 
    : null;

  const fetchCompaniesAction = async () => {
    await dispatch(fetchCompanies());
  };

  const setGolfCompanies = (companies: Company[]) => {
    dispatch(setCompanies(companies));
  };

  const selectCompanyAndFetchCourses = async (companyId: number) => {
    console.log('useCourse - selectCompanyAndFetchCourses called with companyId:', companyId);
    dispatch(selectCompany(companyId));
    console.log('useCourse - dispatching fetchCoursesByCompany for companyId:', companyId);
    await dispatch(fetchCoursesByCompany(companyId));
    console.log('useCourse - fetchCoursesByCompany completed for companyId:', companyId);
  };

  const selectCourseAction = (_companyId: number, courseId: number | null) => {
    dispatch(selectCourse(courseId));
  };

  const updateCourseData = async (courseId: number, data: UpdateCourseDto): Promise<{ success: boolean }> => {
    try {
      await courseApi.updateCourse(courseId, data);
      // Refresh courses after update
      if (selectedCompanyId) {
        await dispatch(fetchCoursesByCompany(selectedCompanyId));
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to update course:', error);
      return { success: false };
    }
  };

  return {
    // 상태
    companies,
    courses,
    selectedCompanyId,
    selectedCourse,
    
    // 로딩 상태
    companiesLoading: isLoading,
    coursesLoading: isLoading,
    
    // 에러 상태
    companiesError: error,
    coursesError: error,
    
    // 액션
    fetchCompanies: fetchCompaniesAction,
    setGolfCompanies,
    selectCompanyAndFetchCourses,
    selectCourse: selectCourseAction,
    updateCourseData,
  };
};