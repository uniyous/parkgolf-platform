import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';

const REQUEST_TIMEOUT = 10000;

@Injectable()
export class SearchTools {
  private readonly logger = new Logger(SearchTools.name);

  constructor(
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
    @Inject('LOCATION_SERVICE') private readonly locationClient: ClientProxy,
  ) {}

  async resolveRegionName(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.locationClient
          .send('location.coord2region', { x: longitude, y: latitude })
          .pipe(
            timeout(REQUEST_TIMEOUT),
            catchError(() => [null]),
          ),
      );
      if (response?.success && response.data) {
        const { region1, region2, region3 } = response.data;
        return [region1, region2, region3].filter(Boolean).join(' ');
      }
      return null;
    } catch {
      return null;
    }
  }

  async resolveLocationName(query: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.locationClient.send('location.search.address', { query }).pipe(
          timeout(REQUEST_TIMEOUT),
          catchError(() => [null]),
        ),
      );
      if (response?.success && response?.data?.addresses?.length > 0) {
        const addr = response.data.addresses[0];
        return addr.region1 ? `${addr.region1} ${addr.region2 || ''}`.trim() : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async searchClubs(args: Record<string, unknown>): Promise<unknown> {
    const { location, name } = args as { location: string; name?: string };
    const query = name ? `${location} ${name}` : location;

    const response = await firstValueFrom(
      this.courseClient.send('club.search', { query }).pipe(
        timeout(REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to search clubs: ${err.message}`);
        }),
      ),
    );

    if (response?.success && response?.data) {
      const clubs = response.data;
      return {
        found: clubs.length,
        clubs: clubs.slice(0, 5).map((club: any) => ({
          id: club.id,
          name: club.name,
          address: club.address,
          region: club.location,
        })),
      };
    }
    return { found: 0, clubs: [] };
  }

  async searchClubsWithSlots(args: Record<string, unknown>): Promise<unknown> {
    const { location, date, name, timePreference } = args as {
      location: string;
      date: string;
      name?: string;
      timePreference?: 'morning' | 'afternoon' | 'evening';
    };

    const timeOfDayMap: Record<string, string> = {
      morning: 'MORNING',
      afternoon: 'AFTERNOON',
      evening: 'EVENING',
    };

    const search = name ? `${location} ${name}` : location;

    const response = await firstValueFrom(
      this.courseClient
        .send('games.search', {
          search,
          date,
          timeOfDay: timePreference ? timeOfDayMap[timePreference] : undefined,
          limit: 20,
        })
        .pipe(
          timeout(REQUEST_TIMEOUT),
          catchError((err) => {
            throw new Error(`Failed to search clubs with slots: ${err.message}`);
          }),
        ),
    );

    if (!response?.success || !response?.data?.length) {
      return { found: 0, date, clubs: [] };
    }

    const clubMap = new Map<number, {
      id: number;
      name: string;
      address: string;
      region: string;
      availableSlotCount: number;
      rounds: Array<{ gameId: number; name: string; price: number; slots: any[] }>;
    }>();

    for (const game of response.data) {
      const club = game.club;
      if (!club) continue;
      const slots = game.timeSlots || [];
      if (slots.length === 0) continue;

      const roundSlots = slots
        .map((slot: any) => ({
          id: slot.id,
          time: slot.startTime,
          endTime: slot.endTime,
          availableSpots: slot.availablePlayers ?? (slot.maxPlayers - slot.bookedPlayers),
          price: Number(slot.price),
        }))
        .sort((a: any, b: any) => a.time.localeCompare(b.time));

      const existing = clubMap.get(club.id);

      if (existing) {
        existing.availableSlotCount += roundSlots.length;
        existing.rounds.push({
          gameId: game.id,
          name: game.name,
          price: Number(roundSlots[0]?.price || 0),
          slots: roundSlots,
        });
      } else {
        clubMap.set(club.id, {
          id: club.id,
          name: club.name,
          address: club.address,
          region: club.location,
          availableSlotCount: roundSlots.length,
          rounds: [
            {
              gameId: game.id,
              name: game.name,
              price: Number(roundSlots[0]?.price || 0),
              slots: roundSlots,
            },
          ],
        });
      }
    }

    return {
      found: clubMap.size,
      date,
      clubs: Array.from(clubMap.values()),
    };
  }

  async getClubInfo(args: Record<string, unknown>): Promise<unknown> {
    const { clubId } = args as { clubId: string };

    const response = await firstValueFrom(
      this.courseClient.send('club.findOne', { id: Number(clubId) }).pipe(
        timeout(REQUEST_TIMEOUT),
        catchError((err) => {
          throw new Error(`Failed to get club info: ${err.message}`);
        }),
      ),
    );

    if (response?.success && response?.data) {
      const club = response.data;
      return {
        id: club.id,
        name: club.name,
        address: club.address,
        phone: club.phone,
        operatingHours: club.operatingHours,
        facilities: club.facilities,
        courses: club.courses?.map((c: any) => ({
          id: c.id,
          name: c.name,
          holes: c.holes,
        })),
      };
    }
    return null;
  }

  async searchAddress(args: Record<string, unknown>): Promise<unknown> {
    const { address } = args as { address: string };

    const response = await firstValueFrom(
      this.locationClient.send('location.search.address', { query: address }).pipe(
        timeout(REQUEST_TIMEOUT),
        catchError((err: any) => {
          throw new Error(`Failed to search address: ${err.message}`);
        }),
      ),
    );

    if (response?.success && response?.data?.addresses?.length > 0) {
      const addresses = response.data.addresses;
      return {
        found: addresses.length,
        addresses: addresses.slice(0, 3).map((addr: any) => ({
          addressName: addr.addressName,
          roadAddressName: addr.roadAddressName,
          region: `${addr.region1} ${addr.region2} ${addr.region3}`,
          postalCode: addr.postalCode,
          latitude: addr.coordinates.latitude,
          longitude: addr.coordinates.longitude,
        })),
      };
    }
    return { found: 0, addresses: [], message: '주소를 찾을 수 없습니다' };
  }

  async getNearbyClubs(args: Record<string, unknown>): Promise<unknown> {
    const { latitude, longitude, radius } = args as {
      latitude: number;
      longitude: number;
      radius?: number;
    };

    const radiusKm = radius && radius >= 1000 ? Math.round(radius / 1000) : radius || 10;

    const response = await firstValueFrom(
      this.courseClient
        .send('club.findNearby', { latitude, longitude, radiusKm })
        .pipe(
          timeout(REQUEST_TIMEOUT),
          catchError((err: any) => {
            throw new Error(`Failed to search nearby clubs: ${err.message}`);
          }),
        ),
    );

    if (response?.success && Array.isArray(response?.data) && response.data.length > 0) {
      const clubs = response.data;
      return {
        found: clubs.length,
        nearbyClubs: clubs.slice(0, 5).map((club: any) => ({
          id: club.id,
          name: club.name,
          address: club.address,
          region: club.location,
          phone: club.phone,
          distance: club.distance != null ? `${club.distance}km` : undefined,
        })),
      };
    }

    return { found: 0, nearbyClubs: [], message: '근처에 파크골프장을 찾을 수 없습니다' };
  }
}
