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
  { prefix: '동코스', difficulty: 'INTERMEDIATE' },
  { prefix: '서코스', difficulty: 'BEGINNER' },
  { prefix: '남코스', difficulty: 'ADVANCED' },
  { prefix: '북코스', difficulty: 'PROFESSIONAL' }
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
      handicap: holeNumber, // Use hole number as handicap
      courseId,
    });
  }
  return holes;
}

// 주간 스케줄 생성 함수
function generateWeeklySchedules(courseId: number) {
  const schedules = [];
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    // 일요일(0)은 조금 늦게 시작
    const openTime = dayOfWeek === 0 ? '08:00' : '06:00';
    const closeTime = '18:00';
    
    schedules.push({
      courseId,
      dayOfWeek,
      openTime,
      closeTime,
      isActive: true,
    });
  }
  return schedules;
}

async function main() {
  console.log('🌱 시드 데이터 생성을 시작합니다...');

  // 기존 데이터 정리
  console.log('📝 기존 데이터를 정리합니다...');
  await prisma.courseTimeSlot.deleteMany();
  await prisma.courseWeeklySchedule.deleteMany();
  await prisma.teeBox.deleteMany();
  await prisma.hole.deleteMany();
  await prisma.course.deleteMany();
  await prisma.club.deleteMany();
  await prisma.company.deleteMany();

  console.log('🏢 회사 데이터를 생성합니다...');
  const companies = [];
  
  for (let i = 0; i < 20; i++) {
    const company = await prisma.company.create({
      data: {
        name: companyNames[i],
        description: `${companyNames[i]}는 최고의 골프 경험을 제공하는 프리미엄 골프장입니다.`,
        address: locations[i],
        phoneNumber: generatePhoneNumber(),
        email: generateEmail(companyNames[i]),
        website: `https://www.${companyNames[i].replace(/\s+/g, '').toLowerCase()}.com`,
        isActive: Math.random() > 0.1, // 90% 활성
      },
    });
    companies.push(company);
    console.log(`  ✅ ${company.name} 생성 완료`);
  }

  // Golf clubs 생성
  console.log('🏌️ 골프클럽 데이터를 생성합니다...');
  const clubs = [];
  
  for (const company of companies) {
    // 각 회사마다 1개의 골프클럽 생성
    const club = await prisma.club.create({
      data: {
        name: `${company.name} Golf Club`,
        companyId: company.id,
        location: locations[Math.floor(Math.random() * locations.length)],
        address: `${company.address || locations[Math.floor(Math.random() * locations.length)]} 골프장로 123`,
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

  for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
    const company = companies[companyIndex];
    const club = clubs[companyIndex];
    
    // 각 회사마다 1~4개의 코스 생성
    const courseCount = Math.floor(Math.random() * 4) + 1;
    
    for (let courseIndex = 0; courseIndex < courseCount; courseIndex++) {
      const courseType = courseTypes[courseIndex % courseTypes.length];
      const courseName = `${company.name} ${courseType.prefix}`;
      
      const course = await prisma.course.create({
        data: {
          name: courseName,
          code: courseType.prefix,
          subtitle: courseType.difficulty,
          companyId: company.id,
          clubId: club.id,
          holeCount: 9,
          par: 36,
          totalDistance: Math.floor(Math.random() * 1000) + 2500, // 2500-3500m
          difficulty: Math.floor(Math.random() * 5) + 1,
          scenicRating: Math.floor(Math.random() * 5) + 1,
          description: `${courseName}는 자연과 조화를 이룬 아름다운 코스로, 모든 레벨의 골퍼들이 즐길 수 있도록 설계되었습니다.`,
          status: Math.random() > 0.05 ? 'ACTIVE' : 'MAINTENANCE', // 95% 활성
          isActive: true,
        },
      });

      totalCourses++;
      console.log(`  ⛳ ${courseName} 생성 완료`);

      // 각 코스에 9개 홀 생성
      console.log(`    🕳️  홀 생성 중...`);
      const holes = generateHoles(course.id, courseName);
      
      for (const holeData of holes) {
        const hole = await prisma.hole.create({
          data: holeData,
        });

        // 각 홀에 티박스 3~4개 생성
        const teeBoxTypes = [
          { name: '백티', color: 'WHITE', difficulty: 'PROFESSIONAL', distanceMultiplier: 1.0 },
          { name: '블루티', color: 'BLUE', difficulty: 'ADVANCED', distanceMultiplier: 0.9 },
          { name: '화이트티', color: 'WHITE', difficulty: 'INTERMEDIATE', distanceMultiplier: 0.8 },
          { name: '레드티', color: 'RED', difficulty: 'BEGINNER', distanceMultiplier: 0.7 },
        ];

        const teeBoxCount = Math.floor(Math.random() * 2) + 3; // 3~4개
        for (let teeIndex = 0; teeIndex < teeBoxCount; teeIndex++) {
          const teeType = teeBoxTypes[teeIndex];
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

      // 주간 스케줄 생성
      console.log(`    📅 주간 스케줄 생성 중...`);
      const weeklySchedules = generateWeeklySchedules(course.id);
      for (const scheduleData of weeklySchedules) {
        await prisma.courseWeeklySchedule.create({
          data: scheduleData,
        });
      }
    }
  }

  console.log('\n🎉 시드 데이터 생성이 완료되었습니다!');
  console.log(`📊 생성된 데이터 통계:`);
  console.log(`  • 회사: ${companies.length}개`);
  console.log(`  • 코스: ${totalCourses}개`);
  console.log(`  • 홀: ${totalHoles}개`);
  console.log(`  • 주간 스케줄: ${totalCourses * 7}개`);
  
  // 실제 개수 확인
  const actualCompanies = await prisma.company.count();
  const actualCourses = await prisma.course.count();
  const actualHoles = await prisma.hole.count();
  const actualTeeBoxes = await prisma.teeBox.count();
  const actualSchedules = await prisma.courseWeeklySchedule.count();
  
  console.log(`\n✅ 데이터베이스 확인:`);
  console.log(`  • 회사: ${actualCompanies}개`);
  console.log(`  • 코스: ${actualCourses}개`);
  console.log(`  • 홀: ${actualHoles}개`);
  console.log(`  • 티박스: ${actualTeeBoxes}개`);
  console.log(`  • 주간 스케줄: ${actualSchedules}개`);
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