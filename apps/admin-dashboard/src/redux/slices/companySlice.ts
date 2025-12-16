import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { companyApi } from '../../api/companyApi';
import type { 
  CompanyState, 
  CompanyViewMode, 
  FetchCompaniesPayload,
  UpdateCompanyStatusPayload,
  BulkUpdateStatusPayload,
  BulkDeletePayload
} from '../types/companyTypes';
import type { 
  Company, 
  CompanyFilters, 
  CreateCompanyDto, 
  UpdateCompanyDto 
} from '../../types/company';

// 초기 상태
const initialState: CompanyState = {
  companies: [],
  selectedCompany: null,
  viewMode: 'list',
  selectedCompanies: [],
  filters: {
    search: '',
    status: undefined,
    sortBy: 'name',
    sortOrder: 'asc',
    showOnlyActive: false
  },
  filteredCompanies: [],
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false,
    bulkAction: false,
    stats: false
  },
  error: {
    list: null,
    create: null,
    update: null,
    delete: null,
    bulkAction: null,
    stats: null
  },
  stats: null,
  lastUpdated: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  }
};

// Async Thunks
export const fetchCompanies = createAsyncThunk(
  'company/fetchCompanies',
  async (payload: FetchCompaniesPayload = {}, { rejectWithValue }) => {
    try {
      const { filters, page = 1, limit = 20 } = payload;
      const response = await companyApi.getCompanies(filters, page, limit);
      return {
        companies: response.data,
        pagination: response.pagination,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || '회사 목록을 불러오는데 실패했습니다.');
    }
  }
);

export const fetchCompanyById = createAsyncThunk(
  'company/fetchCompanyById',
  async (id: number, { rejectWithValue }) => {
    try {
      const company = await companyApi.getCompanyById(id);
      return company;
    } catch (error: any) {
      return rejectWithValue(error?.message || '회사 정보를 불러오는데 실패했습니다.');
    }
  }
);

export const createCompany = createAsyncThunk(
  'company/createCompany',
  async (companyData: CreateCompanyDto, { rejectWithValue, dispatch }) => {
    try {
      const newCompany = await companyApi.createCompany(companyData);
      // 생성 후 목록 새로고침
      dispatch(fetchCompanies());
      return newCompany;
    } catch (error: any) {
      return rejectWithValue(error?.message || '회사 생성에 실패했습니다.');
    }
  }
);

export const updateCompany = createAsyncThunk(
  'company/updateCompany',
  async (payload: { id: number; data: UpdateCompanyDto }, { rejectWithValue, dispatch }) => {
    try {
      const { id, data } = payload;
      const updatedCompany = await companyApi.updateCompany(id, data);
      // 수정 후 목록 새로고침
      dispatch(fetchCompanies());
      return updatedCompany;
    } catch (error: any) {
      return rejectWithValue(error?.message || '회사 수정에 실패했습니다.');
    }
  }
);

export const deleteCompany = createAsyncThunk(
  'company/deleteCompany',
  async (id: number, { rejectWithValue, dispatch }) => {
    try {
      await companyApi.deleteCompany(id);
      // 삭제 후 목록 새로고침
      dispatch(fetchCompanies());
      return id;
    } catch (error: any) {
      return rejectWithValue(error?.message || '회사 삭제에 실패했습니다.');
    }
  }
);

export const updateCompanyStatus = createAsyncThunk(
  'company/updateCompanyStatus',
  async (payload: UpdateCompanyStatusPayload, { rejectWithValue, getState }) => {
    try {
      const { id, status } = payload;
      const updatedCompany = await companyApi.updateCompanyStatus(id, status);
      return updatedCompany;
    } catch (error: any) {
      return rejectWithValue(error?.message || '회사 상태 변경에 실패했습니다.');
    }
  }
);

export const bulkUpdateStatus = createAsyncThunk(
  'company/bulkUpdateStatus',
  async (payload: BulkUpdateStatusPayload, { rejectWithValue, dispatch }) => {
    try {
      const { companyIds, status } = payload;
      const updatedCompanies = await companyApi.bulkUpdateStatus(companyIds, status);
      // 대량 작업 후 목록 새로고침
      dispatch(fetchCompanies());
      return updatedCompanies;
    } catch (error: any) {
      return rejectWithValue(error?.message || '대량 상태 변경에 실패했습니다.');
    }
  }
);

export const bulkDeleteCompanies = createAsyncThunk(
  'company/bulkDeleteCompanies',
  async (payload: BulkDeletePayload, { rejectWithValue, dispatch }) => {
    try {
      const { companyIds } = payload;
      await companyApi.bulkDeleteCompanies(companyIds);
      // 대량 삭제 후 목록 새로고침
      dispatch(fetchCompanies());
      return companyIds;
    } catch (error: any) {
      return rejectWithValue(error?.message || '대량 삭제에 실패했습니다.');
    }
  }
);

export const fetchCompanyStats = createAsyncThunk(
  'company/fetchCompanyStats',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await companyApi.getCompanyStats();
      return stats;
    } catch (error: any) {
      return rejectWithValue(error?.message || '회사 통계를 불러오는데 실패했습니다.');
    }
  }
);

