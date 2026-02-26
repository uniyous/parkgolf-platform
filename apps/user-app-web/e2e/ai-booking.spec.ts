import { test, expect, type Page } from '@playwright/test';

/**
 * AI 예약 도우미 E2E 테스트 — 10개 시나리오
 *
 * 채팅방에서 AI 에이전트를 통한 예약 플로우 전체 검증
 * AI 응답은 비결정적이므로 구조(카드 렌더링) 위주 검증, exact text match 회피
 *
 * 실행:
 *   npx playwright test e2e/ai-booking.spec.ts --headed
 *   npx playwright test e2e/ai-booking.spec.ts -g "시나리오 1"
 */

// ════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════

/** 채팅 탭 이동 */
async function gotoChatTab(page: Page) {
  await page.goto('/social?tab=chat');
  await page.waitForTimeout(2000);

  const chatTab = page.getByRole('button', { name: '채팅', exact: true });
  if (await chatTab.isVisible()) {
    await chatTab.click();
    await page.waitForTimeout(1000);
  }
}

/** 첫 번째 채팅방 입장 → roomId 반환 */
async function enterFirstChatRoom(page: Page): Promise<string | null> {
  await gotoChatTab(page);

  const cards = page.locator('button.w-full.text-left:has(.glass-card)');
  const count = await cards.count();
  if (count === 0) return null;

  await cards.first().click();
  await expect(page).toHaveURL(/\/chat\//, { timeout: 15000 });
  await page.waitForTimeout(2000);

  const url = page.url();
  const match = url.match(/\/chat\/([^/?]+)/);
  return match ? match[1] : null;
}

/** AI 모드 활성화 */
async function activateAiMode(page: Page) {
  const aiButton = page.locator('button[title="AI 예약 도우미"]');
  await expect(aiButton).toBeVisible({ timeout: 10000 });
  await aiButton.click();
  await page.waitForTimeout(500);
  await expect(page.getByPlaceholder('AI에게 예약 요청하기...')).toBeVisible();
}

/** AI 모드 비활성화 */
async function deactivateAiMode(page: Page) {
  const aiButton = page.locator('button[title="AI 모드 끄기"]');
  await expect(aiButton).toBeVisible({ timeout: 5000 });
  await aiButton.click();
  await page.waitForTimeout(500);
  await expect(page.getByPlaceholder('메시지 입력...')).toBeVisible();
}

/** 전송 버튼 locator */
function sendButton(page: Page) {
  return page.locator('button.rounded-full').filter({
    has: page.locator('svg.lucide-send, svg.lucide-loader-2'),
  });
}

/** AI 메시지 전송 후 응답 대기 (최대 60초) */
async function sendAiMessageAndWait(page: Page, message: string) {
  const input = page.getByPlaceholder('AI에게 예약 요청하기...');
  await input.fill(message);
  await sendButton(page).click();

  // 사용자 메시지 버블 표시
  await expect(page.getByText(message)).toBeVisible({ timeout: 10000 });

  // AI 타이핑 인디케이터 표시 → 소멸 대기
  const typing = page.locator('.animate-bounce').first();
  await expect(typing).toBeVisible({ timeout: 10000 });
  await expect(typing).not.toBeVisible({ timeout: 60000 });

  // 렌더링 완료 대기
  await page.waitForTimeout(500);
}

/** AI 응답만 대기 (이미 전송된 상태) */
async function waitForAiResponse(page: Page) {
  const typing = page.locator('.animate-bounce').first();
  if (await typing.isVisible({ timeout: 5000 }).catch(() => false)) {
    await expect(typing).not.toBeVisible({ timeout: 60000 });
  }
  await page.waitForTimeout(500);
}

/** "AI 예약 도우미" 라벨 개수 */
async function countAiLabels(page: Page): Promise<number> {
  return page.getByText('AI 예약 도우미', { exact: true }).count();
}

// ════════════════════════════════════════════════
// 시나리오 1: AI 모드 진입/해제 UI
// ════════════════════════════════════════════════

test.describe('시나리오 1: AI 모드 진입/해제 UI', () => {
  test('AI 버튼 비활성 상태 확인', async ({ page }) => {
    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    // 1. AI 버튼 표시 (비활성)
    const aiBtn = page.locator('button[title="AI 예약 도우미"]');
    await expect(aiBtn).toBeVisible({ timeout: 10000 });

    // 2. Bot 아이콘 존재
    await expect(aiBtn.locator('svg.lucide-bot')).toBeVisible();

    // 3. 비활성 스타일 확인 (border-transparent)
    const cls = await aiBtn.getAttribute('class');
    expect(cls).toContain('border-transparent');

    // 4. 일반 모드 placeholder
    await expect(page.getByPlaceholder('메시지 입력...')).toBeVisible();
  });

  test('AI 모드 활성화 → UI 변경', async ({ page }) => {
    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    // AI 버튼 클릭
    await page.locator('button[title="AI 예약 도우미"]').click();
    await page.waitForTimeout(500);

    // 1. placeholder 변경
    await expect(page.getByPlaceholder('AI에게 예약 요청하기...')).toBeVisible();

    // 2. input border emerald 색상
    const inputCls = await page.getByPlaceholder('AI에게 예약 요청하기...').getAttribute('class');
    expect(inputCls).toContain('border-emerald');

    // 3. 버튼 title 변경
    const aiBtn = page.locator('button[title="AI 모드 끄기"]');
    await expect(aiBtn).toBeVisible();

    // 4. 버튼 활성 스타일 (bg-emerald, border-emerald, text-emerald)
    const btnCls = await aiBtn.getAttribute('class');
    expect(btnCls).toContain('bg-emerald');
    expect(btnCls).toContain('border-emerald');
    expect(btnCls).toContain('text-emerald');
  });

  test('AI 모드 비활성화 → UI 원복', async ({ page }) => {
    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    // 활성화
    await activateAiMode(page);

    // 비활성화
    await deactivateAiMode(page);

    // 1. placeholder 원복
    await expect(page.getByPlaceholder('메시지 입력...')).toBeVisible();

    // 2. AI 버튼 title 원복
    await expect(page.locator('button[title="AI 예약 도우미"]')).toBeVisible();

    // 3. input border 원복 (emerald 제거)
    const inputCls = await page.getByPlaceholder('메시지 입력...').getAttribute('class');
    expect(inputCls).not.toContain('border-emerald-500/50');
  });
});

// ════════════════════════════════════════════════
// 시나리오 2: 빈 메시지 전송 방지 & 전송 버튼 상태
// ════════════════════════════════════════════════

test.describe('시나리오 2: 빈 메시지 전송 방지', () => {
  test('빈 입력 시 전송 버튼 disabled', async ({ page }) => {
    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);

    // 1. 빈 입력 → disabled
    await expect(sendButton(page)).toBeDisabled();

    // 2. disabled 스타일 (bg-white/10)
    const cls = await sendButton(page).getAttribute('class');
    expect(cls).toContain('bg-white/10');
  });

  test('텍스트 입력 시 전송 버튼 enabled', async ({ page }) => {
    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);
    const input = page.getByPlaceholder('AI에게 예약 요청하기...');

    // 1. 텍스트 입력 → enabled
    await input.fill('테스트');
    await expect(sendButton(page)).toBeEnabled();

    // 2. enabled 스타일 (bg-emerald-500)
    const cls = await sendButton(page).getAttribute('class');
    expect(cls).toContain('bg-emerald-500');
  });

  test('텍스트 삭제/공백만 입력 시 다시 disabled', async ({ page }) => {
    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);
    const input = page.getByPlaceholder('AI에게 예약 요청하기...');

    // 1. 입력 후 삭제 → disabled
    await input.fill('테스트');
    await expect(sendButton(page)).toBeEnabled();
    await input.fill('');
    await expect(sendButton(page)).toBeDisabled();

    // 2. 공백만 입력 → disabled (.trim() 로직)
    await input.fill('   ');
    await expect(sendButton(page)).toBeDisabled();
  });
});

