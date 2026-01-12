import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 회사 이름 샘플
const companyNames = [
  '그린밸리 골프클럽',
  '선셋힐 컨트리클럽',
  '오션뷰 리조트',
  '마운틴 피크 골프',
  '레이크사이드 클럽',
  '로얄 골프 컨트리',
  '스카이라인 리조트',
  '포레스트 힐즈',
  '실버스톤 골프',
  '골든아이 컨트리',
  '블루오션 리조트',
  '에메랄드 밸리',
  '다이아몬드 골프클럽',
  '크리스탈 베이',
  '펄하버 리조트',
  '썬라이즈 골프',
  '문라이트 컨트리',
  '스타듀 골프클럽',
  '윈드밀 리조트',
  '하버뷰 골프'
];

// 코스 이름 샘플
const courseTypes = [
  { prefix: 'A', name: 'A코스', difficulty: 'INTERMEDIATE' },
  { prefix: 'B', name: 'B코스', difficulty: 'BEGINNER' },
  { prefix: 'C', name: 'C코스', difficulty: 'ADVANCED' },
  { prefix: 'D', name: 'D코스', difficulty: 'PROFESSIONAL' }
];

// 지역 샘플
const locations = [
  '경기도 용인시',
  '강원도 춘천시',
  '충청북도 청주시',
  '전라남도 여수시',
  '경상북도 경주시',
  '제주특별자치도 제주시',
  '부산광역시 기장군',
  '인천광역시 강화군',
  '경기도 남양주시',
  '강원도 평창군',
  '충청남도 천안시',
  '전라북도 전주시',
  '경상남도 통영시',
  '대구광역시 달성군',
  '울산광역시 울주군',
  '경기도 파주시',
  '강원도 강릉시',
  '충청북도 제천시',
  '전라남도 순천시',
  '경상북도 안동시'
];

// 사업자등록번호 생성 함수
function generateBusinessNumber(): string {
  const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10));
  return `${digits.slice(0, 3).join('')}-${digits.slice(3, 5).join('')}-${digits.slice(5).join('')}`;
}

// 전화번호 생성 함수
function generatePhoneNumber(): string {
  const area = ['02', '031', '032', '033', '041', '042', '043', '051', '052', '053', '054', '055', '061', '062', '063', '064'];
  const selectedArea = area[Math.floor(Math.random() * area.length)];
  const middle = Math.floor(Math.random() * 9000) + 1000;
  const last = Math.floor(Math.random() * 9000) + 1000;
  return `${selectedArea}-${middle}-${last}`;
}

// 이메일 생성 함수
function generateEmail(companyName: string): string {
  const domain = ['golf.co.kr', 'resort.com', 'club.kr', 'country.co.kr'];
  const selectedDomain = domain[Math.floor(Math.random() * domain.length)];
  const cleanName = companyName.replace(/\s+/g, '').toLowerCase();
  return `info@${cleanName}.${selectedDomain}`;
}

// 홀 정보 생성 함수
function generateHoles(courseId: number, courseName: string) {
  const holes = [];
  for (let holeNumber = 1; holeNumber <= 9; holeNumber++) {
    const par = [3, 4, 5][Math.floor(Math.random() * 3)];
    const baseDistance = par === 3 ? 120 : par === 4 ? 150 : 180;
    const distance = baseDistance + Math.floor(Math.random() * 50);

    holes.push({
      holeNumber,
      par,
      distance,
      handicap: holeNumber,
      courseId,
    });
  }
  return holes;
}

// Game 주간 스케줄 생성 함수
function generateGameWeeklySchedules(gameId: number) {
  const schedules = [];
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    // 일요일(0)은 조금 늦게 시작
    const startTime = dayOfWeek === 0 ? '08:00' : '06:00';
    const endTime = '16:00'; // 마지막 티오프 시간

    schedules.push({
      gameId,
      dayOfWeek,
      startTime,
      endTime,
      interval: 10, // 10분 간격
      isActive: true,
    });
  }
  return schedules;
}

