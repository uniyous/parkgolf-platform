import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminApi } from '../../api/adminApi';
import type { Admin } from '../../types';

interface AdminState {
  admins: Admin[];
  selectedAdmin: Admin | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  admins: [],
  selectedAdmin: null,
  isLoading: false,
  error: null,
};

export const fetchAdmins = createAsyncThunk(
  'admin/fetchAdmins',
  async () => {
    const admins = await adminApi.getAdmins();
    return admins;
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    selectAdmin: (state, action) => {
      state.selectedAdmin = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdmins.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdmins.fulfilled, (state, action) => {
        state.isLoading = false;
        state.admins = action.payload || [];
      })
      .addCase(fetchAdmins.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch admins';
      });
  },
});

export const { selectAdmin, clearError } = adminSlice.actions;
export default adminSlice.reducer;