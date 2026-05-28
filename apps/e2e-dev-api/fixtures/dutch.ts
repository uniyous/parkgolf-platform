import { APIRequestContext, expect } from '@playwright/test';
import { authHeaders } from './auth';
import { createE2EUser, E2EUser } from './users';
import { makeE2ePaymentKey } from './toss';

/**
 * 더치페이 E2E 헬퍼 — production 코드 변경 없이 정공 흐름 시뮬레이션
 *
 * 흐름
 *   1. admin이 club + game + slot 셋업 (별도 헬퍼 또는 시드 spec)
 *   2. booker가 채팅방 생성 + N-1명 멤버 초대
 *   3. booker가 agent 3단계 호출
 *      a. selectedClubId          → handleDirectClubSelect (context 저장)
 *      b. selectedSlotId + teamMembers → handleDirectSlotSelect (context 저장)
 *      c. confirmBooking + paymentMethod=dutchpay → handleDirectBooking → saga
 *   4. saga의 PREPARE_SPLIT이 PaymentSplit N개 발급
 *      → broadcastSettlementCard로 채팅방에 메시지 publish
 *   5. 채팅방 메시지 조회 → AI_ASSISTANT senderId=0 + state='SETTLING' metadata에서
 *      participants[] (userId + orderId + amount) 추출
 *   6. 각 user가 split/confirm 호출 (paymentKey=e2e_test_*)
 *   7. booking 폴링 → CONFIRMED
 */

export interface DutchSplitInfo {
  userId: number;
  orderId: string;
  amount: number;
  status?: string;
}

export interface DutchSetupResult {
  booker: E2EUser;
  members: E2EUser[];                 // booker + others (총 N명)
  roomId: string;
  clubId: number;
  gameId: number;
  slotId: number;
  slotDate: string;
  slotTime: string;
  slotPrice: number;
}

const DEFAULT_PARTICIPANT_COUNT = 4;

/**
 * N명 user 동시 생성 + 채팅방 생성 + 멤버 초대
 */
export async function seedDutchTeam(
  request: APIRequestContext,
  count: number = DEFAULT_PARTICIPANT_COUNT,
): Promise<{ booker: E2EUser; members: E2EUser[]; roomId: string }> {
  // 4명 user 동시 생성 (throttler 429 백오프 내장)
  const users: E2EUser[] = [];
  for (let i = 0; i < count; i++) {
    users.push(await createE2EUser(request, `dch${i + 1}`));
  }
  const booker = users[0];
  const others = users.slice(1);

  // 채팅방 생성 (CHANNEL — 4명)
  const createRes = await request.post('/api/user/chat/rooms', {
    headers: authHeaders(booker.accessToken),
    data: {
      name: `E2E 더치페이 ${Date.now()}`,
      type: 'CHANNEL',
      participant_ids: [String(booker.userId)],
    },
  });
  expect(createRes.ok() || createRes.status() === 201, `room create [${createRes.status()}]`).toBeTruthy();
  const room = (await createRes.json())?.data ?? (await createRes.json());
  const roomId: string = room?.id ?? room?.roomId;
  expect(roomId, 'roomId missing').toBeTruthy();

  // 나머지 멤버 추가
  for (const u of others) {
    const addRes = await request.post(`/api/user/chat/rooms/${roomId}/members`, {
      headers: authHeaders(booker.accessToken),
      data: { user_ids: [String(u.userId)] },
    });
    expect(
      addRes.ok() || addRes.status() === 201 || addRes.status() === 409,
      `add member [${addRes.status()}]`,
    ).toBeTruthy();
  }

  return { booker, members: users, roomId };
}

/**
 * admin 토큰으로 club + game + 슬롯 셋업. 사용 가능한 slot 1건 반환.
 */
