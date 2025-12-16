import { useAppDispatch, useAppSelector } from './reduxHooks';
import { 
  fetchHolesByCourse, 
  selectCourse, 
  selectHole, 
  clearError 
} from '../slices/holeSlice';
import { holeApi } from '../../api/holeApi';
import type { Hole, CreateHoleDto, UpdateHoleDto } from '../../types';

export interface UseGolfHoleManagementReturn {
  // 상태
  holes: Hole[];
  selectedCourseId: number | null;
  selectedHole: Hole | null;
  
  // 로딩 상태
  isLoading: boolean;
  
  // 에러 상태
  error: string | null;
  
  // 액션
  selectCourseAndFetchHoles: (courseId: number) => Promise<void>;
  selectHole: (holeId: number | null) => void;
  createHole: (holeData: CreateHoleDto) => Promise<{ success: boolean; hole?: Hole }>;
  updateHole: (holeId: number, holeData: UpdateHoleDto) => Promise<{ success: boolean; hole?: Hole }>;
  deleteHole: (holeId: number) => Promise<{ success: boolean }>;
  clearError: () => void;
}

export const useGolfHoleManagement = (): UseGolfHoleManagementReturn => {
  const dispatch = useAppDispatch();
  const { 
    holes, 
    selectedCourseId, 
    selectedHoleId, 
    isLoading, 
    error 
  } = useAppSelector((state: any) => state.hole);

  const selectedHole = selectedHoleId 
    ? holes.find((hole: any) => hole.id === selectedHoleId) || null 
    : null;

  const selectCourseAndFetchHoles = async (courseId: number) => {
    dispatch(selectCourse(courseId));
    await dispatch(fetchHolesByCourse(courseId));
  };

  const selectHoleAction = (holeId: number | null) => {
    dispatch(selectHole(holeId));
  };

  const createHole = async (holeData: CreateHoleDto): Promise<{ success: boolean; hole?: Hole }> => {
    try {
      const hole = await holeApi.createHole(holeData);
      // Refresh holes after creation
      if (selectedCourseId) {
        await dispatch(fetchHolesByCourse(selectedCourseId));
      }
      return { success: true, hole };
    } catch (error) {
      console.error('Failed to create hole:', error);
      return { success: false };
    }
  };

  const updateHole = async (holeId: number, holeData: UpdateHoleDto): Promise<{ success: boolean; hole?: Hole }> => {
    try {
      const hole = await holeApi.updateHole(holeId, holeData);
      // Refresh holes after update
      if (selectedCourseId) {
        await dispatch(fetchHolesByCourse(selectedCourseId));
      }
      return { success: true, hole };
    } catch (error) {
      console.error('Failed to update hole:', error);
      return { success: false };
    }
  };

  const deleteHole = async (holeId: number): Promise<{ success: boolean }> => {
    try {
      await holeApi.deleteHole(holeId);
      // Refresh holes after deletion
      if (selectedCourseId) {
        await dispatch(fetchHolesByCourse(selectedCourseId));
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to delete hole:', error);
      return { success: false };
    }
  };

  const clearErrorAction = () => {
    dispatch(clearError());
  };

  return {
    // 상태
    holes,
    selectedCourseId,
    selectedHole,
    
    // 로딩 상태
    isLoading,
    
    // 에러 상태
    error,
    
    // 액션
    selectCourseAndFetchHoles,
    selectHole: selectHoleAction,
    createHole,
    updateHole,
    deleteHole,
    clearError: clearErrorAction,
  };
};