async function main() {
  console.log('🌱 시드 데이터 생성을 시작합니다...');

  // 기존 데이터 정리
  console.log('📝 기존 데이터를 정리합니다...');
  await prisma.gameTimeSlot.deleteMany();
  await prisma.gameWeeklySchedule.deleteMany();
  await prisma.game.deleteMany();
  await prisma.teeBox.deleteMany();
  await prisma.hole.deleteMany();
  await prisma.course.deleteMany();
  await prisma.club.deleteMany();
  // Note: Company는 iam-service(iam_db)에서 관리됨 - 여기서는 companyId만 참조

  // 가상의 회사 데이터 (iam-service에서 관리되는 회사의 ID와 정보를 가정)
  // 실제 환경에서는 iam-service API를 통해 회사 목록을 가져와야 함
  console.log('🏢 회사 참조 데이터를 준비합니다... (iam-service에서 관리)');
  const companies = companyNames.map((name, index) => ({
    id: index + 1, // iam-service의 companies 테이블 ID 가정
    name,
    address: locations[index],
    phoneNumber: generatePhoneNumber(),
  }));

  console.log(`  ℹ️  ${companies.length}개 회사 참조 준비 완료 (companyId: 1-${companies.length})`);
  console.log('  ⚠️  주의: 실제 iam-service의 companies 테이블에 해당 ID가 존재해야 합니다.');

  // Golf clubs 생성
  console.log('🏌️ 파크골프클럽 데이터를 생성합니다...');
  const clubs = [];

  for (const company of companies) {
    // 각 회사마다 1개의 파크골프클럽 생성
    const club = await prisma.club.create({
      data: {
        name: `${company.name} 파크골프클럽`,
        companyId: company.id,
        location: locations[Math.floor(Math.random() * locations.length)],
        address: `${company.address || locations[Math.floor(Math.random() * locations.length)]} 파크골프장로 123`,
        phone: company.phoneNumber || '064-123-4567',
        email: `info@${company.name.toLowerCase().replace(/\s/g, '')}.com`,
        website: `https://${company.name.toLowerCase().replace(/\s/g, '')}.com`,
        totalHoles: 0, // Will be updated later
        totalCourses: 0, // Will be updated later
        status: 'ACTIVE',
        operatingHours: {
          open: '06:00',
          close: '18:00'
        },
        facilities: ['카트도로', '연습장', '클럽하우스', '주차장'],
        isActive: true,
      },
    });
    clubs.push(club);
    console.log(`  ✅ ${club.name} 생성 완료`);
  }

  console.log('⛳ 코스 데이터를 생성합니다...');
  let totalCourses = 0;
  let totalHoles = 0;
  let totalGames = 0;
  const createdCourses: any = {};

  for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
    const company = companies[companyIndex];
    const club = clubs[companyIndex];
    createdCourses[club.id] = [];

    // 각 회사마다 4개의 코스 생성 (A, B, C, D)
    for (let courseIndex = 0; courseIndex < 4; courseIndex++) {
      const courseType = courseTypes[courseIndex];
      const courseName = `${courseType.name}`;

      const course = await prisma.course.create({
        data: {
          name: courseName,
          code: courseType.prefix,
          subtitle: `${company.name} ${courseType.name}`,
          companyId: company.id,
          clubId: club.id,
          holeCount: 9,
          par: 36,
          totalDistance: Math.floor(Math.random() * 500) + 1000, // 1000-1500m (파크골프)
          difficulty: Math.floor(Math.random() * 5) + 1,
          scenicRating: Math.floor(Math.random() * 5) + 1,
          description: `${company.name} ${courseName}는 자연과 조화를 이룬 아름다운 코스로, 모든 레벨의 파크골퍼들이 즐길 수 있도록 설계되었습니다.`,
          status: Math.random() > 0.05 ? 'ACTIVE' : 'MAINTENANCE', // 95% 활성
          isActive: true,
        },
      });

      createdCourses[club.id].push(course);
      totalCourses++;
      console.log(`  ⛳ ${company.name} ${courseName} 생성 완료`);

      // 각 코스에 9개 홀 생성
      console.log(`    🕳️  홀 생성 중...`);
      const holes = generateHoles(course.id, courseName);

      for (const holeData of holes) {
        const hole = await prisma.hole.create({
          data: holeData,
        });

        // 각 홀에 티박스 2개 생성 (파크골프는 보통 티박스가 적음)
        const teeBoxTypes = [
          { name: '일반', color: 'WHITE', difficulty: 'INTERMEDIATE', distanceMultiplier: 1.0 },
          { name: '시니어', color: 'RED', difficulty: 'BEGINNER', distanceMultiplier: 0.85 },
        ];

        for (const teeType of teeBoxTypes) {
          await prisma.teeBox.create({
            data: {
              name: teeType.name,
              distance: Math.round(holeData.distance * teeType.distanceMultiplier),
              color: teeType.color,
              holeId: hole.id,
            },
          });
        }
        totalHoles++;
      }
    }

    // Game 생성 (코스 조합: A+B, C+D)
    console.log(`  🎮 게임 조합 생성 중...`);
    const clubCourses = createdCourses[club.id];
    const gameConfigs = [
      { front: 0, back: 1, name: 'A+B', code: 'AB' },
      { front: 2, back: 3, name: 'C+D', code: 'CD' },
      { front: 0, back: 2, name: 'A+C', code: 'AC' },
      { front: 1, back: 3, name: 'B+D', code: 'BD' },
    ];

    for (const config of gameConfigs) {
      const frontCourse = clubCourses[config.front];
      const backCourse = clubCourses[config.back];

      const game = await prisma.game.create({
        data: {
          name: `${config.name} 코스`,
          code: `${club.id}-${config.code}`,
          description: `${frontCourse.name}(전반)과 ${backCourse.name}(후반) 조합`,
          frontNineCourseId: frontCourse.id,
          backNineCourseId: backCourse.id,
          totalHoles: 18,
          estimatedDuration: 180, // 3시간
          breakDuration: 10,
          maxPlayers: 4,
          basePrice: 30000 + Math.floor(Math.random() * 20000),
          weekendPrice: 40000 + Math.floor(Math.random() * 20000),
          holidayPrice: 50000 + Math.floor(Math.random() * 20000),
          clubId: club.id,
          status: 'ACTIVE',
          isActive: true,
        },
      });

      totalGames++;
      console.log(`    🎮 ${game.name} 생성 완료`);

      // Game 주간 스케줄 생성
      const weeklySchedules = generateGameWeeklySchedules(game.id);
      for (const scheduleData of weeklySchedules) {
        await prisma.gameWeeklySchedule.create({
          data: scheduleData,
        });
      }
    }
  }

  console.log('\n🎉 시드 데이터 생성이 완료되었습니다!');
  console.log(`📊 생성된 데이터 통계:`);
  console.log(`  • 회사 참조: ${companies.length}개 (iam-service 관리)`);
  console.log(`  • 클럽: ${clubs.length}개`);
  console.log(`  • 코스: ${totalCourses}개`);
  console.log(`  • 홀: ${totalHoles}개`);
  console.log(`  • 게임: ${totalGames}개`);
  console.log(`  • 게임 주간 스케줄: ${totalGames * 7}개`);

  // 실제 개수 확인 (Company는 iam-service에서 관리)
  const actualClubs = await prisma.club.count();
  const actualCourses = await prisma.course.count();
  const actualHoles = await prisma.hole.count();
  const actualTeeBoxes = await prisma.teeBox.count();
  const actualGames = await prisma.game.count();
  const actualSchedules = await prisma.gameWeeklySchedule.count();

  console.log(`\n✅ 데이터베이스 확인:`);
  console.log(`  • 클럽: ${actualClubs}개`);
  console.log(`  • 코스: ${actualCourses}개`);
  console.log(`  • 홀: ${actualHoles}개`);
  console.log(`  • 티박스: ${actualTeeBoxes}개`);
  console.log(`  • 게임: ${actualGames}개`);
  console.log(`  • 게임 주간 스케줄: ${actualSchedules}개`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ 시드 데이터 생성 중 오류 발생:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