export async function seedAvailableSlot(
  request: APIRequestContext,
  adminToken: string,
): Promise<{ clubId: number; clubName: string; gameId: number; gameName: string; slotId: number; date: string; startTime: string; price: number }> {
  const adminAuth = authHeaders(adminToken);

  const clubsRes = await request.get('/api/admin/courses/clubs?page=1&limit=50', { headers: adminAuth });
  expect(clubsRes.ok()).toBeTruthy();
  const clubs = (await clubsRes.json())?.data?.items ?? (await clubsRes.json())?.data ?? [];

  let clubId: number | null = null;
  let clubName = '';
  let gameId: number | null = null;
  let gameName = '';
  for (let i = 0; i < Math.min(6, clubs.length); i++) {
    const c = clubs[Math.floor(Math.random() * clubs.length)];
    const cid = c?.id ?? c?.clubId;
    if (!cid) continue;
    const gr = await request.get(`/api/admin/games/club/${cid}`, { headers: adminAuth });
    if (!gr.ok()) continue;
    const games = (await gr.json())?.data ?? [];
    if (Array.isArray(games) && games.length > 0) {
      const g = games[Math.floor(Math.random() * games.length)];
      gameId = g.id ?? g.gameId;
      gameName = g.name ?? '';
      clubId = cid;
      clubName = c.name ?? '';
      if (gameId) break;
    }
  }
  expect(clubId, 'no club').toBeTruthy();
  expect(gameId, 'no game').toBeTruthy();

  // 내일 09:00 슬롯 보장
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const date = tomorrow.toISOString().slice(0, 10);
  const startTime = '09:00';
  const endTime = '11:00';
  const price = 40000;

  await request.post(`/api/admin/games/${gameId}/time-slots/bulk`, {
    headers: adminAuth,
    data: { timeSlots: [{ date, startTime, endTime, price, maxPlayers: 4 }] },
  });

  const slotsRes = await request.get(
    `/api/admin/games/${gameId}/time-slots?dateFrom=${date}&dateTo=${date}&page=1&limit=10`,
    { headers: adminAuth },
  );
  expect(slotsRes.ok()).toBeTruthy();
  const slotsBody = await slotsRes.json();
  const slotsData = slotsBody?.data ?? slotsBody;
  const slots = Array.isArray(slotsData) ? slotsData : slotsData?.items ?? [];
  const slot = slots.find(
    (s: any) => s.startTime === startTime && (s.bookedPlayers ?? 0) < (s.maxPlayers ?? 4),
  );
  expect(slot, 'no available slot').toBeTruthy();

  return { clubId: clubId!, clubName, gameId: gameId!, gameName, slotId: slot.id, date, startTime, price };
}

/**
 * agent 4단계 호출로 dutchpay booking 생성 트리거.
 *
 * production UI 흐름 그대로 (booking-agent.service.ts 분기 순서 준수):
 *   1) selectedClubId            → handleDirectClubSelect (clubId 저장 + SELECT_MEMBERS/SHOW_SLOTS)
 *   2) selectedSlotId            → handleDirectSlotSelect (slotId 저장 + SELECT_MEMBERS)
 *   3) teamMembers (slotId 있음) → groupMode=true 저장 + CONFIRM_BOOKING 카드
 *   4) confirmBooking + dutchpay → handleDirectBooking → saga 트리거 + broadcast settlement
 */