// ════════════════════════════════════════════════
// 시나리오 3: AI 메시지 전송 → 응답 수신 기본 플로우
// ════════════════════════════════════════════════

test.describe('시나리오 3: AI 메시지 전송/응답 기본 플로우', () => {
  test('사용자 메시지 버블 + AI 타이핑 + AI 응답 전체 플로우', async ({ page }) => {
    test.slow();

    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);

    const input = page.getByPlaceholder('AI에게 예약 요청하기...');
    const testMsg = `E2E-기본플로우-${Date.now()}`;
    await input.fill(testMsg);

    // 1. 전송 버튼 클릭
    await sendButton(page).click();

    // 2. input 비워짐
    await expect(input).toHaveValue('');

    // 3. 사용자 메시지 버블 즉시 표시
    await expect(page.getByText(testMsg)).toBeVisible({ timeout: 10000 });

    // 4. AI 타이핑 인디케이터 — Bot 아이콘 + "AI 예약 도우미" + bounce dots
    const typingArea = page.locator('.animate-bounce').first();
    await expect(typingArea).toBeVisible({ timeout: 10000 });

    // 5. 타이핑 중 전송 버튼에 Loader2 spinner
    const spinner = page.locator('svg.lucide-loader-2');
    await expect(spinner).toBeVisible({ timeout: 5000 });

    // 6. AI 응답 대기 (타이핑 소멸)
    await expect(typingArea).not.toBeVisible({ timeout: 60000 });

    // 7. AI 메시지 버블 렌더링 — "AI 예약 도우미" 라벨
    expect(await countAiLabels(page)).toBeGreaterThanOrEqual(1);

    // 8. 전송 버튼 Send 아이콘 복원
    await expect(page.locator('svg.lucide-loader-2')).not.toBeVisible({ timeout: 5000 });
  });
});

