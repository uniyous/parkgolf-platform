import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { courseApi } from '../../api/courseApi';
import type { Company, Course } from '../../types';

interface CourseState {
  companies: Company[];
  courses: Course[];
  selectedCompanyId: number | null;
  selectedCourseId: number | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CourseState = {
  companies: [],
  courses: [],
  selectedCompanyId: null,
  selectedCourseId: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchCompanies = createAsyncThunk(
  'course/fetchCompanies',
  async (_, { rejectWithValue }) => {
    try {
      const companies = await courseApi.getCompanies();
      console.log('Redux: fetchCompanies API response:', companies);
      // API 응답이 배열인지 객체인지 확인하고 적절히 처리
      return Array.isArray(companies) ? companies : (companies as any)?.data || [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch companies');
    }
  }
);

export const fetchCoursesByCompany = createAsyncThunk(
  'course/fetchCoursesByCompany',
  async (companyId: number, { rejectWithValue }) => {
    try {
      console.log('Redux: Fetching courses for company:', companyId);
      console.log('Redux: courseApi object:', courseApi);
      console.log('Redux: courseApi.getCoursesByCompany function:', courseApi.getCoursesByCompany);
      
      const courses = await courseApi.getCoursesByCompany(companyId);
      console.log('Redux: Received courses:', courses);
      console.log('Redux: Courses array length:', courses?.length);
      console.log('Redux: Courses array type:', Array.isArray(courses));
      
      // API 응답이 배열인지 객체인지 확인하고 적절히 처리
      return Array.isArray(courses) ? courses : (courses as any)?.data || [];
    } catch (error: any) {
      console.error('Redux: Error fetching courses:', error);
      console.error('Redux: Error stack:', error.stack);
      return rejectWithValue(error.message || 'Failed to fetch courses');
    }
  }
);

const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    setCompanies: (state, action: PayloadAction<Company[]>) => {
      state.companies = action.payload;
    },
    selectCompany: (state, action: PayloadAction<number | null>) => {
      state.selectedCompanyId = action.payload;
      if (!action.payload) {
        state.courses = [];
        state.selectedCourseId = null;
      }
    },
    selectCourse: (state, action: PayloadAction<number | null>) => {
      state.selectedCourseId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch companies
    builder
      .addCase(fetchCompanies.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.companies = action.payload || [];
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch companies';
      })
    // Fetch courses
      .addCase(fetchCoursesByCompany.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCoursesByCompany.fulfilled, (state, action) => {
        console.log('Redux: fetchCoursesByCompany.fulfilled triggered');
        console.log('Redux: action.payload:', action.payload);
        console.log('Redux: action.payload type:', typeof action.payload);
        console.log('Redux: action.payload length:', action.payload?.length);
        
        state.isLoading = false;
        state.courses = action.payload || [];
        
        console.log('Redux: State updated, new courses:', state.courses);
        console.log('Redux: State courses length:', state.courses.length);
      })
      .addCase(fetchCoursesByCompany.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch courses';
      });
  },
});

export const { setCompanies, selectCompany, selectCourse, clearError } = courseSlice.actions;
export default courseSlice.reducer;