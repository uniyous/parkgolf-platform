import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';

const REQUEST_TIMEOUT = 10000;

@Injectable()
export class WeatherTools {
  private readonly logger = new Logger(WeatherTools.name);

  constructor(
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
    @Inject('WEATHER_SERVICE') private readonly weatherClient: ClientProxy,
    @Inject('LOCATION_SERVICE') private readonly locationClient: ClientProxy,
  ) {}

  async getWeather(args: Record<string, unknown>): Promise<unknown> {
    const { clubId, date } = args as { clubId: string; date: string };

    const clubResponse = await firstValueFrom(
      this.courseClient.send('club.findOne', { id: Number(clubId) }).pipe(
        timeout(REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get club location: ${err.message}`);
        }),
      ),
    );

    if (!clubResponse?.success || !clubResponse?.data) {
      return { error: '골프장 정보를 찾을 수 없습니다' };
    }

    const club = clubResponse.data;
    const lat = club.latitude || 36.5;
    const lon = club.longitude || 127.0;

    const weatherResponse = await firstValueFrom(
      this.weatherClient.send('weather.forecast', { lat, lon }).pipe(
        timeout(REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get weather: ${err.message}`);
        }),
      ),
    );

    if (weatherResponse?.success && weatherResponse?.data) {
      const forecasts = Array.isArray(weatherResponse.data) ? weatherResponse.data : [weatherResponse.data];
      const weather = forecasts.find((f: any) => f.date === date) || forecasts[0];

      if (weather) {
        return {
          date,
          clubName: club.name,
          temperature: weather.maxTemperature ?? weather.temperature,
          minTemperature: weather.minTemperature,
          maxTemperature: weather.maxTemperature,
          sky: weather.sky,
          precipitation: weather.precipitationProbability ?? weather.precipitation ?? 0,
          recommendation: this.getRecommendation(weather),
        };
      }
    }

    return { date, clubName: club.name, message: '날씨 정보를 가져올 수 없습니다' };
  }

  async getWeatherByLocation(args: Record<string, unknown>): Promise<unknown> {
    const { location, date, latitude, longitude } = args as {
      location: string;
      date: string;
      latitude?: number;
      longitude?: number;
    };

    let lat: number;
    let lon: number;
    let resolvedLocation = location;

    if (latitude && longitude) {
      lat = latitude;
      lon = longitude;
    } else {
      const addrResponse = await firstValueFrom(
        this.locationClient.send('location.search.address', { query: location }).pipe(
          timeout(REQUEST_TIMEOUT),
          catchError((err: any) => {
            this.logger.warn(`Address search failed for "${location}": ${err.message}`);
            return [null];
          }),
        ),
      );

      if (addrResponse?.success && addrResponse?.data?.addresses?.length > 0) {
        const addr = addrResponse.data.addresses[0];
        lat = addr.coordinates.latitude;
        lon = addr.coordinates.longitude;
        resolvedLocation = addr.region1 ? `${addr.region1} ${addr.region2 || ''}`.trim() : location;
      } else {
        const keywordResponse = await firstValueFrom(
          this.locationClient.send('location.search.keyword', { query: location }).pipe(
            timeout(REQUEST_TIMEOUT),
            catchError(() => [null]),
          ),
        );

        if (keywordResponse?.success && keywordResponse?.data?.places?.length > 0) {
          const place = keywordResponse.data.places[0];
          lat = place.coordinates.latitude;
          lon = place.coordinates.longitude;
          resolvedLocation = place.addressName || location;
        } else {
          return { date, location, message: `"${location}" 지역을 찾을 수 없습니다. 다른 지역명으로 시도해주세요.` };
        }
      }
    }

    const weatherResponse = await firstValueFrom(
      this.weatherClient.send('weather.forecast', { lat, lon }).pipe(
        timeout(REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get weather: ${err.message}`);
        }),
      ),
    );

    if (weatherResponse?.success && weatherResponse?.data) {
      const forecasts = Array.isArray(weatherResponse.data) ? weatherResponse.data : [weatherResponse.data];
      const weather = forecasts.find((f: any) => f.date === date) || forecasts[0];

      if (weather) {
        return {
          date,
          location: resolvedLocation,
          temperature: weather.maxTemperature ?? weather.temperature,
          minTemperature: weather.minTemperature,
          maxTemperature: weather.maxTemperature,
          sky: weather.sky,
          precipitation: weather.precipitationProbability ?? weather.precipitation ?? 0,
          recommendation: this.getRecommendation(weather),
        };
      }
    }

    return { date, location: resolvedLocation, message: '날씨 정보를 가져올 수 없습니다' };
  }

  private getRecommendation(weather: any): string {
    const temp = weather.maxTemperature ?? weather.temperature;
    const precipitation = weather.precipitationProbability ?? weather.precipitation ?? 0;

    if (precipitation > 50) return '비가 예보되어 있어요. 우산을 챙기시거나 다른 날을 추천드려요.';
    if (precipitation > 30) return '비 올 가능성이 있어요. 우산을 준비하시면 좋겠어요.';
    if (temp !== undefined && temp < 5) return '추운 날씨예요. 따뜻하게 입고 오시면 좋겠어요.';
    if (temp !== undefined && temp > 30) return '더운 날씨예요. 이른 아침이나 저녁 시간대를 추천드려요.';
    return '골프 치기 좋은 날씨예요!';
  }
}