// ════════════════════════════════════════════════
// 시나리오 4: 골프장 검색 — SHOW_CLUBS
// ════════════════════════════════════════════════

test.describe('시나리오 4: 골프장 검색 (SHOW_CLUBS)', () => {
  test('지역 검색 → ClubCard 렌더링 검증', async ({ page }) => {
    test.slow();

    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);
    await sendAiMessageAndWait(page, '천안에서 골프치고 싶어요');

    // 1. AI 메시지 라벨 확인
    expect(await countAiLabels(page)).toBeGreaterThanOrEqual(1);

    // 2. ClubCard 존재 확인 ("선택하기" 버튼)
    const selectBtns = page.getByText('선택하기');
    const hasClubs = await selectBtns.first().isVisible({ timeout: 10000 }).catch(() => false);

    if (hasClubs) {
      // 3. 골프장 카드 영역 (bg-white/5 rounded-xl)
      const clubCards = page.locator('.bg-white\\/5.rounded-xl.border');
      const cardCount = await clubCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // 4. 골프장 이름 (h4)
      const firstName = await clubCards.first().locator('h4').textContent();
      expect(firstName).toBeTruthy();

      // 5. 주소 — MapPin 아이콘 옆 텍스트
      const addressEl = clubCards.first().locator('svg.lucide-map-pin');
      await expect(addressEl).toBeVisible();

      // 6. "선택하기" 버튼 emerald 스타일
      const btnCls = await selectBtns.first().getAttribute('class');
      expect(btnCls).toContain('emerald');
    } else {
      // AI가 골프장을 못 찾은 경우 — AI 텍스트 응답만 확인
      const aiBubble = page.locator('.bg-white\\/10.rounded-2xl');
      expect(await aiBubble.count()).toBeGreaterThan(0);
    }
  });
});

// ════════════════════════════════════════════════
// 시나리오 5: 골프장 선택 → 슬롯/날씨 조회
// ════════════════════════════════════════════════

