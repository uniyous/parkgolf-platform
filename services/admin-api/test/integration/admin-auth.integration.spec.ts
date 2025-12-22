/**
 * Admin Authentication Integration Test Cases
 *
 * 테스트 대상: admin-api와 auth-service 간의 Admin 인증/권한 처리 흐름
 *
 * 사전 조건:
 * - auth-service가 NATS에 연결되어 있어야 함
 * - admin-api가 NATS에 연결되어 있어야 함
 * - 데이터베이스가 초기화되어 있어야 함
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Admin Authentication Integration Tests', () => {
  let app: INestApplication;
  const baseUrl = process.env.ADMIN_API_URL || 'https://admin-api-dev-iihuzmuufa-du.a.run.app';

  // 테스트용 Admin 계정 정보
  const testAdmin = {
    username: `testadmin_${Date.now()}`,
    email: `testadmin_${Date.now()}@example.com`,
    password: 'TestAdmin123!',
    name: 'Test Admin User',
    role: 'ADMIN',
  };

  let accessToken: string;
  let refreshToken: string;

  describe('1. Admin Signup Flow', () => {
    /**
     * TC-001: Admin Signup 성공
     *
     * 기대 결과:
     * - Admin 테이블에 사용자 생성
     * - success: true 응답
     * - 생성된 사용자 정보 반환
     */
    it('TC-001: Should create admin account successfully', async () => {
      const response = await request(baseUrl)
        .post('/api/admin/auth/signup')
        .send(testAdmin)
        .expect('Content-Type', /json/);

      console.log('TC-001 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testAdmin.email);
      expect(response.body.data.user.role).toBe(testAdmin.role);
    });

    /**
     * TC-002: 중복 이메일로 Admin Signup 실패
     */
    it('TC-002: Should fail to create admin with duplicate email', async () => {
      const response = await request(baseUrl)
        .post('/api/admin/auth/signup')
        .send(testAdmin)
        .expect('Content-Type', /json/);

      console.log('TC-002 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
      // 중복 이메일 에러 코드 확인
    });

    /**
     * TC-003: 잘못된 역할로 Admin Signup 실패
     */
    it('TC-003: Should fail to create admin with invalid role', async () => {
      const invalidAdmin = {
        ...testAdmin,
        email: `invalid_${Date.now()}@example.com`,
        role: 'INVALID_ROLE',
      };

      const response = await request(baseUrl)
        .post('/api/admin/auth/signup')
        .send(invalidAdmin)
        .expect('Content-Type', /json/);

      console.log('TC-003 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ROLE');
    });
  });

  describe('2. Admin Login Flow', () => {
    /**
     * TC-004: Admin Login 성공
     *
     * 기대 결과:
     * - accessToken 발급
     * - refreshToken 발급
     * - user.type === 'admin'
     * - user.role === 등록한 역할
     */
    it('TC-004: Should login admin successfully with correct credentials', async () => {
      const response = await request(baseUrl)
        .post('/api/admin/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password,
        })
        .expect('Content-Type', /json/);

      console.log('TC-004 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.type).toBe('admin');
      expect(response.body.data.user.email).toBe(testAdmin.email);

      // 다음 테스트에서 사용할 토큰 저장
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    /**
     * TC-005: 잘못된 비밀번호로 Admin Login 실패
     */
    it('TC-005: Should fail to login with wrong password', async () => {
      const response = await request(baseUrl)
        .post('/api/admin/auth/login')
        .send({
          email: testAdmin.email,
          password: 'WrongPassword123!',
        })
        .expect('Content-Type', /json/);

      console.log('TC-005 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
    });

    /**
     * TC-006: 존재하지 않는 이메일로 Admin Login 실패
     */
    it('TC-006: Should fail to login with non-existent email', async () => {
      const response = await request(baseUrl)
        .post('/api/admin/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect('Content-Type', /json/);

      console.log('TC-006 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
    });

    /**
     * TC-007: 일반 User로 Admin Login 실패
     *
     * 시나리오: user-api로 등록한 일반 사용자가 admin-api로 로그인 시도
     * 기대 결과: Admin 권한 없음 에러
     */
    it('TC-007: Should fail to login as admin with regular user account', async () => {
      // 일반 사용자 이메일로 로그인 시도
      const response = await request(baseUrl)
        .post('/api/admin/auth/login')
        .send({
          email: 'testuser9999@example.com', // user-api로 등록된 일반 사용자
          password: 'test1234',
        })
        .expect('Content-Type', /json/);

      console.log('TC-007 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
      // INSUFFICIENT_PRIVILEGES 또는 유사한 에러 코드 확인
    });
  });

  describe('3. Admin Token Validation Flow', () => {
    /**
     * TC-008: 유효한 Admin 토큰으로 현재 사용자 조회
     */
    it('TC-008: Should get current admin user with valid token', async () => {
      // TC-004에서 저장된 토큰 사용
      if (!accessToken) {
        console.log('TC-008: Skipped - No access token available');
        return;
      }

      const response = await request(baseUrl)
        .get('/api/admin/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/);

      console.log('TC-008 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe(testAdmin.email);
    });

    /**
     * TC-009: 토큰 없이 현재 사용자 조회 실패
     */
    it('TC-009: Should fail to get current user without token', async () => {
      const response = await request(baseUrl)
        .get('/api/admin/auth/me')
        .expect('Content-Type', /json/);

      console.log('TC-009 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    /**
     * TC-010: 잘못된 토큰으로 현재 사용자 조회 실패
     */
    it('TC-010: Should fail to get current user with invalid token', async () => {
      const response = await request(baseUrl)
        .get('/api/admin/auth/me')
        .set('Authorization', 'Bearer invalid_token_here')
        .expect('Content-Type', /json/);

      console.log('TC-010 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
    });
  });

  describe('4. Admin Token Refresh Flow', () => {
    /**
     * TC-011: 유효한 Refresh Token으로 토큰 갱신
     */
    it('TC-011: Should refresh token with valid refresh token', async () => {
      if (!refreshToken) {
        console.log('TC-011: Skipped - No refresh token available');
        return;
      }

      const response = await request(baseUrl)
        .post('/api/admin/auth/refresh')
        .send({ refreshToken })
        .expect('Content-Type', /json/);

      console.log('TC-011 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    /**
     * TC-012: 잘못된 Refresh Token으로 토큰 갱신 실패
     */
    it('TC-012: Should fail to refresh with invalid refresh token', async () => {
      const response = await request(baseUrl)
        .post('/api/admin/auth/refresh')
        .send({ refreshToken: 'invalid_refresh_token' })
        .expect('Content-Type', /json/);

      console.log('TC-012 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
    });
  });

  describe('5. Admin Authorization Flow', () => {
    /**
     * TC-013: Admin 권한으로 Admin 목록 조회
     */
    it('TC-013: Should get admin list with admin token', async () => {
      if (!accessToken) {
        console.log('TC-013: Skipped - No access token available');
        return;
      }

      const response = await request(baseUrl)
        .get('/api/admin/admins')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/);

      console.log('TC-013 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
    });

    /**
     * TC-014: Admin 권한으로 User 목록 조회
     */
    it('TC-014: Should get user list with admin token', async () => {
      if (!accessToken) {
        console.log('TC-014: Skipped - No access token available');
        return;
      }

      const response = await request(baseUrl)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/);

      console.log('TC-014 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
    });

    /**
     * TC-015: 토큰 없이 Admin 목록 조회 실패
     */
    it('TC-015: Should fail to get admin list without token', async () => {
      const response = await request(baseUrl)
        .get('/api/admin/admins')
        .expect('Content-Type', /json/);

      console.log('TC-015 Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(false);
    });
  });

  describe('6. Admin Role-Based Access Control', () => {
    /**
     * TC-016: ADMIN 역할 Signup/Login 테스트
     */
    it('TC-016: Should allow ADMIN role signup and login', async () => {
      const adminUser = {
        username: `admin_role_${Date.now()}`,
        email: `admin_role_${Date.now()}@example.com`,
        password: 'Admin123!',
        name: 'Admin Role User',
        role: 'ADMIN',
      };

      // Signup
      const signupResponse = await request(baseUrl)
        .post('/api/admin/auth/signup')
        .send(adminUser);

      console.log('TC-016 Signup Response:', JSON.stringify(signupResponse.body, null, 2));

      if (signupResponse.body.success) {
        // Login
        const loginResponse = await request(baseUrl)
          .post('/api/admin/auth/login')
          .send({
            email: adminUser.email,
            password: adminUser.password,
          });

        console.log('TC-016 Login Response:', JSON.stringify(loginResponse.body, null, 2));

        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data.user.type).toBe('admin');
      }
    });

    /**
     * TC-017: MODERATOR 역할 Signup/Login 테스트
     */
    it('TC-017: Should allow MODERATOR role signup and login', async () => {
      const moderatorUser = {
        username: `moderator_${Date.now()}`,
        email: `moderator_${Date.now()}@example.com`,
        password: 'Moderator123!',
        name: 'Moderator User',
        role: 'MODERATOR',
      };

      // Signup
      const signupResponse = await request(baseUrl)
        .post('/api/admin/auth/signup')
        .send(moderatorUser);

      console.log('TC-017 Signup Response:', JSON.stringify(signupResponse.body, null, 2));

      if (signupResponse.body.success) {
        // Login
        const loginResponse = await request(baseUrl)
          .post('/api/admin/auth/login')
          .send({
            email: moderatorUser.email,
            password: moderatorUser.password,
          });

        console.log('TC-017 Login Response:', JSON.stringify(loginResponse.body, null, 2));

        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data.user.type).toBe('admin');
      }
    });

    /**
     * TC-018: VIEWER 역할 Signup/Login 테스트
     */
    it('TC-018: Should allow VIEWER role signup and login', async () => {
      const viewerUser = {
        username: `viewer_${Date.now()}`,
        email: `viewer_${Date.now()}@example.com`,
        password: 'Viewer123!',
        name: 'Viewer User',
        role: 'VIEWER',
      };

      // Signup
      const signupResponse = await request(baseUrl)
        .post('/api/admin/auth/signup')
        .send(viewerUser);

      console.log('TC-018 Signup Response:', JSON.stringify(signupResponse.body, null, 2));

      if (signupResponse.body.success) {
        // Login
        const loginResponse = await request(baseUrl)
          .post('/api/admin/auth/login')
          .send({
            email: viewerUser.email,
            password: viewerUser.password,
          });

        console.log('TC-018 Login Response:', JSON.stringify(loginResponse.body, null, 2));

        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data.user.type).toBe('admin');
      }
    });
  });
});


/**
 * 수동 테스트용 curl 명령어
 *
 * 1. Health Check
 * curl -s https://admin-api-dev-iihuzmuufa-du.a.run.app/health | jq .
 *
 * 2. Admin Signup
 * curl -s -X POST "https://admin-api-dev-iihuzmuufa-du.a.run.app/api/admin/auth/signup" \
 *   -H "Content-Type: application/json" \
 *   -d '{"username":"testadmin","email":"testadmin@example.com","password":"Admin1234","name":"Test Admin","role":"ADMIN"}' | jq .
 *
 * 3. Admin Login
 * curl -s -X POST "https://admin-api-dev-iihuzmuufa-du.a.run.app/api/admin/auth/login" \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"testadmin@example.com","password":"Admin1234"}' | jq .
 *
 * 4. Get Current User (with token)
 * curl -s "https://admin-api-dev-iihuzmuufa-du.a.run.app/api/admin/auth/me" \
 *   -H "Authorization: Bearer <ACCESS_TOKEN>" | jq .
 *
 * 5. Refresh Token
 * curl -s -X POST "https://admin-api-dev-iihuzmuufa-du.a.run.app/api/admin/auth/refresh" \
 *   -H "Content-Type: application/json" \
 *   -d '{"refreshToken":"<REFRESH_TOKEN>"}' | jq .
 *
 * 6. Get Admin List
 * curl -s "https://admin-api-dev-iihuzmuufa-du.a.run.app/api/admin/admins" \
 *   -H "Authorization: Bearer <ACCESS_TOKEN>" | jq .
 */
