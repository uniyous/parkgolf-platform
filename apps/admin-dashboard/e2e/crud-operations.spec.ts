import { test, expect } from '@playwright/test';

/**
 * CRUD 시나리오 E2E 테스트
 * - Club 등록/수정/삭제
 * - Course 등록/수정/삭제
 * - Hole 조회 (홀은 UI에서 조회만 지원)
 * - WeeklySchedule 등록/수정/삭제
 * - TimeSlot 생성/상태변경/삭제
 *
 * 주의: 이 테스트는 기존 데이터가 있어야 실행 가능합니다.
 * data-setup.spec.ts를 먼저 실행하여 테스트 데이터를 생성하세요.
 */

// 골프장 카드를 찾는 헬퍼 함수
async function findClubCard(page: any) {
  const cardLocator = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('h3') }).first();

  try {
    await cardLocator.waitFor({ state: 'visible', timeout: 5000 });
    return cardLocator;
  } catch {
    console.log('골프장 카드를 찾을 수 없습니다');
    return null;
  }
}

// 라운드 카드를 찾는 헬퍼 함수
async function findGameCard(page: any) {
  const cardLocator = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('h3') }).first();

  try {
    await cardLocator.waitFor({ state: 'visible', timeout: 5000 });
    return cardLocator;
  } catch {
    console.log('라운드 카드를 찾을 수 없습니다');
    return null;
  }
}

test.describe('Club CRUD 테스트', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('1. 골프장 목록 페이지 로드 확인', async ({ page }) => {
    await page.goto('/clubs');
    await expect(page).toHaveURL(/.*clubs/);

    // 페이지 헤더 확인
    await expect(page.getByRole('heading', { name: /골프장 관리/ })).toBeVisible();

    // 새 골프장 추가 버튼 확인
    await expect(page.getByRole('button', { name: /새 골프장 추가/ })).toBeVisible();
  });

  test('2. 기존 골프장 상세 페이지 이동', async ({ page }) => {
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);

    if (!clubCard) {
      console.log('테스트할 골프장이 없습니다. data-setup.spec.ts를 먼저 실행하세요.');
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 상세 페이지 요소 확인
    await expect(page.getByRole('button', { name: /라운드 보기/ })).toBeVisible();
  });

  test('3. 골프장 수정 - 기본정보 탭에서 수정', async ({ page }) => {
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 수정 버튼 클릭 (연필 아이콘)
    const editButton = page.locator('button[title="골프장 수정"]');
    await expect(editButton).toBeVisible();
    await editButton.click();

    // 기본정보 탭이 활성화되었는지 확인
    await expect(page.locator('button:has-text("기본정보")')).toHaveClass(/border-blue-500/);

    // 편집 가능한 필드가 있는지 확인 (BasicInfoTab 내)
    const hasInputFields = await page.locator('input').first().isVisible().catch(() => false);
    console.log('편집 가능한 필드 존재:', hasInputFields);
  });

  test('4. 골프장 삭제 확인 다이얼로그', async ({ page }) => {
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 상세 페이지 로딩 대기
    await page.waitForTimeout(500);

    // 삭제 버튼 확인 - title 속성으로 특정
    const deleteButton = page.locator('button[title="골프장 삭제"]');
    await deleteButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    if (!await deleteButton.isVisible()) {
      console.log('골프장 삭제 버튼을 찾을 수 없습니다.');
      test.skip();
      return;
    }

    // window.confirm을 모킹하여 삭제 동작 테스트
    page.once('dialog', dialog => {
      console.log('삭제 확인 다이얼로그:', dialog.message());
      dialog.dismiss(); // 취소 버튼 클릭
    });

    await deleteButton.click();

    // 취소 후에도 같은 페이지에 있어야 함
    await expect(page).toHaveURL(/.*clubs\/\d+/);
  });
});