test.describe('시나리오 5: 골프장 선택 → 슬롯/날씨 조회', () => {
  test('"선택하기" 클릭 → follow-up → SlotCard/WeatherCard', async ({ page }) => {
    test.slow();

    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);
    await sendAiMessageAndWait(page, '천안에서 이번 주 골프 예약하고 싶어요');

    // ClubCard 대기
    const selectBtn = page.getByText('선택하기').first();
    const hasClubs = await selectBtn.isVisible({ timeout: 10000 }).catch(() => false);
    test.skip(!hasClubs, 'AI가 골프장을 반환하지 않음');

    // 1. 첫 번째 골프장 이름 추출
    const clubNameEl = page.locator('.bg-white\\/5.rounded-xl h4').first();
    const clubName = await clubNameEl.textContent();
    expect(clubName).toBeTruthy();

    // 2. "선택하기" 클릭
    await selectBtn.click();

    // 3. 자동 follow-up 메시지 확인
    if (clubName) {
      await expect(
        page.getByText(`${clubName}(으)로 선택할게요`),
      ).toBeVisible({ timeout: 10000 });
    }

    // 4. AI 응답 대기
    await waitForAiResponse(page);

    // 5. SlotCard 또는 WeatherCard 렌더링 확인
    const slotCards = page.locator('.grid.grid-cols-2 button');
    const weatherIcon = page.locator('svg.lucide-thermometer');

    const hasSlots = await slotCards.first().isVisible({ timeout: 10000 }).catch(() => false);
    const hasWeather = await weatherIcon.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasSlots || hasWeather).toBeTruthy();

    // 5-A. SlotCard 세부 검증
    if (hasSlots) {
      const firstSlot = slotCards.first();

      // 시간 (Clock 아이콘 + HH:MM)
      await expect(firstSlot.locator('svg.lucide-clock')).toBeVisible();
      const timeText = await firstSlot.locator('.text-sm.font-semibold').textContent();
      expect(timeText).toMatch(/\d{1,2}:\d{2}/);

      // 코스명
      const courseName = await firstSlot.locator('.text-white\\/60').first().textContent();
      expect(courseName).toBeTruthy();

      // 가격 (₩ + 숫자)
      const priceText = await firstSlot.locator('.text-emerald-400').textContent();
      expect(priceText).toContain('₩');
    }

    // 5-B. WeatherCard 세부 검증
    if (hasWeather) {
      // 온도 (°C)
      const tempText = page.locator('text=/\\d+°C/');
      await expect(tempText.first()).toBeVisible({ timeout: 5000 });

      // 하늘 상태 아이콘 (Sun/Cloud/CloudRain 중 하나)
      const skyIcons = page.locator(
        'svg.lucide-sun, svg.lucide-cloud, svg.lucide-cloud-rain',
      );
      expect(await skyIcons.count()).toBeGreaterThan(0);
    }
  });
});

// ════════════════════════════════════════════════
// 시나리오 6: 시간 슬롯 선택 → 예약 확인 요청
// ════════════════════════════════════════════════

test.describe('시나리오 6: 시간 슬롯 선택 → 예약 확인 요청', () => {
  test('슬롯 클릭 → follow-up → AI 확인 요청 메시지', async ({ page }) => {
    test.slow();

    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);
    await sendAiMessageAndWait(page, '천안에서 내일 골프 예약해주세요');

    // ClubCard → 선택
    const selectBtn = page.getByText('선택하기').first();
    const hasClubs = await selectBtn.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasClubs) {
      await selectBtn.click();
      await waitForAiResponse(page);
    }

    // SlotCard 확인
    const slotButtons = page.locator('.grid.grid-cols-2 button');
    const hasSlots = await slotButtons.first().isVisible({ timeout: 10000 }).catch(() => false);
    test.skip(!hasSlots, 'AI가 시간 슬롯을 반환하지 않음');

    // 1. 첫 번째 슬롯 시간 추출
    const timeEl = slotButtons.first().locator('.text-sm.font-semibold');
    const slotTime = await timeEl.textContent();
    expect(slotTime).toBeTruthy();

    // 2. 슬롯 클릭
    await slotButtons.first().click();

    // 3. 자동 follow-up 메시지
    if (slotTime) {
      await expect(
        page.getByText(`${slotTime} 시간으로 예약해주세요`),
      ).toBeVisible({ timeout: 10000 });
    }

    // 4. AI 응답 대기
    await waitForAiResponse(page);

    // 5. AI 메시지 2개 이상 누적 (검색 응답 + 확인 요청)
    expect(await countAiLabels(page)).toBeGreaterThanOrEqual(2);
  });
});

// ════════════════════════════════════════════════
// 시나리오 7: 예약 확인 → BOOKING_COMPLETE 카드
// ════════════════════════════════════════════════

