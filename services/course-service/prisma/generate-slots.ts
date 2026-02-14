import { PrismaClient, SlotMode } from '@prisma/client';

const prisma = new PrismaClient();

// =====================================================
// 유틸리티
// =====================================================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** "HH:MM" → 분 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 분 → "HH:MM" */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** 날짜가 주말인지 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** 날짜를 UTC 자정으로 맞춤 (Prisma @db.Date 호환) */
function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

// =====================================================
// 메인 로직
// =====================================================

async function main() {
  console.log('=== 주간스케줄 & 타임슬롯 생성 시작 ===\n');

  // 1. 현재 상태 확인
  const existingSchedules = await prisma.gameWeeklySchedule.count();
  const existingSlots = await prisma.gameTimeSlot.count();
  console.log(`현재 상태: 스케줄 ${existingSchedules}건, 슬롯 ${existingSlots}건`);

  if (existingSchedules > 0 || existingSlots > 0) {
    console.log('기존 데이터가 존재합니다. 삭제 후 재생성합니다.');
    await prisma.gameTimeSlot.deleteMany();
    await prisma.gameWeeklySchedule.deleteMany();
    console.log('기존 스케줄/슬롯 삭제 완료\n');
  }

  // 2. 클럽 + 게임 조회
  const clubs = await prisma.club.findMany({
    where: { isActive: true },
    include: {
      games: {
        where: { isActive: true },
      },
    },
  });

  const freeClubs = clubs.filter((c) => c.clubType === 'FREE');
  const paidClubs = clubs.filter((c) => c.clubType === 'PAID');

  console.log(`클럽 현황: 전체 ${clubs.length}개 (PAID: ${paidClubs.length}, FREE: ${freeClubs.length})`);

  const allGames = clubs.flatMap((c) => c.games);
  console.log(`게임 현황: 전체 ${allGames.length}개\n`);

  // 3. Game.slotMode 업데이트
  console.log('--- Step 1: Game.slotMode 업데이트 ---');

  const freeGameIds = freeClubs.flatMap((c) => c.games.map((g) => g.id));
  const paidGameIds = paidClubs.flatMap((c) => c.games.map((g) => g.id));

  if (freeGameIds.length > 0) {
    await prisma.game.updateMany({
      where: { id: { in: freeGameIds } },
      data: { slotMode: SlotMode.SESSION },
    });
    console.log(`  FREE 클럽 게임 ${freeGameIds.length}개 → SESSION`);
  }

  if (paidGameIds.length > 0) {
    await prisma.game.updateMany({
      where: { id: { in: paidGameIds } },
      data: { slotMode: SlotMode.TEE_TIME },
    });
    console.log(`  PAID 클럽 게임 ${paidGameIds.length}개 → TEE_TIME`);
  }

  // 4. 날짜 범위 계산 (내일 ~ +7일)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(tomorrow);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  console.log(`\n날짜 범위: ${dates[0].toISOString().slice(0, 10)} ~ ${dates[6].toISOString().slice(0, 10)}`);

  // 5. GameWeeklySchedule + GameTimeSlot 생성
  console.log('\n--- Step 2: 주간스케줄 생성 ---');

  let totalSchedules = 0;
  let totalSlots = 0;
  const allScheduleData: any[] = [];
  const allSlotData: any[] = [];

  // PAID 클럽에 대한 interval 미리 결정 (게임별 랜덤)
  const intervalOptions = [7, 8, 10, 12, 15];
  const startTimeOptions = ['06:00', '06:30', '07:00', '07:30', '08:00'];
  const endTimeOptions = ['15:00', '15:30', '16:00', '16:30', '17:00'];

  for (const club of clubs) {
    const isFree = club.clubType === 'FREE';

    for (const game of club.games) {
      if (isFree) {
        // FREE: SESSION 모드 — 7일 × 1개 스케줄
        for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
          allScheduleData.push({
            gameId: game.id,
            dayOfWeek,
            startTime: '08:00',
            endTime: '17:00',
            interval: 0,
            isActive: true,
          });
          totalSchedules++;
        }

        // FREE: 1일 2개 SESSION 슬롯 (AM + PM)
        for (const date of dates) {
          const weekend = isWeekend(date);
          allSlotData.push(
            {
              gameId: game.id,
              date: toDateOnly(date),
              startTime: '08:00',
              endTime: '12:00',
              maxPlayers: 40,
              bookedPlayers: 0,
              price: 0,
              isPremium: weekend,
              status: 'AVAILABLE',
              isActive: true,
            },
            {
              gameId: game.id,
              date: toDateOnly(date),
              startTime: '13:00',
              endTime: '17:00',
              maxPlayers: 40,
              bookedPlayers: 0,
              price: 0,
              isPremium: weekend,
              status: 'AVAILABLE',
              isActive: true,
            },
          );
          totalSlots += 2;
        }
      } else {
        // PAID: TEE_TIME 모드 — 랜덤 구성
        const interval = randomChoice(intervalOptions);
        const startTime = randomChoice(startTimeOptions);
        const endTime = randomChoice(endTimeOptions);
        const duration = game.estimatedDuration || 180;
        const maxPlayers = game.maxPlayers || 4;

        for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
          allScheduleData.push({
            gameId: game.id,
            dayOfWeek,
            startTime,
            endTime,
            interval,
            isActive: true,
          });
          totalSchedules++;
        }

        // PAID: interval 기반 슬롯 생성
        for (const date of dates) {
          const weekend = isWeekend(date);
          const price = weekend && game.weekendPrice
            ? Number(game.weekendPrice)
            : Number(game.basePrice);

          const startMinutes = timeToMinutes(startTime);
          const endMinutes = timeToMinutes(endTime);

          let current = startMinutes;
          while (current < endMinutes) {
            const slotStart = minutesToTime(current);
            const slotEnd = minutesToTime(current + duration);

            // 끝 시간이 하루를 넘으면 중단
            if (current + duration > 24 * 60) break;

            // 부분 랜덤 예약 (0~2명)
            const bookedPlayers = randomInt(0, 2);

            allSlotData.push({
              gameId: game.id,
              date: toDateOnly(date),
              startTime: slotStart,
              endTime: slotEnd,
              maxPlayers,
              bookedPlayers,
              price,
              isPremium: weekend,
              status: bookedPlayers >= maxPlayers ? 'FULLY_BOOKED' : 'AVAILABLE',
              isActive: true,
            });
            totalSlots++;

            current += interval;
          }
        }
      }
    }
  }

  // 6. 배치 삽입
  console.log(`\n--- Step 3: 데이터 삽입 ---`);

  // 스케줄 배치 삽입
  const scheduleResult = await prisma.gameWeeklySchedule.createMany({
    data: allScheduleData,
    skipDuplicates: true,
  });
  console.log(`  주간스케줄: ${scheduleResult.count}건 생성`);

  // 슬롯 배치 삽입 (대량이므로 청크 분할)
  const CHUNK_SIZE = 5000;
  let slotsCreated = 0;
  for (let i = 0; i < allSlotData.length; i += CHUNK_SIZE) {
    const chunk = allSlotData.slice(i, i + CHUNK_SIZE);
    const result = await prisma.gameTimeSlot.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    slotsCreated += result.count;
    console.log(`  타임슬롯: ${slotsCreated}/${allSlotData.length}건 생성...`);
  }

  // 7. 통계 출력
  console.log('\n=== 생성 결과 ===');
  console.log(`주간스케줄: ${scheduleResult.count}건`);
  console.log(`타임슬롯: ${slotsCreated}건`);

  // 클럽별 통계
  console.log('\n--- 클럽별 통계 ---');
  for (const club of clubs) {
    const gameIds = club.games.map((g) => g.id);
    if (gameIds.length === 0) continue;

    const schedCount = await prisma.gameWeeklySchedule.count({
      where: { gameId: { in: gameIds } },
    });
    const slotCount = await prisma.gameTimeSlot.count({
      where: { gameId: { in: gameIds } },
    });
    console.log(
      `  [${club.clubType}] ${club.name}: 게임 ${gameIds.length}개, 스케줄 ${schedCount}건, 슬롯 ${slotCount}건`,
    );
  }

  // DB 카운트 검증
  const finalSchedules = await prisma.gameWeeklySchedule.count();
  const finalSlots = await prisma.gameTimeSlot.count();
  console.log(`\n=== DB 검증 ===`);
  console.log(`game_weekly_schedules: ${finalSchedules}건`);
  console.log(`game_time_slots: ${finalSlots}건`);
  console.log('\n완료!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('오류 발생:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