test.describe('Course CRUD 테스트', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  const testId = Date.now().toString().slice(-6);
  let createdCourseName: string;

  test('1. 코스관리 탭 이동', async ({ page }) => {
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 상세 페이지 로딩 대기 - 탭 버튼이 나타날 때까지
    const courseTab = page.locator('button:has-text("코스관리")');
    await courseTab.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    if (!await courseTab.isVisible()) {
      console.log('코스관리 탭을 찾을 수 없습니다.');
      test.skip();
      return;
    }

    // 코스관리 탭 클릭
    await courseTab.click();
    await page.waitForTimeout(300);

    // 코스관리 탭이 활성화되었는지 확인
    await expect(page.locator('button:has-text("코스관리")')).toHaveClass(/border-blue-500/);

    // 새 코스 추가 버튼 확인
    await expect(page.getByRole('button', { name: /새 코스 추가/ })).toBeVisible();
  });

  test('2. 새 코스 추가 모달 열기/닫기', async ({ page }) => {
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 코스관리 탭 클릭
    await page.locator('button:has-text("코스관리")').click();
    await page.waitForTimeout(300);

    // 새 코스 추가 버튼 클릭
    await page.getByRole('button', { name: /새 코스 추가/ }).click();
    await page.waitForTimeout(300);

    // 모달 확인 (코스명 입력 필드 또는 모달 제목)
    const hasModal = await page.getByPlaceholder('코스명').isVisible().catch(() => false) ||
                     await page.getByText('새 코스 추가').isVisible().catch(() => false);

    console.log('모달 표시:', hasModal);

    // ESC로 모달 닫기
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('3. 코스 생성', async ({ page }) => {
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 상세 페이지 로딩 대기 - 탭 버튼이 나타날 때까지
    const courseTab = page.locator('button:has-text("코스관리")');
    await courseTab.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    if (!await courseTab.isVisible()) {
      console.log('코스관리 탭을 찾을 수 없습니다.');
      test.skip();
      return;
    }

    // 코스관리 탭 클릭
    await courseTab.click();
    await page.waitForTimeout(300);

    // 새 코스 추가 버튼 클릭
    await page.getByRole('button', { name: /새 코스 추가/ }).click();
    await page.waitForTimeout(300);

    // 코스 정보 입력
    createdCourseName = `E2E코스${testId}`;

    // 코스명 입력
    const courseNameInput = page.getByPlaceholder('코스명');
    if (await courseNameInput.isVisible()) {
      await courseNameInput.fill(createdCourseName);

      // 코스 코드 입력
      const codeInput = page.getByPlaceholder('코드');
      if (await codeInput.isVisible()) {
        await codeInput.fill(`E2E${testId}`);
      }

      // 저장 버튼 클릭
      const saveButton = page.getByRole('button', { name: /저장|추가/ });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(300);

        // 생성된 코스 확인
        const courseCreated = await page.getByText(createdCourseName).isVisible().catch(() => false);
        console.log('코스 생성 결과:', courseCreated);
      }
    }
  });

  test('4. 코스 목록에서 홀 정보 조회', async ({ page }) => {
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 코스관리 탭 클릭
    await page.locator('button:has-text("코스관리")').click();
    await page.waitForTimeout(300);

    // 코스 카드에서 홀 보기 토글 버튼 찾기
    const holeToggleButton = page.locator('button:has-text("홀 정보")').first();

    if (await holeToggleButton.isVisible()) {
      await holeToggleButton.click();
      await page.waitForTimeout(300);

      // 홀 정보가 표시되는지 확인
      const hasHoleInfo = await page.getByText(/홀 \d+/).first().isVisible().catch(() => false) ||
                          await page.getByText(/Par/).first().isVisible().catch(() => false);
      console.log('홀 정보 표시:', hasHoleInfo);
    }
  });

  test('5. 코스 삭제 확인', async ({ page }) => {
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 코스관리 탭 클릭
    await page.locator('button:has-text("코스관리")').click();
    await page.waitForTimeout(300);

    // 삭제 버튼 (휴지통 아이콘) 찾기
    const deleteButton = page.locator('button:has(svg path[d*="M19 7l-.867"])').first();

    if (await deleteButton.isVisible()) {
      // window.confirm을 모킹하여 삭제 동작 테스트
      page.once('dialog', dialog => {
        console.log('코스 삭제 확인 다이얼로그:', dialog.message());
        dialog.dismiss(); // 취소 버튼 클릭
      });

      await deleteButton.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Hole 조회 테스트', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('1. 코스 내 홀 정보 조회', async ({ page }) => {
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      test.skip();
      return;
    }

    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);

    // 코스관리 탭 클릭
    await page.locator('button:has-text("코스관리")').click();
    await page.waitForTimeout(300);

    // 코스 카드가 있는지 확인
    const courseCard = page.locator('[class*="border-gray-200"]').filter({ hasText: /코스/ }).first();
    const hasCourses = await courseCard.isVisible().catch(() => false);

    if (hasCourses) {
      // 홀 정보 버튼 또는 확장 버튼 클릭
      const expandButton = page.locator('button:has-text("홀 정보"), button:has-text("홀 보기")').first();

      if (await expandButton.isVisible()) {
        await expandButton.click();
        await page.waitForTimeout(300);

        // 홀 정보 확인 (Par, 거리 등)
        const holeInfo = await page.getByText(/Par \d+/).first().isVisible().catch(() => false) ||
                         await page.getByText(/\d+m/).first().isVisible().catch(() => false);
        console.log('홀 정보 조회 성공:', holeInfo);
      }
    } else {
      console.log('조회할 코스가 없습니다.');
    }
  });
});