test.describe('시나리오 7: 예약 확인 → BOOKING_COMPLETE', () => {
  test('확인 메시지 전송 → BookingCompleteCard 렌더링', async ({ page }) => {
    test.slow();

    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);

    // 전체 플로우: 검색 → 골프장 선택 → 슬롯 선택 → 확인
    await sendAiMessageAndWait(page, '천안에서 내일 골프 예약하고 싶어요');

    // ClubCard 선택
    const selectBtn = page.getByText('선택하기').first();
    if (await selectBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await selectBtn.click();
      await waitForAiResponse(page);
    }

    // SlotCard 선택
    const slotBtn = page.locator('.grid.grid-cols-2 button').first();
    if (await slotBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await slotBtn.click();
      await waitForAiResponse(page);
    }

    // 예약 확인 메시지
    await sendAiMessageAndWait(page, '네, 예약해주세요');

    // BookingCompleteCard 확인
    const completeCard = page.locator('.bg-emerald-500\\/10');
    const hasComplete = await completeCard.isVisible({ timeout: 15000 }).catch(() => false);

    if (hasComplete) {
      // 1. "예약 완료" 헤더 + CheckCircle 아이콘
      await expect(page.getByText('예약 완료')).toBeVisible();
      await expect(completeCard.locator('svg.lucide-check-circle')).toBeVisible();

      // 2. 예약번호 (font-mono)
      const confNum = completeCard.locator('.font-mono');
      expect(await confNum.count()).toBeGreaterThan(0);
      const confText = await confNum.first().textContent();
      expect(confText).toBeTruthy();

      // 3. 날짜/시간 (Calendar 아이콘)
      await expect(completeCard.locator('svg.lucide-calendar')).toBeVisible();

      // 4. 인원 (Users 아이콘 + N명)
      await expect(completeCard.locator('svg.lucide-users')).toBeVisible();
      const playerText = page.locator('text=/\\d+명/');
      await expect(playerText.first()).toBeVisible({ timeout: 5000 });

      // 5. 금액 (Banknote 아이콘 + ₩)
      await expect(completeCard.locator('svg.lucide-banknote')).toBeVisible();
      const priceText = page.locator('text=/₩[\\d,]+/');
      await expect(priceText.first()).toBeVisible({ timeout: 5000 });
    } else {
      // AI가 추가 확인을 요청하거나 예약 실패 — AI 응답 존재만 확인
      expect(await countAiLabels(page)).toBeGreaterThanOrEqual(1);
    }
  });
});

// ════════════════════════════════════════════════
// 시나리오 8: 멀티턴 대화 — conversationId 유지
// ════════════════════════════════════════════════

test.describe('시나리오 8: conversationId 유지', () => {
  test('첫 요청 conversationId 없음 → 응답에서 수신 → 두 번째 요청에 포함', async ({ page }) => {
    test.slow();

    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);

    let firstConversationId: string | null = null;
    let firstRequestConversationId: string | undefined = undefined;
    let secondRequestConversationId: string | undefined = undefined;
    let requestCount = 0;

    // Request intercept — conversationId 추적
    page.on('request', (request) => {
      if (request.url().includes('/agent') && request.method() === 'POST') {
        requestCount++;
        try {
          const body = request.postDataJSON();
          if (requestCount === 1) {
            firstRequestConversationId = body?.conversationId;
          } else if (requestCount === 2) {
            secondRequestConversationId = body?.conversationId;
          }
        } catch { /* 무시 */ }
      }
    });

    // Response intercept — conversationId 추출
    page.on('response', async (response) => {
      if (response.url().includes('/agent') && response.status() === 200) {
        try {
          const json = await response.json();
          const convId = json.data?.conversationId || json.conversationId;
          if (convId && !firstConversationId) {
            firstConversationId = convId;
          }
        } catch { /* 무시 */ }
      }
    });

    // 1. 첫 메시지 전송
    await sendAiMessageAndWait(page, '안녕하세요');

    // 2. 첫 요청에 conversationId 없음 (또는 undefined)
    expect(firstRequestConversationId).toBeFalsy();

    // 3. 응답에서 conversationId 수신
    expect(firstConversationId).toBeTruthy();

    // 4. 두 번째 메시지 전송
    await sendAiMessageAndWait(page, '골프장 추천해주세요');

    // 5. 두 번째 요청에 conversationId 포함
    expect(secondRequestConversationId).toBeTruthy();

    // 6. 값 일치 확인
    expect(secondRequestConversationId).toBe(firstConversationId);
  });
});

