import { useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import type { Company, Course } from '../../types';

interface UseCourseSelectionReturn {
  // Companies
  companies: Company[];
  companiesLoading: boolean;
  companiesError: string | null;
  
  // Courses
  courses: Course[];
  coursesLoading: boolean;
  coursesError: string | null;
  
  // Selected values
  selectedCompanyId: number | null;
  selectedGolfClubId: number | null;
  selectedFrontCourseId: number | null;
  selectedBackCourseId: number | null;
  
  // Actions
  selectCompany: (companyId: number | null) => void;
  selectGolfClub: (golfClubId: number | null) => void;
  selectFrontCourse: (courseId: number | null) => void;
  selectBackCourse: (courseId: number | null) => void;
  resetSelection: () => void;
}

export const useCourseSelection = (): UseCourseSelectionReturn => {
  // Company states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  
  // Course states
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  
  // Selection states
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedGolfClubId, setSelectedGolfClubId] = useState<number | null>(null);
  const [selectedFrontCourseId, setSelectedFrontCourseId] = useState<number | null>(null);
  const [selectedBackCourseId, setSelectedBackCourseId] = useState<number | null>(null);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      setCompaniesLoading(true);
      setCompaniesError(null);
      try {
        const response = await courseApi.getCompanies();
        console.log('Companies API response:', response);
        // Handle different response formats
        if (response && response.data && Array.isArray(response.data)) {
          setCompanies(response.data);
        } else if (Array.isArray(response)) {
          setCompanies(response);
        } else {
          setCompanies([]);
        }
      } catch (error: any) {
        console.error('Failed to fetch companies:', error);
        setCompaniesError(error.message || '회사 목록을 불러오는데 실패했습니다.');
        // Mock data for development
        setCompanies([
          { id: 1, name: '파크골프 그룹 A', description: '서울/경기 지역', isActive: true },
          { id: 2, name: '파크골프 그룹 B', description: '부산/경남 지역', isActive: true },
        ]);
      } finally {
        setCompaniesLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  // Fetch courses when company is selected
  useEffect(() => {
    if (!selectedCompanyId) {
      setCourses([]);
      return;
    }

    const fetchCourses = async () => {
      setCoursesLoading(true);
      setCoursesError(null);
      try {
        const response = await courseApi.getCourses({ companyId: selectedCompanyId });
        console.log('Courses API response:', response);
        // Handle different response formats
        if (response && response.data && Array.isArray(response.data)) {
          setCourses(response.data);
        } else if (response && response.courses && Array.isArray(response.courses)) {
          setCourses(response.courses);
        } else if (Array.isArray(response)) {
          setCourses(response);
        } else {
          setCourses([]);
        }
      } catch (error: any) {
        console.error('Failed to fetch courses:', error);
        setCoursesError(error.message || '코스 목록을 불러오는데 실패했습니다.');
        // Mock data for development
        setCourses([
          { 
            id: 1, 
            name: '서울 파크골프장 - A코스', 
            companyId: selectedCompanyId,
            description: '초급자 코스 (파3 중심)',
            holes: 9,
            totalPar: 27,
            isActive: true 
          },
          { 
            id: 2, 
            name: '서울 파크골프장 - B코스', 
            companyId: selectedCompanyId,
            description: '중급자 코스 (파4 포함)',
            holes: 9,
            totalPar: 30,
            isActive: true 
          },
          { 
            id: 3, 
            name: '서울 파크골프장 - C코스', 
            companyId: selectedCompanyId,
            description: '상급자 코스 (파5 포함)',
            holes: 9,
            totalPar: 33,
            isActive: true 
          },
        ]);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, [selectedCompanyId]);

  // Actions
  const selectCompany = (companyId: number | null) => {
    setSelectedCompanyId(companyId);
    // Reset downstream selections
    setSelectedGolfClubId(null);
    setSelectedFrontCourseId(null);
    setSelectedBackCourseId(null);
  };

  const selectGolfClub = (golfClubId: number | null) => {
    setSelectedGolfClubId(golfClubId);
    // Reset course selections
    setSelectedFrontCourseId(null);
    setSelectedBackCourseId(null);
  };

  const selectFrontCourse = (courseId: number | null) => {
    setSelectedFrontCourseId(courseId);
  };

  const selectBackCourse = (courseId: number | null) => {
    setSelectedBackCourseId(courseId);
  };

  const resetSelection = () => {
    setSelectedCompanyId(null);
    setSelectedGolfClubId(null);
    setSelectedFrontCourseId(null);
    setSelectedBackCourseId(null);
  };

  return {
    companies,
    companiesLoading,
    companiesError,
    courses,
    coursesLoading,
    coursesError,
    selectedCompanyId,
    selectedGolfClubId,
    selectedFrontCourseId,
    selectedBackCourseId,
    selectCompany,
    selectGolfClub,
    selectFrontCourse,
    selectBackCourse,
    resetSelection,
  };
};