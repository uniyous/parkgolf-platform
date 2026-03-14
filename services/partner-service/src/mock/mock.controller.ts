import { Controller, Get, Query, Logger } from '@nestjs/common';

interface MockSlot {
  slot_id: string;
  course_name: string;
  course_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_players: number;
  booked_players: number;
  status: string;
  price: number;
}

interface MockBooking {
  booking_id: string;
  course_name: string;
  course_id: string;
  slot_id: string;
  date: string;
  start_time: string;
  player_count: number;
  player_name: string;
  player_phone: string;
  status: string;
  paid_amount: number;
}

/**
 * Mock 외부 부킹 API
 * 통합테스트용 - 실제 외부 시스템 없이 전체 동기화 파이프라인 검증
 */
@Controller('mock')
export class MockController {
  private readonly logger = new Logger(MockController.name);

  private readonly COURSE_NAMES = ['A+B코스', 'C+D코스'];
  private readonly PLAYER_NAMES = ['김파크', '이골프', '박그린', '최티', '정홀'];
  private readonly TIME_SLOTS = [
    { start: '06:00', end: '09:00' },
    { start: '06:10', end: '09:10' },
    { start: '06:20', end: '09:20' },
    { start: '06:30', end: '09:30' },
    { start: '06:40', end: '09:40' },
    { start: '06:50', end: '09:50' },
    { start: '07:00', end: '10:00' },
    { start: '07:10', end: '10:10' },
    { start: '07:20', end: '10:20' },
    { start: '07:30', end: '10:30' },
  ];

  /**
   * OpenAPI 스펙 제공
   */
  @Get('openapi.json')
  getSpec(@Query('base_url') baseUrl?: string) {
    const serverUrl = baseUrl || 'http://localhost:8080';

    return {
      openapi: '3.0.0',
      info: {
        title: 'Mock 파크골프 예약 시스템 API',
        version: '1.0.0',
      },
      servers: [{ url: serverUrl }],
      paths: {
        '/mock/slots': {
          get: {
            operationId: 'getSlots',
            parameters: [
              { name: 'club_id', in: 'query', schema: { type: 'string' } },
              { name: 'start_date', in: 'query', schema: { type: 'string' } },
              { name: 'end_date', in: 'query', schema: { type: 'string' } },
            ],
            responses: { '200': { description: 'OK' } },
          },
        },
        '/mock/bookings': {
          get: {
            operationId: 'getBookings',
            parameters: [
              { name: 'club_id', in: 'query', schema: { type: 'string' } },
              { name: 'since', in: 'query', schema: { type: 'string' } },
            ],
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    };
  }

  /**
   * Mock 슬롯 조회
   * GET /mock/slots?club_id=...&start_date=...&end_date=...
   */
  @Get('slots')
  getSlots(
    @Query('club_id') clubId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    this.logger.log(`[Mock] getSlots: club=${clubId}, ${startDate} ~ ${endDate}`);

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 86400000);

    const slots: MockSlot[] = [];
    let slotCounter = 1;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      for (const course of this.COURSE_NAMES) {
        for (const time of this.TIME_SLOTS) {
          const booked = Math.floor(Math.random() * 5); // 0~4
          const maxPlayers = 4;
          const status = booked >= maxPlayers ? 'FULL' : 'OPEN';

          slots.push({
            slot_id: `SLOT-${String(slotCounter++).padStart(5, '0')}`,
            course_name: course,
            course_id: course === 'A+B코스' ? 'CRS-001' : 'CRS-002',
            date: dateStr,
            start_time: time.start,
            end_time: time.end,
            max_players: maxPlayers,
            booked_players: booked,
            status,
            price: 15000,
          });
        }
      }
    }

    this.logger.log(`[Mock] Returning ${slots.length} slots`);

    return {
      success: true,
      data: {
        slots,
      },
    };
  }

  /**
   * Mock 예약 조회
   * GET /mock/bookings?club_id=...&since=...
   */
  @Get('bookings')
  getBookings(
    @Query('club_id') clubId?: string,
    @Query('since') since?: string,
  ) {
    this.logger.log(`[Mock] getBookings: club=${clubId}, since=${since}`);

    const today = new Date().toISOString().split('T')[0];
    const bookings: MockBooking[] = [];

    for (let i = 1; i <= 5; i++) {
      const courseName = this.COURSE_NAMES[i % 2];
      const playerName = this.PLAYER_NAMES[i - 1];
      const time = this.TIME_SLOTS[i - 1];

      bookings.push({
        booking_id: `BK-${today.replace(/-/g, '')}-${String(i).padStart(3, '0')}`,
        course_name: courseName,
        course_id: courseName === 'A+B코스' ? 'CRS-001' : 'CRS-002',
        slot_id: `SLOT-${String(i).padStart(5, '0')}`,
        date: today,
        start_time: time.start,
        player_count: Math.floor(Math.random() * 3) + 2, // 2~4
        player_name: playerName,
        player_phone: `010-${String(1000 + i)}-${String(5000 + i)}`,
        status: 'CONFIRMED',
        paid_amount: 15000,
      });
    }

    this.logger.log(`[Mock] Returning ${bookings.length} bookings`);

    return {
      success: true,
      data: {
        bookings,
      },
    };
  }
}
