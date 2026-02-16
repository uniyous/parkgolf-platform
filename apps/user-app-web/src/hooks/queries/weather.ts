import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '@/lib/api/weatherApi';

export const weatherKeys = {
  all: ['weather'] as const,
  current: (lat: number | null, lon: number | null) =>
    [...weatherKeys.all, 'current', lat, lon] as const,
  hourly: (lat: number | null, lon: number | null) =>
    [...weatherKeys.all, 'hourly', lat, lon] as const,
  forecast: (lat: number | null, lon: number | null) =>
    [...weatherKeys.all, 'forecast', lat, lon] as const,
};

export function useCurrentWeatherQuery(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: weatherKeys.current(lat, lon),
    queryFn: () => weatherApi.getCurrentWeather(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000,
  });
}

export function useHourlyForecastQuery(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: weatherKeys.hourly(lat, lon),
    queryFn: () => weatherApi.getHourlyForecast(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useDailyForecastQuery(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: weatherKeys.forecast(lat, lon),
    queryFn: () => weatherApi.getDailyForecast(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}
