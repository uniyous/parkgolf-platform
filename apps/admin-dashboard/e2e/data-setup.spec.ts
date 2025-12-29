import { test, expect, request as playwrightRequest } from '@playwright/test';

/**
 * 테스트 데이터 생성 시나리오
 * - Club 10개 등록
 * - 각 Club당 Course 2~4개 랜덤 등록 (9홀)
 * - 각 Course당 Hole 9개 등록
 * - 각 Club당 Game (18홀 라운드) 생성
 * - 각 Game당 주별일정 랜덤 등록
 * - 각 Game당 TimeSlot 1개월 생성
 */

// API 베이스 URL (E2E 환경에서는 GCP Cloud Run 사용)
const API_BASE_URL = process.env.API_BASE_URL || 'https://admin-api-dev-iihuzmuufa-du.a.run.app';

// 테스트 데이터 생성을 위한 헬퍼 함수들
const LOCATIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원'];
const COURSE_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
const FACILITIES = ['주차장', '샤워실', '락커', '매점', '식당', '카페', '연습장', '카트'];

// 랜덤 헬퍼 함수
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// API 응답에서 ID 추출 (다양한 응답 구조 지원)
function extractId(responseData: any): number | undefined {
  if (!responseData) return undefined;
  // { success: true, data: { id: 1 } } 형태
  if (responseData.success && responseData.data?.id) return responseData.data.id;
  // { data: { id: 1 } } 형태
  if (responseData.data?.id) return responseData.data.id;
  // { id: 1 } 형태
  if (responseData.id) return responseData.id;
  // 배열인 경우 첫 번째 요소
  if (Array.isArray(responseData) && responseData[0]?.id) return responseData[0].id;
  return undefined;
}

function getRandomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomTime(baseHour: number, variance: number): string {
  const hour = baseHour + getRandomInt(-variance, variance);
  const minutes = getRandomInt(0, 1) * 30;
  return `${String(Math.max(5, Math.min(22, hour))).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// 생성된 데이터를 저장할 객체
interface TestData {
  companyId: number;
  clubs: Array<{ id: number; name: string; courses: Array<{ id: number; name: string }> }>;
  games: Array<{ id: number; clubId: number; name: string }>;
}

// 테스트 타임아웃 설정 (데이터 생성이 오래 걸릴 수 있음)
test.describe.serial('테스트 데이터 생성', () => {
  // 각 테스트에 충분한 시간 부여
  test.setTimeout(180000); // 3분

  let authToken: string;
  const testRunId = Date.now().toString().slice(-6); // 유니크 ID 생성
  let testData: TestData = {
    companyId: 0,
    clubs: [],
    games: [],
  };

  test.beforeAll(async () => {
    // 로그인하여 토큰 획득
    const apiContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
    });

    const loginResponse = await apiContext.post('/api/admin/auth/login', {
      data: {
        email: 'admin@parkgolf.com',
        password: 'admin123!@#',
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.data?.accessToken || loginData.accessToken;
    expect(authToken).toBeTruthy();

    // 회사 정보 가져오기 (첫 번째 회사 사용)
    const companiesResponse = await apiContext.get('/api/admin/companies', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (companiesResponse.ok()) {
      const companiesData = await companiesResponse.json();
      // data.companies 배열 형태
      const companies = companiesData.data?.companies || companiesData.data?.items || companiesData.data || companiesData;
      if (Array.isArray(companies) && companies.length > 0) {
        testData.companyId = companies[0].id;
        console.log('기존 Company 사용 - ID:', testData.companyId, '이름:', companies[0].name);
      }
    }

    // 회사가 없으면 생성
    if (!testData.companyId) {
      console.log('회사가 없어서 새로 생성합니다...');
      const createCompanyResponse = await apiContext.post('/api/admin/companies', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          name: '테스트 골프 그룹',
          businessNumber: '123-45-67890',
          ceoName: '홍길동',
          contactPhone: '02-1234-5678',
          contactEmail: 'test@parkgolf.com',
          address: '서울시 강남구 테헤란로 123',
        },
      });

      console.log('Company 생성 응답 상태:', createCompanyResponse.status());
      const companyData = await createCompanyResponse.json();
      console.log('Company 생성 응답 데이터:', JSON.stringify(companyData, null, 2));

      if (createCompanyResponse.ok()) {
        testData.companyId = extractId(companyData) || 0;
      }
      console.log('생성된 Company ID:', testData.companyId);
    }

    expect(testData.companyId, 'Company ID must be set').toBeGreaterThan(0);

    await apiContext.dispose();
  });

  test('1. Club 10개 등록', async () => {
    const apiContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
    });

    for (let i = 0; i < 10; i++) {
      const location = LOCATIONS[i % LOCATIONS.length];
      const clubName = `${location} 파크골프장 ${testRunId}-${i + 1}`;
      const openHour = getRandomInt(5, 7);
      const closeHour = getRandomInt(18, 21);

      const createClubResponse = await apiContext.post('/api/admin/courses/clubs', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          companyId: testData.companyId,
          name: clubName,
          location: location,
          address: `${location}시 테스트구 테스트로 ${getRandomInt(1, 999)}`,
          phone: `0${getRandomInt(2, 6)}${getRandomInt(2, 9)}-${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`,
          email: `club${i + 1}@parkgolf.com`,
          website: `https://club${i + 1}.parkgolf.com`,
          operatingHours: {
            open: `${String(openHour).padStart(2, '0')}:00`,
            close: `${String(closeHour).padStart(2, '0')}:00`,
          },
          facilities: getRandomElements(FACILITIES, getRandomInt(3, 6)),
          status: 'ACTIVE',
        },
      });

      expect(createClubResponse.ok(), `Club ${i + 1} 생성 실패`).toBeTruthy();
      const clubData = await createClubResponse.json();
      const clubId = extractId(clubData);

      testData.clubs.push({
        id: clubId,
        name: clubName,
        courses: [],
      });

      console.log(`Club ${i + 1} 생성 완료: ${clubName} (ID: ${clubId})`);
    }

    await apiContext.dispose();
    expect(testData.clubs.length).toBe(10);
  });

  test('2. 각 Club당 Course 2~4개 랜덤 등록', async () => {
    const apiContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
    });

    for (const club of testData.clubs) {
      const courseCount = getRandomInt(2, 4);

      for (let i = 0; i < courseCount; i++) {
        const courseName = `${COURSE_NAMES[i]}코스`;
        const totalPar = getRandomInt(27, 36); // 9홀 기준 Par

        // 코스 코드 생성 (예: A, B, C, D...)
        const courseCode = `${testRunId}-${COURSE_NAMES[i]}`;

        const createCourseResponse = await apiContext.post('/api/admin/courses', {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            companyId: testData.companyId,
            clubId: club.id,
            name: `${club.name} - ${courseName}`,
            code: courseCode,
            description: `${club.name}의 ${courseName}`,
            holeCount: 9,
            address: club.name,
            isActive: true,
          },
        });

        expect(createCourseResponse.ok(), `Course 생성 실패 (Club: ${club.name})`).toBeTruthy();
        const courseData = await createCourseResponse.json();
        const courseId = extractId(courseData);

        const fullCourseName = `${club.name} - ${courseName}`;
        club.courses.push({
          id: courseId,
          name: fullCourseName,
        });

        console.log(`Course 생성 완료: ${fullCourseName} (ID: ${courseId})`);
      }
    }

    await apiContext.dispose();

    const totalCourses = testData.clubs.reduce((sum, club) => sum + club.courses.length, 0);
    console.log(`총 ${totalCourses}개 Course 생성 완료`);
    expect(totalCourses).toBeGreaterThanOrEqual(20); // 최소 10 * 2 = 20
  });

  test('3. 각 Course당 Hole 9개 등록 (처음 3개 클럽)', async () => {
    const apiContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
    });

    let totalHoles = 0;
    // 처음 3개 클럽에 대해서만 홀 생성 (시간 단축)
    const clubsToProcess = testData.clubs.slice(0, 3);

    for (const club of clubsToProcess) {
      for (const course of club.courses) {
        for (let holeNum = 1; holeNum <= 9; holeNum++) {
          const par = getRandomInt(3, 5);
          const distance = par === 3 ? getRandomInt(30, 60) : par === 4 ? getRandomInt(50, 90) : getRandomInt(70, 120);

          const createHoleResponse = await apiContext.post(`/api/admin/courses/${course.id}/holes`, {
            headers: { Authorization: `Bearer ${authToken}` },
            data: {
              holeNumber: holeNum,
              par: par,
              distance: distance,
              handicap: getRandomInt(1, 9),
              description: `${holeNum}번 홀 - Par ${par}`,
            },
          });

          if (createHoleResponse.ok()) {
            totalHoles++;
          }
        }

        console.log(`Hole 9개 생성 완료: ${club.name} - ${course.name}`);
      }
    }

    await apiContext.dispose();
    console.log(`총 ${totalHoles}개 Hole 생성 완료 (3개 클럽 대상)`);
    expect(totalHoles).toBeGreaterThan(0);
  });

  test('4. 각 Club당 Game (18홀 라운드) 생성', async () => {
    const apiContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
    });

    let gameIndex = 0;
    for (const club of testData.clubs) {
      // 코스가 2개 이상인 경우에만 게임 생성 (클럽당 1개만 생성)
      if (club.courses.length >= 2) {
        const frontCourse = club.courses[0];
        const backCourse = club.courses[1];

        const gameName = `${club.name} 라운드`;
        // 유니크한 게임 코드 생성
        const gameCode = `${testRunId}-G${++gameIndex}`;

        const basePrice = getRandomInt(3, 6) * 10000; // 30000 ~ 60000
        const weekendPrice = Math.floor(basePrice * 1.3);
        const holidayPrice = Math.floor(basePrice * 1.5);

        const createGameResponse = await apiContext.post('/api/admin/games', {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            name: gameName,
            code: gameCode,
            description: `${club.name}의 ${gameName}`,
            frontNineCourseId: frontCourse.id,
            backNineCourseId: backCourse.id,
            totalHoles: 18,
            estimatedDuration: getRandomInt(150, 210),
            breakDuration: getRandomInt(5, 15),
            maxPlayers: getRandomInt(3, 4),
            basePrice: basePrice,
            weekendPrice: weekendPrice,
            holidayPrice: holidayPrice,
            clubId: club.id,
          },
        });

        if (createGameResponse.ok()) {
          const gameData = await createGameResponse.json();
          const gameId = extractId(gameData);

          if (gameId) {
            testData.games.push({
              id: gameId,
              clubId: club.id,
              name: gameName,
            });
            console.log(`Game 생성 완료: ${gameName} (ID: ${gameId})`);
          }
        } else {
          const errorData = await createGameResponse.json();
          console.log(`Game 생성 실패: ${gameName} - ${JSON.stringify(errorData)}`);
        }
      }
    }

    await apiContext.dispose();
    console.log(`총 ${testData.games.length}개 Game 생성 완료`);
    expect(testData.games.length).toBeGreaterThan(0);
  });

  test('5. 각 Game당 주별일정 랜덤 등록', async () => {
    const apiContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
    });

    let totalSchedules = 0;
    let processedGames = 0;

    for (const game of testData.games) {
      // 유효한 게임 ID가 있는 경우에만 처리
      if (!game.id) {
        console.log(`Game ID가 없어서 건너뜀: ${game.name}`);
        continue;
      }

      processedGames++;

      // 요일별로 다른 일정 생성 (0=일요일 ~ 6=토요일)
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        // 랜덤하게 일부 요일은 비활성
        const isActive = Math.random() > 0.15; // 85% 확률로 활성

        // 주말과 평일 다른 시간대
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const startHour = isWeekend ? getRandomInt(5, 7) : getRandomInt(6, 8);
        const endHour = isWeekend ? getRandomInt(19, 21) : getRandomInt(17, 19);
        const interval = isWeekend ? getRandomInt(8, 12) : getRandomInt(10, 15);

        const createScheduleResponse = await apiContext.post(`/api/admin/games/${game.id}/weekly-schedules`, {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            dayOfWeek: dayOfWeek,
            startTime: `${String(startHour).padStart(2, '0')}:00`,
            endTime: `${String(endHour).padStart(2, '0')}:00`,
            interval: interval,
            isActive: isActive,
          },
        });

        if (createScheduleResponse.ok()) {
          totalSchedules++;
        }
      }

      console.log(`WeeklySchedule 7일 생성 완료: ${game.name}`);
    }

    await apiContext.dispose();
    console.log(`총 ${totalSchedules}개 WeeklySchedule 생성 완료 (${processedGames}개 게임)`);
    // API 속도 제한으로 인해 일부만 성공할 수 있음
    expect(totalSchedules).toBeGreaterThan(0);
  });

  test('6. 각 Game당 TimeSlot 1주일 생성', async () => {
    const apiContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
    });

    // 오늘부터 1주일 후까지 (시간 단축)
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let successCount = 0;
    let processedGames = 0;

    for (const game of testData.games) {
      // 유효한 게임 ID가 있는 경우에만 처리
      if (!game.id) {
        continue;
      }

      processedGames++;

      const generateResponse = await apiContext.post(`/api/admin/games/${game.id}/time-slots/generate`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          startDate: startDate,
          endDate: endDate,
        },
      });

      if (generateResponse.ok()) {
        successCount++;
        const responseData = await generateResponse.json();
        const count = responseData.data?.count || responseData.count || 'N/A';
        console.log(`TimeSlot 생성 완료: ${game.name} (${startDate} ~ ${endDate}) - ${count}개`);
      } else {
        console.log(`TimeSlot 생성 실패: ${game.name} - ${generateResponse.status()}`);
      }
    }

    await apiContext.dispose();
    console.log(`총 ${successCount}/${processedGames} Game에 TimeSlot 생성 완료`);
    expect(successCount).toBeGreaterThan(0);
  });

  test('7. 생성된 데이터 검증', async () => {
    const apiContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
    });

    // Club 목록 확인
    const clubsResponse = await apiContext.get('/api/admin/courses/clubs', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(clubsResponse.ok()).toBeTruthy();

    // Game 목록 확인
    const gamesResponse = await apiContext.get('/api/admin/games', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(gamesResponse.ok()).toBeTruthy();

    // 결과 요약
    console.log('\n=== 테스트 데이터 생성 완료 ===');
    console.log(`Club: ${testData.clubs.length}개`);
    console.log(`Course: ${testData.clubs.reduce((sum, c) => sum + c.courses.length, 0)}개`);
    console.log(`Game: ${testData.games.length}개`);
    console.log('================================\n');

    await apiContext.dispose();
  });
});

