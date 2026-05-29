import { of } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { BookingTools } from './booking.tools';

/**
 * UNI-32 (P1) — 결정적 멱등키 회귀 검증.
 * 동일 예약 의도(슬롯·사용자·인원·결제수단)는 재시도 시 같은 idempotencyKey여야
 * saga-service가 중복 제거 → 이중 예약 방지.
 */
describe('BookingTools — deterministic idempotencyKey (UNI-32)', () => {
  let tools: BookingTools;
  let bookingSend: jest.Mock;
  let courseClient: ClientProxy;
  let bookingClient: ClientProxy;

  // saga.booking.create 호출 시 캡처된 payload들
  const sagaPayloads: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    sagaPayloads.length = 0;

    bookingSend = jest.fn((pattern: string, payload: Record<string, unknown>) => {
      if (pattern === 'saga.booking.create') {
        sagaPayloads.push(payload);
        return of({
          success: true,
          data: { bookingId: 1, bookingNumber: 'BK-1', startTime: '09:00' },
          saga: { status: 'COMPLETED' },
        });
      }
      if (pattern === 'booking.findById') {
        // 폴링 즉시 CONFIRMED → waitForSagaCompletion 빠르게 종료
        return of({ success: true, data: { status: 'CONFIRMED' } });
      }
      return of(null);
    });

    courseClient = { send: jest.fn(() => of(null)) } as unknown as ClientProxy;
    bookingClient = { send: bookingSend } as unknown as ClientProxy;
    tools = new BookingTools(courseClient, bookingClient);
  });

  const baseArgs = {
    gameTimeSlotId: 42,
    playerCount: 4,
    userId: 7,
    userName: 'tester',
    userEmail: 't@e.com',
    paymentMethod: 'onsite',
  };

  it('같은 예약 의도를 2회 호출하면 동일한 idempotencyKey를 보낸다', async () => {
    await tools.createBooking({ ...baseArgs });
    await tools.createBooking({ ...baseArgs });

    expect(sagaPayloads).toHaveLength(2);
    expect(sagaPayloads[0].idempotencyKey).toBe(sagaPayloads[1].idempotencyKey);
    expect(typeof sagaPayloads[0].idempotencyKey).toBe('string');
    expect((sagaPayloads[0].idempotencyKey as string).length).toBeGreaterThan(0);
  });

  it('인원수가 다르면 다른 idempotencyKey를 보낸다', async () => {
    await tools.createBooking({ ...baseArgs, playerCount: 4 });
    await tools.createBooking({ ...baseArgs, playerCount: 2 });

    expect(sagaPayloads[0].idempotencyKey).not.toBe(sagaPayloads[1].idempotencyKey);
  });

  it('결제수단이 다르면 다른 idempotencyKey를 보낸다', async () => {
    await tools.createBooking({ ...baseArgs, paymentMethod: 'onsite' });
    await tools.createBooking({ ...baseArgs, paymentMethod: 'card' });

    expect(sagaPayloads[0].idempotencyKey).not.toBe(sagaPayloads[1].idempotencyKey);
  });
});