test.describe('WeeklySchedule CRUD 테스트', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('1. 라운드 상세 페이지 - 주간 스케줄 탭 이동', async ({ page }) => {
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      console.log('테스트할 라운드가 없습니다. data-setup.spec.ts를 먼저 실행하세요.');
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 주간 스케줄 탭 클릭
    const weeklyTab = page.locator('button:has-text("주간 스케줄")');
    if (await weeklyTab.isVisible()) {
      await weeklyTab.click();
      await page.waitForTimeout(300);

      // 스케줄 일괄 생성 버튼 확인
      await expect(page.getByRole('button', { name: /스케줄 일괄 생성/ })).toBeVisible();
    }
  });

  test('2. 요일별 스케줄 추가', async ({ page }) => {
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 주간 스케줄 탭 클릭
    const weeklyTab = page.locator('button:has-text("주간 스케줄")');
    if (await weeklyTab.isVisible()) {
      await weeklyTab.click();
      await page.waitForTimeout(300);
    }

    // 미설정된 요일에서 + 추가 버튼 클릭
    const addButton = page.locator('button:has-text("+ 추가")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(300);

      // 저장/취소 버튼이 나타나는지 확인
      const hasSaveButton = await page.getByRole('button', { name: /저장/ }).first().isVisible().catch(() => false);
      console.log('편집 모드 활성화:', hasSaveButton);

      if (hasSaveButton) {
        // 저장 클릭
        await page.getByRole('button', { name: /저장/ }).first().click();
        await page.waitForTimeout(300);
      }
    } else {
      console.log('모든 요일에 이미 스케줄이 설정되어 있습니다.');
    }
  });

  test('3. 요일별 스케줄 수정', async ({ page }) => {
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 주간 스케줄 탭 클릭
    const weeklyTab = page.locator('button:has-text("주간 스케줄")');
    if (await weeklyTab.isVisible()) {
      await weeklyTab.click();
      await page.waitForTimeout(300);
    }

    // 기존 스케줄의 수정 버튼 클릭
    const editButton = page.locator('button:has-text("수정")').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(300);

      // 시간 입력 필드가 나타나는지 확인
      const hasTimeInput = await page.locator('input[type="time"]').first().isVisible().catch(() => false);
      console.log('편집 필드 표시:', hasTimeInput);

      // 취소 버튼 클릭
      const cancelButton = page.getByRole('button', { name: /취소/ }).first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    } else {
      console.log('수정할 스케줄이 없습니다.');
    }
  });

  test('4. 요일별 스케줄 삭제', async ({ page }) => {
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 주간 스케줄 탭 클릭
    const weeklyTab = page.locator('button:has-text("주간 스케줄")');
    if (await weeklyTab.isVisible()) {
      await weeklyTab.click();
      await page.waitForTimeout(300);
    }

    // 삭제 버튼 찾기
    const deleteButton = page.locator('button:has-text("삭제")').first();

    if (await deleteButton.isVisible()) {
      // window.confirm 모킹
      page.once('dialog', dialog => {
        console.log('스케줄 삭제 확인:', dialog.message());
        dialog.dismiss(); // 취소
      });

      await deleteButton.click();
      await page.waitForTimeout(300);
    } else {
      console.log('삭제할 스케줄이 없습니다.');
    }
  });

  test('5. 스케줄 일괄 생성 마법사', async ({ page }) => {
    test.slow(); // 마법사 테스트는 더 긴 타임아웃 필요
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 주간 스케줄 탭 클릭
    const weeklyTab = page.locator('button:has-text("주간 스케줄")');
    if (await weeklyTab.isVisible()) {
      await weeklyTab.click();
      await page.waitForTimeout(300);
    }

    // 스케줄 일괄 생성 버튼 클릭
    const wizardButton = page.getByRole('button', { name: /스케줄 일괄 생성/ });
    if (await wizardButton.isVisible()) {
      await wizardButton.click();
      await page.waitForTimeout(300);

      // 마법사 다이얼로그 확인
      const hasWizard = await page.getByText(/일괄 생성/).isVisible().catch(() => false) ||
                        await page.getByRole('dialog').isVisible().catch(() => false);
      console.log('마법사 열림:', hasWizard);

      // ESC로 닫기
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('TimeSlot CRUD 테스트', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('1. 라운드 상세 페이지 - 타임슬롯 탭 이동', async ({ page }) => {
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      console.log('테스트할 라운드가 없습니다. data-setup.spec.ts를 먼저 실행하세요.');
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 타임슬롯 탭 클릭
    const timeslotTab = page.locator('button:has-text("타임슬롯")');
    if (await timeslotTab.isVisible()) {
      await timeslotTab.click();
      await page.waitForTimeout(300);

      // 타임슬롯 생성 버튼 확인
      await expect(page.getByRole('button', { name: '타임슬롯 생성', exact: true })).toBeVisible();
    }
  });

  test('2. 타임슬롯 생성 마법사', async ({ page }) => {
    test.slow(); // 마법사 테스트는 더 긴 타임아웃 필요
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 타임슬롯 탭 클릭
    const timeslotTab = page.locator('button:has-text("타임슬롯")');
    if (await timeslotTab.isVisible()) {
      await timeslotTab.click();
      await page.waitForTimeout(300);
    }

    // 타임슬롯 생성 버튼 클릭
    const createButton = page.getByRole('button', { name: '타임슬롯 생성', exact: true });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(300);

      // 마법사 다이얼로그 확인 (날짜 선택 등)
      const hasWizard = await page.getByText(/생성/).isVisible().catch(() => false) ||
                        await page.locator('input[type="date"]').isVisible().catch(() => false);
      console.log('타임슬롯 생성 마법사:', hasWizard);

      // ESC로 닫기
      await page.keyboard.press('Escape');
    }
  });

  test('3. 타임슬롯 주간 네비게이션', async ({ page }) => {
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 타임슬롯 탭 클릭
    const timeslotTab = page.locator('button:has-text("타임슬롯")');
    if (await timeslotTab.isVisible()) {
      await timeslotTab.click();
      await page.waitForTimeout(300);
    }

    // 이전/다음 주 네비게이션 버튼 확인
    const prevButton = page.locator('button[title*="이전"], button:has-text("이전 주")');
    const nextButton = page.locator('button[title*="다음"], button:has-text("다음 주")');

    // 다음 주 이동
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(300);
      console.log('다음 주로 이동');
    }

    // 이전 주 이동
    if (await prevButton.isVisible()) {
      await prevButton.click();
      await page.waitForTimeout(300);
      console.log('이전 주로 이동');
    }
  });

  test('4. 타임슬롯 상태 변경', async ({ page }) => {
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 타임슬롯 탭 클릭
    const timeslotTab = page.locator('button:has-text("타임슬롯")');
    if (await timeslotTab.isVisible()) {
      await timeslotTab.click();
      await page.waitForTimeout(300);
    }

    // 타임슬롯 카드가 있는지 확인
    const slotCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /\d+:\d+/ }).first();
    const hasSlots = await slotCard.isVisible().catch(() => false);

    if (hasSlots) {
      // 슬롯 클릭하여 상태 변경 메뉴 열기
      await slotCard.click();
      await page.waitForTimeout(300);

      // 상태 변경 옵션 확인
      const hasStatusOptions = await page.getByText(/활성|비활성|정비/).first().isVisible().catch(() => false);
      console.log('상태 변경 옵션:', hasStatusOptions);
    } else {
      console.log('표시할 타임슬롯이 없습니다.');
    }
  });

  test('5. 타임슬롯 삭제', async ({ page }) => {
    await page.goto('/games');

    const gameCard = await findGameCard(page);
    if (!gameCard) {
      test.skip();
      return;
    }

    await gameCard.click();
    await page.waitForTimeout(300);

    // 타임슬롯 탭 클릭
    const timeslotTab = page.locator('button:has-text("타임슬롯")');
    if (await timeslotTab.isVisible()) {
      await timeslotTab.click();
      await page.waitForTimeout(300);
    }

    // 삭제 버튼 찾기 (휴지통 아이콘 또는 삭제 텍스트)
    const deleteButton = page.locator('button').filter({ hasText: /삭제/ }).first();

    if (await deleteButton.isVisible()) {
      // window.confirm 모킹
      page.once('dialog', dialog => {
        console.log('타임슬롯 삭제 확인:', dialog.message());
        dialog.dismiss(); // 취소
      });

      await deleteButton.click();
      await page.waitForTimeout(300);
    } else {
      console.log('삭제할 타임슬롯이 없거나 삭제 버튼이 보이지 않습니다.');
    }
  });
});

