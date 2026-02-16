import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getCurrentWeather(lat: number, lon: number) {
    this.logger.log(`Current weather: lat=${lat}, lon=${lon}`);
    return this.natsClient.send('weather.current', { lat, lon }, NATS_TIMEOUTS.QUICK);
  }

  async getHourlyForecast(lat: number, lon: number) {
    this.logger.log(`Hourly forecast: lat=${lat}, lon=${lon}`);
    return this.natsClient.send('weather.hourly', { lat, lon }, NATS_TIMEOUTS.DEFAULT);
  }

  async getDailyForecast(lat: number, lon: number) {
    this.logger.log(`Daily forecast: lat=${lat}, lon=${lon}`);
    return this.natsClient.send('weather.forecast', { lat, lon }, NATS_TIMEOUTS.DEFAULT);
  }
}
