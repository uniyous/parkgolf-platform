#!/usr/bin/env node

/**
 * NATS 마이크로서비스 간 통신 테스트 스크립트
 *
 * 사용법:
 * node scripts/test-nats-communication.js [NATS_URL]
 *
 * 예시:
 * node scripts/test-nats-communication.js nats://10.178.0.7:4222
 */

const { connect } = require('nats');

const NATS_URL = process.argv[2] || 'nats://localhost:4222';
const TIMEOUT = 10000; // 10초

console.log('🧪 ParkGolf 마이크로서비스 NATS 통신 테스트');
console.log(`📡 NATS URL: ${NATS_URL}`);
console.log('=' .repeat(60));

async function testNatsConnection() {
  let nc;

  try {
    console.log('🔗 NATS 서버 연결 중...');
    nc = await connect({ servers: [NATS_URL] });
    console.log('✅ NATS 서버 연결 성공');

    // Auth Service 테스트
    await testAuthService(nc);

    // Course Service 테스트
    await testCourseService(nc);

    // User API가 다른 서비스들과 통신하는지 테스트
    console.log('\n🔄 서비스 간 통신 요약:');
    console.log('- Auth Service: 인증/사용자 관리 (queue: auth-service)');
    console.log('- Course Service: 코스 관리 (queue: course-service)');
    console.log('- Booking Service: 예약 관리 (queue: booking-service)');
    console.log('- User API: 클라이언트 요청을 마이크로서비스로 라우팅');
    console.log('- Admin API: 관리자 요청을 마이크로서비스로 라우팅');

    console.log('\n✅ 모든 NATS 통신 테스트 완료');

  } catch (error) {
    console.error('❌ NATS 연결 실패:', error.message);
    process.exit(1);
  } finally {
    if (nc) {
      await nc.close();
      console.log('🔌 NATS 연결 종료');
    }
  }
}

async function testAuthService(nc) {
  console.log('\n🔐 Auth Service 테스트');

  try {
    // 테스트 로그인 요청
    const loginPayload = {
      email: 'test@example.com',
      password: 'password123!'
    };

    console.log('  📤 auth.login 메시지 전송...');
    const response = await nc.request('auth.login', JSON.stringify(loginPayload), { timeout: TIMEOUT });
    const result = JSON.parse(response.data);

    if (result.success) {
      console.log('  ✅ auth.login 응답 성공');
      console.log(`  📋 응답 데이터: ${result.data ? '토큰 포함' : '데이터 없음'}`);
    } else {
      console.log('  ⚠️  auth.login 응답: ', result.error?.message || 'Unknown error');
    }
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      console.log('  ⏰ auth.login 타임아웃 - Auth Service가 응답하지 않습니다');
    } else {
      console.log('  ❌ auth.login 오류:', error.message);
    }
  }

  // 사용자 목록 조회 테스트
  try {
    console.log('  📤 users.list 메시지 전송...');
    const usersPayload = {
      page: 1,
      limit: 10,
      token: 'test-token'
    };

    const response = await nc.request('users.list', JSON.stringify(usersPayload), { timeout: TIMEOUT });
    const result = JSON.parse(response.data);

    if (result.success) {
      console.log('  ✅ users.list 응답 성공');
    } else {
      console.log('  ⚠️  users.list 응답:', result.error?.message || 'Unknown error');
    }
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      console.log('  ⏰ users.list 타임아웃 - Auth Service가 응답하지 않습니다');
    } else {
      console.log('  ❌ users.list 오류:', error.message);
    }
  }
}

async function testCourseService(nc) {
  console.log('\n🏌️ Course Service 테스트');

  try {
    // 코스 목록 조회 테스트
    console.log('  📤 courses.list 메시지 전송...');
    const coursesPayload = {
      page: 1,
      limit: 10
    };

    const response = await nc.request('courses.list', JSON.stringify(coursesPayload), { timeout: TIMEOUT });
    const result = JSON.parse(response.data);

    if (result && result.courses) {
      console.log('  ✅ courses.list 응답 성공');
      console.log(`  📋 코스 수: ${result.courses.length}`);
    } else {
      console.log('  ⚠️  courses.list 응답: 예상과 다른 형식');
      console.log('  📋 응답:', JSON.stringify(result).substring(0, 200));
    }
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      console.log('  ⏰ courses.list 타임아웃 - Course Service가 응답하지 않습니다');
    } else {
      console.log('  ❌ courses.list 오류:', error.message);
    }
  }

  // 타임슬롯 조회 테스트
  try {
    console.log('  📤 timeslots.list 메시지 전송...');
    const timeslotsPayload = {
      filters: {
        page: 1,
        limit: 10
      }
    };

    const response = await nc.request('timeslots.list', JSON.stringify(timeslotsPayload), { timeout: TIMEOUT });
    const result = JSON.parse(response.data);

    console.log('  ✅ timeslots.list 응답 수신');
    console.log(`  📋 응답 크기: ${JSON.stringify(result).length} chars`);
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      console.log('  ⏰ timeslots.list 타임아웃 - Course Service가 응답하지 않습니다');
    } else {
      console.log('  ❌ timeslots.list 오류:', error.message);
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  testNatsConnection().catch(console.error);
}

module.exports = { testNatsConnection };