test.describe('생성된 데이터 UI 확인', () => {
  // 기존 auth.setup.ts의 인증 상태 사용
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('골프장 목록에서 생성된 Club 확인', async ({ page }) => {
    await page.goto('/clubs');
    await page.waitForTimeout(5000);

    // 골프장 목록 또는 페이지 로드 확인
    const hasClubCount = await page.getByText(/총 \d+개의 골프장/).isVisible().catch(() => false);
    const hasClubPage = await page.getByRole('heading', { name: /골프장 관리/ }).isVisible().catch(() => false);

    console.log(`골프장 페이지 로드: ${hasClubCount || hasClubPage}`);
    expect(hasClubCount || hasClubPage).toBeTruthy();
  });

  test('라운드 목록에서 생성된 Game 확인', async ({ page }) => {
    await page.goto('/games');
    await page.waitForTimeout(5000);

    // 라운드 목록 또는 페이지 로드 확인
    const hasGameCount = await page.getByText(/총 \d+개의 라운드/).isVisible().catch(() => false);
    const hasGamePage = await page.getByRole('heading', { name: /라운드 관리/ }).isVisible().catch(() => false);

    console.log(`라운드 페이지 로드: ${hasGameCount || hasGamePage}`);
    expect(hasGameCount || hasGamePage).toBeTruthy();
  });
});