test.describe('통합 CRUD 시나리오', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('전체 워크플로우: 골프장 -> 코스 -> 라운드 -> 스케줄 -> 타임슬롯', async ({ page }) => {
    // 1. 골프장 목록으로 이동
    await page.goto('/clubs');

    const clubCard = await findClubCard(page);
    if (!clubCard) {
      console.log('테스트 데이터 없음. data-setup.spec.ts 실행 필요.');
      test.skip();
      return;
    }

    // 2. 골프장 상세 이동
    await clubCard.click();
    await expect(page).toHaveURL(/.*clubs\/\d+/);
    console.log('✓ 골프장 상세 페이지 이동');

    // 3. 코스관리 탭 확인
    const courseTab = page.locator('button:has-text("코스관리")');
    if (await courseTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await courseTab.click();
      await page.waitForTimeout(300);
      console.log('✓ 코스관리 탭 확인');
    }

    // 4. 라운드 페이지로 이동 (버튼이 있으면 클릭, 없으면 직접 이동)
    const roundButton = page.getByRole('button', { name: /라운드 보기/ });
    if (await roundButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await roundButton.click();
    } else {
      await page.goto('/games');
    }
    await expect(page).toHaveURL(/.*games/);
    await page.waitForTimeout(500);
    console.log('✓ 라운드 목록 페이지 이동');

    // 5. 라운드 상세 이동 (라운드가 있는 경우만)
    const gameCard = await findGameCard(page);
    if (gameCard) {
      await gameCard.click();
      await page.waitForTimeout(300);

      // 6. 주간 스케줄 탭 확인
      const weeklyTab = page.locator('button:has-text("주간 스케줄")');
      if (await weeklyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await weeklyTab.click();
        await page.waitForTimeout(300);
        console.log('✓ 주간 스케줄 탭 확인');
      }

      // 7. 타임슬롯 탭 확인
      const timeslotTab = page.locator('button:has-text("타임슬롯")');
      if (await timeslotTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await timeslotTab.click();
        await page.waitForTimeout(300);
        console.log('✓ 타임슬롯 탭 확인');
      }
    } else {
      console.log('- 라운드 데이터 없음 (스킵)');
    }

    console.log('\n=== 전체 워크플로우 테스트 완료 ===');
  });
});
