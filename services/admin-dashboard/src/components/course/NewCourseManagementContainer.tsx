import React, { useState, useEffect } from 'react';
import { EnhancedCourseList } from './EnhancedCourseList';
import { NewCourseDetailView } from './NewCourseDetailView';
import { CourseForm } from './CourseForm';
import { CourseStats } from './CourseStats';
import { CourseBulkActions } from './CourseBulkActions';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { Course, CourseFilters as CourseFiltersType, CourseStatus } from '../../types/course';

// Mock data for development
const mockCourses: Course[] = [
  {
    id: 1,
    name: '그린밸리 챔피언십 코스',
    companyId: 1,
    companyName: '그린밸리 골프클럽',
    description: '아름다운 자연 속에서 최고의 골프 경험을 제공하는 프리미엄 챔피언십 코스입니다.',
    address: '경기도 용인시 처인구 모현읍 능원로 200',
    phoneNumber: '031-123-4567',
    email: 'info@greenvalley.co.kr',
    website: 'https://www.greenvalley.co.kr',
    imageUrl: null,
    holeCount: 18,
    par: 72,
    yardage: 7200,
    courseRating: 74.5,
    slopeRating: 135,
    difficultyLevel: 'PROFESSIONAL',
    courseType: 'CHAMPIONSHIP',
    facilities: ['driving_range', 'putting_green', 'pro_shop', 'restaurant', 'locker_room'],
    amenities: ['wifi', 'air_conditioning', 'shower', 'sauna', 'valet_parking'],
    dressCode: '골프 규정에 맞는 정장 착용 필수',
    weekdayPrice: 180000,
    weekendPrice: 250000,
    memberPrice: 120000,
    cartFee: 45000,
    caddyFee: 80000,
    status: 'ACTIVE',
    isActive: true,
    openTime: '06:00',
    closeTime: '19:00',
    restDays: ['monday'],
    totalBookings: 1245,
    monthlyBookings: 98,
    totalRevenue: 245000000,
    monthlyRevenue: 18500000,
    averageRating: 4.8,
    reviewCount: 156,
    createdAt: new Date('2010-03-15'),
    updatedAt: new Date('2024-07-07'),
    establishedDate: new Date('2010-03-15')
  },
  {
    id: 2,
    name: '선셋힐 이그제큐티브 코스',
    companyId: 2,
    companyName: '선셋힐 컨트리클럽',
    description: '춘천의 아름다운 석양을 감상하며 골프를 즐길 수 있는 특별한 코스입니다.',
    address: '강원도 춘천시 동내면 순환대로 1500',
    phoneNumber: '033-234-5678',
    email: 'contact@sunsethill.com',
    website: 'https://www.sunsethill.com',
    imageUrl: null,
    holeCount: 18,
    par: 70,
    yardage: 6200,
    courseRating: 69.8,
    slopeRating: 125,
    difficultyLevel: 'INTERMEDIATE',
    courseType: 'EXECUTIVE',
    facilities: ['putting_green', 'pro_shop', 'restaurant', 'parking'],
    amenities: ['wifi', 'air_conditioning', 'shower'],
    dressCode: '골프웨어 착용 권장',
    weekdayPrice: 120000,
    weekendPrice: 170000,
    memberPrice: 80000,
    cartFee: 35000,
    caddyFee: 60000,
    status: 'ACTIVE',
    isActive: true,
    openTime: '06:30',
    closeTime: '18:30',
    restDays: [],
    totalBookings: 856,
    monthlyBookings: 72,
    totalRevenue: 148000000,
    monthlyRevenue: 12800000,
    averageRating: 4.6,
    reviewCount: 89,
    createdAt: new Date('2015-08-20'),
    updatedAt: new Date('2024-07-06'),
    establishedDate: new Date('2015-08-20')
  },
  {
    id: 3,
    name: '오션뷰 리조트 코스',
    companyId: 3,
    companyName: '오션뷰 리조트',
    description: '바다가 보이는 환상적인 뷰와 함께하는 럭셔리 골프 리조트 코스입니다.',
    address: '부산광역시 기장군 일광면 해안대로 777',
    phoneNumber: '051-345-6789',
    email: 'info@oceanview.co.kr',
    website: 'https://www.oceanview.co.kr',
    imageUrl: null,
    holeCount: 18,
    par: 72,
    yardage: 6950,
    courseRating: 73.2,
    slopeRating: 132,
    difficultyLevel: 'ADVANCED',
    courseType: 'RESORT',
    facilities: ['driving_range', 'putting_green', 'pro_shop', 'restaurant', 'bar', 'spa', 'swimming_pool'],
    amenities: ['wifi', 'air_conditioning', 'shower', 'sauna', 'conference_room', 'hotel'],
    dressCode: '리조트 드레스코드 준수',
    weekdayPrice: 220000,
    weekendPrice: 320000,
    memberPrice: 150000,
    cartFee: 50000,
    caddyFee: 90000,
    status: 'ACTIVE',
    isActive: true,
    openTime: '06:00',
    closeTime: '20:00',
    restDays: [],
    totalBookings: 1456,
    monthlyBookings: 115,
    totalRevenue: 358000000,
    monthlyRevenue: 28500000,
    averageRating: 4.9,
    reviewCount: 234,
    createdAt: new Date('2018-05-10'),
    updatedAt: new Date('2024-07-07'),
    establishedDate: new Date('2018-05-10')
  },
  {
    id: 4,
    name: '마운틴 피크 연습장',
    companyId: 4,
    companyName: '마운틴 피크 골프',
    description: '산악지형을 활용한 도전적인 연습용 코스입니다.',
    address: '경상북도 경주시 산내면 대현리 산 15-1',
    phoneNumber: '054-456-7890',
    email: 'info@mountainpeak.co.kr',
    website: 'https://www.mountainpeak.co.kr',
    imageUrl: null,
    holeCount: 9,
    par: 36,
    yardage: 3200,
    courseRating: 35.5,
    slopeRating: 115,
    difficultyLevel: 'BEGINNER',
    courseType: 'PRACTICE',
    facilities: ['driving_range', 'putting_green', 'pro_shop'],
    amenities: ['wifi', 'parking'],
    dressCode: '편안한 골프웨어',
    weekdayPrice: 60000,
    weekendPrice: 85000,
    memberPrice: 40000,
    cartFee: 25000,
    caddyFee: 45000,
    status: 'MAINTENANCE',
    isActive: false,
    openTime: '07:00',
    closeTime: '17:00',
    restDays: ['monday', 'tuesday'],
    totalBookings: 342,
    monthlyBookings: 28,
    totalRevenue: 28500000,
    monthlyRevenue: 2100000,
    averageRating: 4.3,
    reviewCount: 45,
    createdAt: new Date('2012-11-03'),
    updatedAt: new Date('2024-07-05'),
    establishedDate: new Date('2012-11-03')
  },
  {
    id: 5,
    name: '레이크사이드 퍼블릭 코스',
    companyId: 5,
    companyName: '레이크사이드 클럽',
    description: '호수를 끼고 있는 평화로운 분위기의 퍼블릭 코스입니다.',
    address: '충청남도 천안시 동남구 목천읍 삼성리 200',
    phoneNumber: '041-567-8901',
    email: 'contact@lakeside.co.kr',
    website: 'https://www.lakeside.co.kr',
    imageUrl: null,
    holeCount: 18,
    par: 71,
    yardage: 6500,
    courseRating: 70.5,
    slopeRating: 120,
    difficultyLevel: 'INTERMEDIATE',
    courseType: 'CHAMPIONSHIP',
    facilities: ['putting_green', 'pro_shop', 'restaurant'],
    amenities: ['wifi', 'parking', 'shower'],
    dressCode: '캐주얼 골프웨어',
    weekdayPrice: 95000,
    weekendPrice: 135000,
    memberPrice: 65000,
    cartFee: 30000,
    caddyFee: 55000,
    status: 'ACTIVE',
    isActive: true,
    openTime: '06:30',
    closeTime: '18:00',
    restDays: ['wednesday'],
    totalBookings: 678,
    monthlyBookings: 56,
    totalRevenue: 89500000,
    monthlyRevenue: 7800000,
    averageRating: 4.5,
    reviewCount: 67,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2024-07-06'),
    establishedDate: new Date('2020-01-15')
  }
];

