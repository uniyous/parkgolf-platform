import { apiClient } from './client';
import { extractSingle, type BffResponse } from './bffParser';

export interface ClubDetail {
  id: number;
  name: string;
  companyId: number;
  location: string;
  address: string;
  phone: string;
  email: string | null;
  website: string | null;
  totalHoles: number;
  totalCourses: number;
  status: string;
  clubType: string;
  latitude: number | null;
  longitude: number | null;
  operatingHours: { open: string; close: string } | null;
  seasonInfo: { type: string; startDate: string; endDate: string } | null;
  facilities: string[];
  isActive: boolean;
  courses?: ClubCourse[];
}

export interface ClubCourse {
  id: number;
  name: string;
  holes: ClubCourseHole[];
}

export interface ClubCourseHole {
  id: number;
  holeNumber: number;
  par: number;
  distance: number;
}

export const clubApi = {
  getClubById: async (id: number): Promise<ClubDetail> => {
    const response = await apiClient.get<BffResponse<ClubDetail>>(`/api/user/clubs/${id}`);
    const club = extractSingle<ClubDetail>(response.data);
    if (!club) {
      throw new Error(`Club ${id} not found`);
    }
    return club;
  },
};
