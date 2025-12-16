import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { clubApi } from '../../api/club/clubApi';
import type { 
  Club, 
  ClubFilters, 
  CreateClubDto, 
  UpdateClubDto,
  Course,
  ClubStats
} from '../../types/club';

// Async thunks
export const fetchClubs = createAsyncThunk(
  'club/fetchClubs',
  async (filters: ClubFilters = {}) => {
    const response = await clubApi.getClubs(filters);
    return response;
  }
);

export const fetchClubById = createAsyncThunk(
  'club/fetchClubById',
  async (id: number) => {
    return await clubApi.getClubById(id);
  }
);

export const createClub = createAsyncThunk(
  'club/createClub',
  async (clubData: CreateClubDto) => {
    return await clubApi.createClub(clubData);
  }
);

export const updateClub = createAsyncThunk(
  'club/updateClub',
  async ({ id, data }: { id: number; data: UpdateClubDto }) => {
    return await clubApi.updateClub(id, data);
  }
);

export const deleteClub = createAsyncThunk(
  'club/deleteClub',
  async (id: number) => {
    await clubApi.deleteClub(id);
    return id;
  }
);

export const fetchClubsByCompany = createAsyncThunk(
  'club/fetchClubsByCompany',
  async (companyId: number) => {
    return await clubApi.getClubsByCompany(companyId);
  }
);

export const fetchCoursesByClub = createAsyncThunk(
  'club/fetchCoursesByClub',
  async (clubId: number) => {
    return await clubApi.getCoursesByClub(clubId);
  }
);

export const searchClubs = createAsyncThunk(
  'club/searchClubs',
  async (query: string) => {
    return await clubApi.searchClubs(query);
  }
);

export const fetchClubStats = createAsyncThunk(
  'club/fetchClubStats',
  async () => {
    return await clubApi.getClubStats();
  }
);