// Mock companies for filter
const mockCompanies = [
  { id: 1, name: '그린밸리 골프클럽' },
  { id: 2, name: '선셋힐 컨트리클럽' },
  { id: 3, name: '오션뷰 리조트' },
  { id: 4, name: '마운틴 피크 골프' },
  { id: 5, name: '레이크사이드 클럽' }
];

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

export const NewCourseManagementContainer: React.FC = () => {
  const { currentAdmin, hasPermission, canAccessCompany } = useAdminAuth();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // 권한에 따른 초기 코스 필터링
  const getFilteredMockCourses = () => {
    if (!currentAdmin) return [];
    
    // 플랫폼 관리자는 모든 코스 조회 가능
    if (currentAdmin.scope === 'PLATFORM') {
      return mockCourses;
    }
    
    // 회사 관리자는 자신의 회사 코스만 조회 가능
    if (currentAdmin.scope === 'COMPANY' && currentAdmin.companyId) {
      return mockCourses.filter(course => course.companyId === currentAdmin.companyId);
    }
    
    // 코스 관리자는 담당 코스만 조회 가능
    if (currentAdmin.scope === 'COURSE' && currentAdmin.courseIds) {
      return mockCourses.filter(course => currentAdmin.courseIds?.includes(course.id));
    }
    
    return [];
  };
  
  const initialCourses = getFilteredMockCourses();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(initialCourses);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState<CourseFiltersType>({
    search: '',
    companyId: undefined,
    status: undefined,
    difficultyLevel: undefined,
    courseType: undefined,
    sortBy: 'name',
    sortOrder: 'asc',
    showOnlyActive: false,
    priceRange: undefined
  });

  // Apply filters
  useEffect(() => {
    let filtered = [...courses];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(course => 
        course.name.toLowerCase().includes(searchLower) ||
        course.description?.toLowerCase().includes(searchLower) ||
        course.address?.toLowerCase().includes(searchLower) ||
        course.companyName?.toLowerCase().includes(searchLower)
      );
    }

    // Company filter
    if (filters.companyId) {
      filtered = filtered.filter(course => course.companyId === filters.companyId);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(course => course.status === filters.status);
    }

    // Difficulty level filter
    if (filters.difficultyLevel) {
      filtered = filtered.filter(course => course.difficultyLevel === filters.difficultyLevel);
    }

    // Course type filter
    if (filters.courseType) {
      filtered = filtered.filter(course => course.courseType === filters.courseType);
    }

    // Active only filter
    if (filters.showOnlyActive) {
      filtered = filtered.filter(course => course.isActive);
    }

    // Price range filter
    if (filters.priceRange) {
      if (filters.priceRange.min !== undefined) {
        filtered = filtered.filter(course => course.weekdayPrice >= filters.priceRange!.min!);
      }
      if (filters.priceRange.max !== undefined) {
        filtered = filtered.filter(course => course.weekdayPrice <= filters.priceRange!.max!);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy as keyof Course] as string | number;
      const bValue = b[filters.sortBy as keyof Course] as string | number;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filters.sortOrder === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });

    setFilteredCourses(filtered);
  }, [courses, filters]);

  // Event handlers
  const handleCreateCourse = () => {
    setEditingCourse(null);
    setViewMode('create');
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setViewMode('edit');
  };

  const handleViewCourse = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('detail');
  };

  const handleDeleteCourse = async (course: Course) => {
    const confirmed = window.confirm(
      `${course.name}을(를) 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 예약 정보도 함께 삭제됩니다.`
    );

    if (confirmed) {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setCourses(prev => prev.filter(c => c.id !== course.id));
        alert('코스가 성공적으로 삭제되었습니다.');
      } catch (error) {
        alert('코스 삭제 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdateCourseStatus = async (course: Course, status: CourseStatus) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCourses(prev => prev.map(c => 
        c.id === course.id 
          ? { ...c, status, isActive: status === 'ACTIVE', updatedAt: new Date() }
          : c
      ));
      
      alert(`코스 상태가 ${status === 'ACTIVE' ? '활성' : status === 'MAINTENANCE' ? '점검' : '비활성'}으로 변경되었습니다.`);
    } catch (error) {
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSuccess = (courseData: Partial<Course>) => {
    if (viewMode === 'create') {
      const newCourse: Course = {
        id: Math.max(...courses.map(c => c.id)) + 1,
        name: courseData.name!,
        companyId: courseData.companyId!,
        companyName: mockCompanies.find(c => c.id === courseData.companyId)?.name || '',
        description: courseData.description || '',
        address: courseData.address || '',
        phoneNumber: courseData.phoneNumber || '',
        email: courseData.email || '',
        website: courseData.website || '',
        imageUrl: courseData.imageUrl || null,
        holeCount: courseData.holeCount || 18,
        par: courseData.par || 72,
        yardage: courseData.yardage || 6500,
        courseRating: courseData.courseRating || 72.0,
        slopeRating: courseData.slopeRating || 125,
        difficultyLevel: courseData.difficultyLevel || 'INTERMEDIATE',
        courseType: courseData.courseType || 'CHAMPIONSHIP',
        facilities: courseData.facilities || [],
        amenities: courseData.amenities || [],
        dressCode: courseData.dressCode || '',
        weekdayPrice: courseData.weekdayPrice || 100000,
        weekendPrice: courseData.weekendPrice || 150000,
        memberPrice: courseData.memberPrice || 80000,
        cartFee: courseData.cartFee || 30000,
        caddyFee: courseData.caddyFee || 50000,
        status: courseData.status || 'ACTIVE',
        isActive: courseData.status !== 'INACTIVE',
        openTime: courseData.openTime || '06:00',
        closeTime: courseData.closeTime || '18:00',
        restDays: courseData.restDays || [],
        totalBookings: 0,
        monthlyBookings: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageRating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        establishedDate: courseData.establishedDate || new Date()
      };
      
      setCourses(prev => [...prev, newCourse]);
      alert('새 코스가 성공적으로 등록되었습니다.');
    } else if (viewMode === 'edit' && editingCourse) {
      setCourses(prev => prev.map(c => 
        c.id === editingCourse.id 
          ? { ...c, ...courseData, updatedAt: new Date() }
          : c
      ));
      alert('코스 정보가 성공적으로 수정되었습니다.');
    }
    
    setViewMode('list');
    setEditingCourse(null);
  };

  const handleFormCancel = () => {
    setViewMode('list');
    setEditingCourse(null);
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedCourse(null);
    setEditingCourse(null);
  };

  const handleFiltersChange = (newFilters: CourseFiltersType) => {
    setFilters(newFilters);
  };

  const handleBulkAction = async (action: string, courseIds: number[]) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      switch (action) {
        case 'activate':
          setCourses(prev => prev.map(c => 
            courseIds.includes(c.id) 
              ? { ...c, status: 'ACTIVE' as const, isActive: true, updatedAt: new Date() }
              : c
          ));
          break;
        case 'deactivate':
          setCourses(prev => prev.map(c => 
            courseIds.includes(c.id) 
              ? { ...c, status: 'INACTIVE' as const, isActive: false, updatedAt: new Date() }
              : c
          ));
          break;
        case 'maintenance':
          setCourses(prev => prev.map(c => 
            courseIds.includes(c.id) 
              ? { ...c, status: 'MAINTENANCE' as const, isActive: false, updatedAt: new Date() }
              : c
          ));
          break;
        case 'delete':
          if (window.confirm(`선택된 ${courseIds.length}개 코스를 삭제하시겠습니까?`)) {
            setCourses(prev => prev.filter(c => !courseIds.includes(c.id)));
          }
          break;
        case 'clear':
          setSelectedCourses([]);
          setIsLoading(false);
          return;
      }
      
      setSelectedCourses([]);
      alert('작업이 완료되었습니다.');
    } catch (error) {
      alert('작업 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {viewMode !== 'list' && (
            <button
              onClick={handleBack}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              뒤로가기
            </button>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {viewMode === 'list' && '코스 관리'}
              {viewMode === 'detail' && '코스 상세 정보'}
              {viewMode === 'create' && '새 코스 등록'}
              {viewMode === 'edit' && '코스 정보 수정'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {viewMode === 'list' && '골프장의 코스들을 관리합니다.'}
              {viewMode === 'detail' && '코스의 상세 정보와 운영 현황을 확인합니다.'}
              {viewMode === 'create' && '새로운 골프 코스를 등록합니다.'}
              {viewMode === 'edit' && '코스의 기본 정보를 수정합니다.'}
            </p>
          </div>
        </div>

      </div>

      {/* Content based on view mode */}
      {viewMode === 'list' && (
        <>
          {/* Statistics */}
          <CourseStats courses={courses} />

          {/* Bulk Actions */}
          {selectedCourses.length > 0 && (
            <CourseBulkActions
              selectedCount={selectedCourses.length}
              onBulkAction={handleBulkAction}
              selectedCourses={selectedCourses}
              isLoading={isLoading}
            />
          )}

          {/* Course List */}
          <EnhancedCourseList
            courses={filteredCourses}
            selectedCourses={filteredCourses.filter(c => selectedCourses.includes(c.id))}
            isLoading={isLoading}
            onSelectionChange={(courses) => setSelectedCourses(courses.map(c => c.id))}
            onSelectCourse={handleViewCourse}
            onCreateCourse={() => setViewMode('create')}
            onEditCourse={handleEditCourse}
            onDeleteCourse={handleDeleteCourse}
            onUpdateStatus={handleUpdateCourseStatus}
            onRefresh={() => window.location.reload()}
          />
        </>
      )}

      {viewMode === 'detail' && selectedCourse && (
        <NewCourseDetailView
          course={selectedCourse}
          onEdit={() => handleEditCourse(selectedCourse)}
          onDelete={() => handleDeleteCourse(selectedCourse)}
          onUpdateStatus={(status) => handleUpdateCourseStatus(selectedCourse, status)}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <CourseForm
          course={editingCourse}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          isLoading={isLoading}
          companies={mockCompanies}
        />
      )}
    </div>
  );
};