export async function triggerDutchBookingViaAgent(
  request: APIRequestContext,
  booker: E2EUser,
  members: E2EUser[],   // booker 포함 N명
  roomId: string,
  setup: { clubId: number; clubName: string; gameId: number; gameName: string; slotId: number; date: string; startTime: string; price: number },
): Promise<{ conversationId: string }> {
  const auth = authHeaders(booker.accessToken);

  const callAgent = async (
    label: string,
    body: Record<string, unknown>,
    conversationId?: string,
  ) => {
    const res = await request.post(`/api/user/chat/rooms/${roomId}/agent`, {
      headers: auth,
      data: conversationId ? { conversationId, ...body } : body,
    });
    const respBody = await res.json().catch(() => ({}));
    expect(
      res.ok(),
      `agent ${label} [${res.status()}]: ${JSON.stringify(respBody).slice(0, 300)}`,
    ).toBeTruthy();
    return respBody?.data ?? respBody;
  };

  // step 1: 골프장 선택 → 채팅방 그룹 게이트로 SELECT_MEMBERS 카드 우선
  const r1 = await callAgent('step1.selectedClubId', {
    message: '이 골프장으로 진행할게요',
    selectedClubId: String(setup.clubId),
    selectedClubName: setup.clubName,
  });
  const conversationId: string = r1?.conversationId;
  expect(conversationId, 'conversationId missing').toBeTruthy();

  // step 2: 팀멤버 선택 — 인원 확정 (가드 규칙: 멤버 확정 전엔 슬롯 선택 차단)
  const teamMembers = members.map((m) => ({
    userId: m.userId,
    userName: m.name,
    userEmail: m.email,
  }));
  await callAgent('step2.teamMembers', {
    message: '멤버 선택했어요',
    teamMembers,
  }, conversationId);

  // step 3: 슬롯 선택 (멤버 확정 후이므로 가드 통과)
  await callAgent('step3.selectedSlotId', {
    message: '이 시간으로 할게요',
    selectedSlotId: String(setup.slotId),
    selectedSlotTime: setup.startTime,
    selectedSlotPrice: setup.price,
    selectedGameName: setup.gameName,
  }, conversationId);

  // step 4: 예약 확정 + dutchpay
  await callAgent('step4.confirmBooking', {
    message: '더치페이로 예약 확정',
    confirmBooking: true,
    paymentMethod: 'dutchpay',
  }, conversationId);

  return { conversationId };
}

/**
 * 채팅방 메시지에서 settlement card 메시지(state=SETTLING, AI_ASSISTANT)를 찾아
 * participants[] (orderId + amount) 추출.
 */
export async function extractDutchSplits(
  request: APIRequestContext,
  user: E2EUser,
  roomId: string,
): Promise<DutchSplitInfo[]> {
  const res = await request.get(`/api/user/chat/rooms/${roomId}/messages?limit=20`, {
    headers: authHeaders(user.accessToken),
  });
  expect(res.ok(), `messages [${res.status()}]`).toBeTruthy();
  const body = await res.json();
  const data = body?.data ?? body;
  const items: any[] = data?.items ?? data?.messages ?? (Array.isArray(data) ? data : []);

  // 최신 → 과거 순서일 수 있으니 모두 훑어 'SETTLEMENT_STATUS' action 찾기
  for (const msg of items) {
    let meta: any = msg.metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch {
        continue;
      }
    }
    const actions = meta?.actions ?? [];
    for (const a of actions) {
      if (a?.type === 'SETTLEMENT_STATUS' && Array.isArray(a?.data?.participants)) {
        return (a.data.participants as any[]).map((p) => ({
          userId: p.userId,
          orderId: p.orderId,
          amount: p.amount,
          status: p.status,
        }));
      }
    }
  }
  return [];
}

/**
 * 각 user의 split/confirm을 순차 호출. paymentKey는 e2e_test_*로 토스 우회.
 */
export async function confirmAllDutchSplits(
  request: APIRequestContext,
  members: E2EUser[],
  splits: DutchSplitInfo[],
): Promise<void> {
  for (const member of members) {
    const split = splits.find((s) => s.userId === member.userId);
    if (!split) {
      throw new Error(`split not found for userId=${member.userId}`);
    }
    const key = makeE2ePaymentKey(split.orderId, split.amount);
    const res = await request.post('/api/user/payments/split/confirm', {
      headers: authHeaders(member.accessToken),
      data: {
        orderId: split.orderId,
        paymentKey: key.paymentKey,
        amount: split.amount,
      },
    });
    const body = await res.json().catch(() => ({}));
    expect(
      res.ok(),
      `split/confirm user=${member.userId} [${res.status()}]: ${JSON.stringify(body).slice(0, 200)}`,
    ).toBeTruthy();
  }
}