// Slice
const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    // 동기 액션들
    setViewMode: (state, action: PayloadAction<CompanyViewMode>) => {
      state.viewMode = action.payload;
    },
    
    setSelectedCompany: (state, action: PayloadAction<Company | null>) => {
      state.selectedCompany = action.payload;
    },
    
    setSelectedCompanies: (state, action: PayloadAction<number[]>) => {
      state.selectedCompanies = action.payload;
    },
    
    setFilters: (state, action: PayloadAction<CompanyFilters>) => {
      state.filters = action.payload;
      // 필터 변경 시 필터링된 목록 업데이트
      state.filteredCompanies = applyFilters(state.companies, action.payload);
    },
    
    clearError: (state, action: PayloadAction<keyof CompanyState['error']>) => {
      state.error[action.payload] = null;
    },
    
    clearAllErrors: (state) => {
      Object.keys(state.error).forEach(key => {
        state.error[key as keyof CompanyState['error']] = null;
      });
    },
    
    resetCompanyState: (state) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: (builder) => {
    // fetchCompanies
    builder
      .addCase(fetchCompanies.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading.list = false;
        state.companies = action.payload.companies;
        state.pagination = action.payload.pagination;
        state.lastUpdated = action.payload.timestamp;
        state.filteredCompanies = applyFilters(action.payload.companies, state.filters);
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list = action.payload as string;
        state.companies = [];
        state.filteredCompanies = [];
      })
      
    // fetchCompanyById
    builder
      .addCase(fetchCompanyById.fulfilled, (state, action) => {
        state.selectedCompany = action.payload;
      })
      
    // createCompany
    builder
      .addCase(createCompany.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createCompany.fulfilled, (state) => {
        state.loading.create = false;
        state.viewMode = 'list';
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.payload as string;
      })
      
    // updateCompany
    builder
      .addCase(updateCompany.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateCompany.fulfilled, (state) => {
        state.loading.update = false;
        state.viewMode = 'list';
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload as string;
      })
      
    // deleteCompany
    builder
      .addCase(deleteCompany.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteCompany.fulfilled, (state) => {
        state.loading.delete = false;
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload as string;
      })
      
    // updateCompanyStatus
    builder
      .addCase(updateCompanyStatus.fulfilled, (state, action) => {
        const updatedCompany = action.payload;
        const index = state.companies.findIndex(c => c.id === updatedCompany.id);
        if (index !== -1) {
          state.companies[index] = updatedCompany;
          state.filteredCompanies = applyFilters(state.companies, state.filters);
        }
        if (state.selectedCompany?.id === updatedCompany.id) {
          state.selectedCompany = updatedCompany;
        }
      })
      
    // bulkUpdateStatus
    builder
      .addCase(bulkUpdateStatus.pending, (state) => {
        state.loading.bulkAction = true;
        state.error.bulkAction = null;
      })
      .addCase(bulkUpdateStatus.fulfilled, (state) => {
        state.loading.bulkAction = false;
        state.selectedCompanies = [];
      })
      .addCase(bulkUpdateStatus.rejected, (state, action) => {
        state.loading.bulkAction = false;
        state.error.bulkAction = action.payload as string;
      })
      
    // bulkDeleteCompanies
    builder
      .addCase(bulkDeleteCompanies.pending, (state) => {
        state.loading.bulkAction = true;
        state.error.bulkAction = null;
      })
      .addCase(bulkDeleteCompanies.fulfilled, (state) => {
        state.loading.bulkAction = false;
        state.selectedCompanies = [];
      })
      .addCase(bulkDeleteCompanies.rejected, (state, action) => {
        state.loading.bulkAction = false;
        state.error.bulkAction = action.payload as string;
      })
      
    // fetchCompanyStats
    builder
      .addCase(fetchCompanyStats.pending, (state) => {
        state.loading.stats = true;
        state.error.stats = null;
      })
      .addCase(fetchCompanyStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchCompanyStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error.stats = action.payload as string;
      });
  }
});

// 필터링 헬퍼 함수
function applyFilters(companies: Company[], filters: CompanyFilters): Company[] {
  let filtered = [...companies];

  // 검색 필터
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(company => 
      company.name.toLowerCase().includes(searchLower) ||
      (company.businessNumber && company.businessNumber.includes(filters.search)) ||
      (company.address && company.address.toLowerCase().includes(searchLower)) ||
      (company.email && company.email.toLowerCase().includes(searchLower))
    );
  }

  // 상태 필터
  if (filters.status) {
    filtered = filtered.filter(company => company.status === filters.status);
  }

  // 활성 상태 필터
  if (filters.showOnlyActive) {
    filtered = filtered.filter(company => company.isActive);
  }

  // 정렬
  filtered.sort((a, b) => {
    const aValue = a[filters.sortBy as keyof Company] as string | number;
    const bValue = b[filters.sortBy as keyof Company] as string | number;
    
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

  return filtered;
}

// Actions export
export const {
  setViewMode,
  setSelectedCompany,
  setSelectedCompanies,
  setFilters,
  clearError,
  clearAllErrors,
  resetCompanyState
} = companySlice.actions;

// Reducer export
export default companySlice.reducer;