import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { holeApi } from '../../api/holeApi';
import type { Hole } from '../../types';

interface HoleState {
  holes: Hole[];
  selectedCourseId: number | null;
  selectedHoleId: number | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: HoleState = {
  holes: [],
  selectedCourseId: null,
  selectedHoleId: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchHolesByCourse = createAsyncThunk(
  'hole/fetchHolesByCourse',
  async (courseId: number) => {
    const holes = await holeApi.getHolesByCourse(courseId);
    return { holes, courseId };
  }
);

const holeSlice = createSlice({
  name: 'hole',
  initialState,
  reducers: {
    selectCourse: (state, action: PayloadAction<number | null>) => {
      state.selectedCourseId = action.payload;
      if (!action.payload) {
        state.holes = [];
        state.selectedHoleId = null;
      }
    },
    selectHole: (state, action: PayloadAction<number | null>) => {
      state.selectedHoleId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch holes by course
    builder
      .addCase(fetchHolesByCourse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHolesByCourse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.holes = action.payload.holes || [];
        state.selectedCourseId = action.payload.courseId;
      })
      .addCase(fetchHolesByCourse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch holes';
      });
  },
});

export const { selectCourse, selectHole, clearError } = holeSlice.actions;
export default holeSlice.reducer;