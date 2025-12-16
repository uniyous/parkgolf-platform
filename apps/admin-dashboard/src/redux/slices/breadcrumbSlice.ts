import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

interface BreadcrumbState {
  items: BreadcrumbItem[];
}

const initialState: BreadcrumbState = {
  items: [],
};

const breadcrumbSlice = createSlice({
  name: 'breadcrumb',
  initialState,
  reducers: {
    setBreadcrumb: (state, action: PayloadAction<BreadcrumbItem[]>) => {
      state.items = action.payload;
    },
    clearBreadcrumb: (state) => {
      state.items = [];
    },
    pushBreadcrumb: (state, action: PayloadAction<BreadcrumbItem>) => {
      state.items.push(action.payload);
    },
    popBreadcrumb: (state) => {
      state.items.pop();
    },
    updateLastBreadcrumb: (state, action: PayloadAction<BreadcrumbItem>) => {
      if (state.items.length > 0) {
        state.items[state.items.length - 1] = action.payload;
      }
    },
  },
});

export const { setBreadcrumb, clearBreadcrumb, pushBreadcrumb, popBreadcrumb, updateLastBreadcrumb } = breadcrumbSlice.actions;
export default breadcrumbSlice.reducer;