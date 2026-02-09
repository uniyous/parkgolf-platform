import { apiClient } from './client';
import { extractSingle, extractList, type BffResponse } from './bffParser';

export interface RegionInfo {
  regionType: string;
  addressName: string;
  region1: string;
  region2: string;
  region3: string;
  region4: string;
  code: string;
}

export interface NearbyClub {
  id: number;
  name: string;
  location: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  totalHoles: number;
  totalCourses: number;
  status: string;
  clubType: string;
  facilities: string[];
  distance: number; // km
}

export const locationApi = {
  reverseGeo: async (lat: number, lon: number): Promise<RegionInfo | null> => {
    const response = await apiClient.get<BffResponse<RegionInfo>>(
      '/api/user/location/reverse-geo',
      { lat, lon },
    );
    return extractSingle<RegionInfo>(response.data);
  },

  nearbyClubs: async (
    lat: number,
    lon: number,
    radius?: number,
    limit?: number,
  ): Promise<NearbyClub[]> => {
    const params: Record<string, number | undefined> = { lat, lon };
    if (radius) params.radius = radius;
    if (limit) params.limit = limit;

    const response = await apiClient.get<BffResponse<NearbyClub[]>>(
      '/api/user/location/nearby-clubs',
      params,
    );
    return extractList<NearbyClub>(response.data);
  },
};
