import type { 
  Club, 
  ClubFilters, 
  CreateClubDto, 
  UpdateClubDto, 
  Course,
  ClubStats 
} from '../../types/club';

export type { 
  Club, 
  ClubFilters, 
  CreateClubDto, 
  UpdateClubDto, 
  Course,
  ClubStats 
};

// Redux specific types
export interface ClubLoadingState {
  list: boolean;
  detail: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  courses: boolean;
  search: boolean;
  stats: boolean;
  companyList: boolean;
}

export interface ClubErrorState {
  list: string | null;
  detail: string | null;
  create: string | null;
  update: string | null;
  delete: string | null;
  courses: string | null;
  search: string | null;
  stats: string | null;
  companyList: string | null;
}

export interface ClubState {
  clubs: Club[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  selectedClub: Club | null;
  selectedClubCourses: Course[];
  companyClubs: Club[];
  searchResults: Club[];
  stats: ClubStats | null;
  loading: ClubLoadingState;
  error: ClubErrorState;
  filters: ClubFilters;
  selectedCompanyId: number | null;
}