// State interface
interface ClubState {
  // Club list
  clubs: Club[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  
  // Selected club
  selectedClub: Club | null;
  selectedClubCourses: Course[];
  
  // Company specific clubs
  companyClubs: Club[];
  
  // Search results
  searchResults: Club[];
  
  // Statistics
  stats: ClubStats | null;
  
  // Loading states
  loading: {
    list: boolean;
    detail: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    courses: boolean;
    search: boolean;
    stats: boolean;
    companyList: boolean;
  };
  
  // Error states
  error: {
    list: string | null;
    detail: string | null;
    create: string | null;
    update: string | null;
    delete: string | null;
    courses: string | null;
    search: string | null;
    stats: string | null;
    companyList: string | null;
  };
  
  // UI state
  filters: ClubFilters;
  selectedCompanyId: number | null;
}

const initialState: ClubState = {
  clubs: [],
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  selectedClub: null,
  selectedClubCourses: [],
  companyClubs: [],
  searchResults: [],
  stats: null,
  loading: {
    list: false,
    detail: false,
    create: false,
    update: false,
    delete: false,
    courses: false,
    search: false,
    stats: false,
    companyList: false,
  },
  error: {
    list: null,
    detail: null,
    create: null,
    update: null,
    delete: null,
    courses: null,
    search: null,
    stats: null,
    companyList: null,
  },
  filters: {},
  selectedCompanyId: null,
};

const clubSlice = createSlice({
  name: 'club',
  initialState,
  reducers: {
    // Clear errors
    clearErrors: (state) => {
      state.error = {
        list: null,
        detail: null,
        create: null,
        update: null,
        delete: null,
        courses: null,
        search: null,
        stats: null,
        companyList: null,
      };
    },
    
    // Set filters
    setFilters: (state, action: PayloadAction<ClubFilters>) => {
      state.filters = action.payload;
    },
    
    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
    },
    
    // Set selected club
    setSelectedClub: (state, action: PayloadAction<Club | null>) => {
      state.selectedClub = action.payload;
      if (!action.payload) {
        state.selectedClubCourses = [];
      }
    },
    
    // Set selected company
    setSelectedCompanyId: (state, action: PayloadAction<number | null>) => {
      state.selectedCompanyId = action.payload;
    },
    
    // Clear search results
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    
    // Reset state
    resetState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch clubs
    builder
      .addCase(fetchClubs.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchClubs.fulfilled, (state, action) => {
        state.loading.list = false;
        state.clubs = action.payload.data;
        state.totalCount = action.payload.pagination.total;
        state.currentPage = action.payload.pagination.page;
        state.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(fetchClubs.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list = action.error.message || 'Failed to fetch clubs';
      });

    // Fetch club by ID
    builder
      .addCase(fetchClubById.pending, (state) => {
        state.loading.detail = true;
        state.error.detail = null;
      })
      .addCase(fetchClubById.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.selectedClub = action.payload;
        // Extract courses from club data if available
        if (action.payload.courses) {
          state.selectedClubCourses = action.payload.courses;
        }
      })
      .addCase(fetchClubById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error.detail = action.error.message || 'Failed to fetch club';
      });

    // Create club
    builder
      .addCase(createClub.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createClub.fulfilled, (state, action) => {
        state.loading.create = false;
        state.clubs.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createClub.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.error.message || 'Failed to create club';
      });

    // Update club
    builder
      .addCase(updateClub.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateClub.fulfilled, (state, action) => {
        state.loading.update = false;
        const index = state.clubs.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.clubs[index] = action.payload;
        }
        if (state.selectedClub?.id === action.payload.id) {
          state.selectedClub = action.payload;
        }
      })
      .addCase(updateClub.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.error.message || 'Failed to update club';
      });

    // Delete club
    builder
      .addCase(deleteClub.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteClub.fulfilled, (state, action) => {
        state.loading.delete = false;
        state.clubs = state.clubs.filter(c => c.id !== action.payload);
        state.totalCount -= 1;
        if (state.selectedClub?.id === action.payload) {
          state.selectedClub = null;
          state.selectedClubCourses = [];
        }
      })
      .addCase(deleteClub.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.error.message || 'Failed to delete club';
      });

    // Fetch clubs by company
    builder
      .addCase(fetchClubsByCompany.pending, (state) => {
        state.loading.companyList = true;
        state.error.companyList = null;
      })
      .addCase(fetchClubsByCompany.fulfilled, (state, action) => {
        state.loading.companyList = false;
        state.companyClubs = action.payload;
      })
      .addCase(fetchClubsByCompany.rejected, (state, action) => {
        state.loading.companyList = false;
        state.error.companyList = action.error.message || 'Failed to fetch company clubs';
      });

    // Fetch courses by club
    builder
      .addCase(fetchCoursesByClub.pending, (state) => {
        state.loading.courses = true;
        state.error.courses = null;
      })
      .addCase(fetchCoursesByClub.fulfilled, (state, action) => {
        state.loading.courses = false;
        state.selectedClubCourses = action.payload;
      })
      .addCase(fetchCoursesByClub.rejected, (state, action) => {
        state.loading.courses = false;
        state.error.courses = action.error.message || 'Failed to fetch courses';
      });

    // Search clubs
    builder
      .addCase(searchClubs.pending, (state) => {
        state.loading.search = true;
        state.error.search = null;
      })
      .addCase(searchClubs.fulfilled, (state, action) => {
        state.loading.search = false;
        state.clubs = action.payload;
        state.searchResults = action.payload;
        // Reset pagination for search results
        state.totalCount = action.payload.length;
        state.currentPage = 1;
        state.totalPages = 1;
      })
      .addCase(searchClubs.rejected, (state, action) => {
        state.loading.search = false;
        state.error.search = action.error.message || 'Failed to search clubs';
      });

    // Fetch club stats
    builder
      .addCase(fetchClubStats.pending, (state) => {
        state.loading.stats = true;
        state.error.stats = null;
      })
      .addCase(fetchClubStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchClubStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error.stats = action.error.message || 'Failed to fetch stats';
      });
  },
});

export const {
  clearErrors,
  setFilters,
  clearFilters,
  setSelectedClub,
  setSelectedCompanyId,
  clearSearchResults,
  resetState,
} = clubSlice.actions;

export default clubSlice.reducer;