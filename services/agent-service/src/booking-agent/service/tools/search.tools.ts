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
    const { latitude, longitude, radius, date, playerCount } = args as {
      latitude: number;
      longitude: number;
      radius?: number;
      date?: string;
      playerCount?: number;
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

    if (!response?.success || !Array.isArray(response?.data) || response.data.length === 0) {
      return { found: 0, nearbyClubs: [], message: '근처에 파크골프장을 찾을 수 없습니다' };
    }

    const clubs = response.data.slice(0, 5);
    const toBasic = (club: any) => ({
      id: club.id,
      name: club.name,
      address: club.address,
      region: club.location,
      phone: club.phone,
      distance: club.distance != null ? `${club.distance}km` : undefined,
    });

    // 날짜 없으면 기존 동작(클럽 기본 정보만)
    if (!date) {
      return { found: response.data.length, nearbyClubs: clubs.map(toBasic) };
    }

    // 날짜 있으면 근처 클럽들의 가용 슬롯을 한 번에(병렬) 조회 → LLM 추가 라운드 방지 (UNI 최적화)
    const enriched = await Promise.all(
      clubs.map(async (club: any) => {
        try {
          const gamesResp = await firstValueFrom(
            this.courseClient
              .send('games.search', { clubId: club.id, date, limit: 50 })
              .pipe(timeout(REQUEST_TIMEOUT), catchError(() => [null] as any)),
          );
          const games = gamesResp?.success && Array.isArray(gamesResp.data) ? gamesResp.data : [];
          const slots: Array<{ id: number; gameId: number; gameName: string; time: string; availableSpots: number; price: number }> = [];
          for (const game of games) {
            for (const s of game.timeSlots || []) {
              const spots = s.availablePlayers ?? (s.maxPlayers - s.bookedPlayers);
              if (playerCount && spots < playerCount) continue;
              slots.push({ id: s.id, gameId: game.id, gameName: game.name, time: s.startTime, availableSpots: spots, price: Number(s.price) });
            }
          }
          slots.sort((a, b) => a.time.localeCompare(b.time));
          return { ...toBasic(club), availableSlotCount: slots.length, slots: slots.slice(0, 6) };
        } catch {
          return { ...toBasic(club), availableSlotCount: 0, slots: [] };
        }
      }),
    );

    const available = enriched.filter((c) => c.availableSlotCount > 0);
    return {
      found: enriched.length,
      date,
      availableCount: available.length,
      // 가용 클럽 우선 정렬
      nearbyClubs: [...available, ...enriched.filter((c) => c.availableSlotCount === 0)],
    };
  }
}