// ════════════════════════════════════════════════
// 시나리오 9: API 에러 처리
// ════════════════════════════════════════════════

test.describe('시나리오 9: API 에러 처리', () => {
  test('500 에러 → 토스트 + 입력 복원', async ({ page }) => {
    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);

    // 1. AI endpoint를 500으로 mock
    await page.route('**/api/user/chat/rooms/*/agent', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'SYS_001', message: '서버 오류' },
        }),
      }),
    );

    const input = page.getByPlaceholder('AI에게 예약 요청하기...');
    await input.fill('테스트 메시지');

    // 2. 전송
    await sendButton(page).click();

    // 3. 에러 토스트 표시 ("AI 응답에 실패했습니다.")
    await expect(
      page.getByText('AI 응답에 실패했습니다.'),
    ).toBeVisible({ timeout: 10000 });

    // 4. 입력 내용 복원 (catch에서 setInputText(text))
    await expect(input).toHaveValue('테스트 메시지', { timeout: 5000 });
  });

  test('mock 해제 후 정상 복구', async ({ page }) => {
    test.slow();

    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);

    // mock 설정
    await page.route('**/api/user/chat/rooms/*/agent', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'SYS_001', message: '서버 오류' },
        }),
      }),
    );

    const input = page.getByPlaceholder('AI에게 예약 요청하기...');
    await input.fill('에러 테스트');
    await sendButton(page).click();

    // 에러 토스트 확인
    await expect(
      page.getByText('AI 응답에 실패했습니다.'),
    ).toBeVisible({ timeout: 10000 });

    // mock 해제
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    // 토스트 사라질 때까지 대기 (sonner duration 3000ms)
    await page.waitForTimeout(4000);

    // 정상 메시지 전송 → AI 응답 수신
    await sendAiMessageAndWait(page, '안녕하세요');

    // AI 응답이 정상적으로 왔는지 확인
    expect(await countAiLabels(page)).toBeGreaterThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════
// 시나리오 10: follow-up 에러 처리 (카드 인터랙션 실패)
// ════════════════════════════════════════════════

test.describe('시나리오 10: follow-up 에러 처리', () => {
  test('ClubCard 표시 후 mock → "선택하기" 클릭 → 에러 토스트 + 카드 유지', async ({ page }) => {
    test.slow();

    const roomId = await enterFirstChatRoom(page);
    test.skip(!roomId, '채팅방이 없습니다');

    await activateAiMode(page);
    await sendAiMessageAndWait(page, '천안에서 골프치고 싶어요');

    // ClubCard 대기
    const selectBtn = page.getByText('선택하기').first();
    const hasClubs = await selectBtn.isVisible({ timeout: 10000 }).catch(() => false);
    test.skip(!hasClubs, 'AI가 골프장을 반환하지 않음');

    // 카드 개수 기록
    const clubCards = page.locator('.bg-white\\/5.rounded-xl.border');
    const cardCountBefore = await clubCards.count();

    // AI endpoint를 500으로 mock (follow-up 요청 실패)
    await page.route('**/api/user/chat/rooms/*/agent', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'SYS_001', message: '서버 오류' },
        }),
      }),
    );

    // "선택하기" 클릭 (handleAiFollowUp 호출)
    await selectBtn.click();

    // 1. 에러 토스트 표시
    await expect(
      page.getByText('AI 응답에 실패했습니다.'),
    ).toBeVisible({ timeout: 10000 });

    // 2. 이전 ClubCard가 여전히 화면에 보임
    const cardCountAfter = await clubCards.count();
    expect(cardCountAfter).toBe(cardCountBefore);

    // 3. "선택하기" 버튼 여전히 존재
    await expect(selectBtn).toBeVisible();

    // cleanup
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});
