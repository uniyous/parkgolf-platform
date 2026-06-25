import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async reverseGeo(lat: number, lon: number) {
    this.logger.log(`Reverse geocoding: lat=${lat}, lon=${lon}`);
    return this.natsClient.send('location.coord2region', { x: lon, y: lat }, NATS_TIMEOUTS.QUICK);
  }

  async nearbyClubs(lat: number, lon: number, radiusKm?: number, limit?: number) {
    this.logger.log(`Nearby clubs: lat=${lat}, lon=${lon}, radius=${radiusKm || 30}km`);
    return this.natsClient.send(
      'club.findNearby',
      { latitude: lat, longitude: lon, radiusKm, limit },
      NATS_TIMEOUTS.LIST_QUERY,
    );
  }
}
