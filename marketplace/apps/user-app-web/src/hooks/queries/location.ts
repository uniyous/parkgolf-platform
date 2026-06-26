import { useQuery } from '@tanstack/react-query';
import { locationApi } from '@/lib/api/locationApi';

export const locationKeys = {
  all: ['location'] as const,
  reverseGeo: (lat: number | null, lon: number | null) =>
    [...locationKeys.all, 'reverseGeo', lat, lon] as const,
  nearbyClubs: (lat: number | null, lon: number | null, radius?: number) =>
    [...locationKeys.all, 'nearbyClubs', lat, lon, radius] as const,
};

export function useReverseGeoQuery(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: locationKeys.reverseGeo(lat, lon),
    queryFn: () => locationApi.reverseGeo(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000,
  });
}

export function useNearbyClubsQuery(
  lat: number | null,
  lon: number | null,
  radius?: number,
  limit?: number,
) {
  return useQuery({
    queryKey: locationKeys.nearbyClubs(lat, lon, radius),
    queryFn: () => locationApi.nearbyClubs(lat!, lon!, radius, limit),
    enabled: lat !== null && lon !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
