import { apiClient } from './client';
import { extractSingle, type BffResponse } from './bffParser';

export type PrecipitationType = 'NONE' | 'RAIN' | 'SLEET' | 'SNOW' | 'DRIZZLE' | 'SNOW_FLURRY';
export type SkyCondition = 'CLEAR' | 'PARTLY_CLOUDY' | 'CLOUDY' | 'OVERCAST';

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  precipitationType: PrecipitationType;
  updatedAt: string;
}

export interface HourlyForecast {
  dateTime: string;
  date: string;
  time: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  sky?: SkyCondition;
  precipitationProbability?: number;
  precipitationType?: PrecipitationType;
}

export interface DailyForecast {
  date: string;
  dayOfWeek: string;
  minTemperature: number;
  maxTemperature: number;
  sky: SkyCondition;
  precipitationProbability: number;
  precipitationType: PrecipitationType;
}

export const weatherApi = {
  getCurrentWeather: async (lat: number, lon: number): Promise<CurrentWeather | null> => {
    const response = await apiClient.get<BffResponse<CurrentWeather>>(
      '/api/user/weather/current',
      { lat, lon },
    );
    return extractSingle<CurrentWeather>(response.data);
  },

  getHourlyForecast: async (lat: number, lon: number): Promise<HourlyForecast[]> => {
    const response = await apiClient.get<BffResponse<HourlyForecast[]>>(
      '/api/user/weather/hourly',
      { lat, lon },
    );
    const data = extractSingle<HourlyForecast[]>(response.data);
    return data || [];
  },

  getDailyForecast: async (lat: number, lon: number): Promise<DailyForecast[]> => {
    const response = await apiClient.get<BffResponse<DailyForecast[]>>(
      '/api/user/weather/forecast',
      { lat, lon },
    );
    const data = extractSingle<DailyForecast[]>(response.data);
    return data || [];
  },
};
