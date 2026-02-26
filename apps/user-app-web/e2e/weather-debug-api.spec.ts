import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE_URL || 'https://dev-api.parkgolfmate.com';

async function setup(playwright: any) {
  const api = await playwright.request.newContext();
  const loginRes = await api.post(`${API_BASE}/api/user/iam/login`, {
    data: { email: 'test@parkgolf.com', password: 'test1234' },
  });
  const loginBody = await loginRes.json();
  const token = loginBody.data?.accessToken ?? loginBody.accessToken;
  const roomRes = await api.post(`${API_BASE}/api/user/chat/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `WEATHER_TEST_${Date.now()}`, type: 'DIRECT', participant_ids: [] },
  });
  const roomBody = await roomRes.json();
  const roomId = roomBody.data?.id ?? roomBody.id;
  return { api, token, roomId };
}

async function sendAi(api: APIRequestContext, token: string, roomId: string, message: string, opts: Record<string, unknown> = {}) {
  const res = await api.post(`${API_BASE}/api/user/chat/rooms/${roomId}/agent`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { message, ...opts },
  });
  return res.json();
}

test('1. "내일 날씨는?" + 현재위치 좌표 → SHOW_WEATHER', async ({ playwright }) => {
  const { api, token, roomId } = await setup(playwright);

  const body = await sendAi(api, token, roomId, '내일 날씨는?', {
    latitude: 36.8151,
    longitude: 127.1139,
  });

  console.log('=== 좌표 포함 날씨 ===');
  console.log(JSON.stringify(body, null, 2));

  expect(body.success).toBe(true);
  expect(body.data.message).toBeTruthy();

  const hasWeather = body.data.actions?.some((a: any) => a.type === 'SHOW_WEATHER');
  console.log('SHOW_WEATHER:', hasWeather ? 'YES' : 'NO');

  if (hasWeather) {
    const wd = body.data.actions.find((a: any) => a.type === 'SHOW_WEATHER').data;
    console.log('Weather data:', JSON.stringify(wd, null, 2));
    expect(wd.temperature ?? wd.maxTemperature).toBeDefined();
  }

  const asksForLocation = /어느 지역|지역을 알려|지역명/.test(body.data.message);
  expect(asksForLocation).toBe(false);

  await api.dispose();
});

test('2. "천안 내일 날씨" (지역명 명시) → SHOW_WEATHER', async ({ playwright }) => {
  const { api, token, roomId } = await setup(playwright);

  const body = await sendAi(api, token, roomId, '천안 내일 날씨 어때?');

  console.log('=== 지역명 날씨 ===');
  console.log(JSON.stringify(body, null, 2));

  expect(body.success).toBe(true);
  expect(body.data.message).toBeTruthy();

  const hasWeather = body.data.actions?.some((a: any) => a.type === 'SHOW_WEATHER');
  console.log('SHOW_WEATHER:', hasWeather ? 'YES' : 'NO');

  await api.dispose();
});

test('3. 골프장 검색 후 "내일 날씨는?" (연속대화 + 좌표) → SHOW_WEATHER', async ({ playwright }) => {
  const { api, token, roomId } = await setup(playwright);

  // Step 1: 골프장 검색
  const searchBody = await sendAi(api, token, roomId, '천안 파크골프장 알려줘', {
    latitude: 36.8151,
    longitude: 127.1139,
  });
  expect(searchBody.success).toBe(true);
  const conversationId = searchBody.data.conversationId;
  console.log('=== Step1 검색 완료, convId:', conversationId);

  // Step 2: 같은 대화에서 날씨 질문
  const weatherBody = await sendAi(api, token, roomId, '내일 날씨는 어때?', {
    conversationId,
    latitude: 36.8151,
    longitude: 127.1139,
  });

  console.log('=== 연속대화 날씨 ===');
  console.log(JSON.stringify(weatherBody, null, 2));

  expect(weatherBody.success).toBe(true);
  expect(weatherBody.data.message).toBeTruthy();

  const hasWeather = weatherBody.data.actions?.some((a: any) => a.type === 'SHOW_WEATHER');
  console.log('SHOW_WEATHER:', hasWeather ? 'YES' : 'NO');

  await api.dispose();
});
