/**
 * 채팅 참여자 이름 동기화 스크립트
 *
 * 문제: chat_db.chat_room_members.userName에 이메일이 저장된 경우
 * 원인: 기존 name||email 폴백 로직으로 이름이 없으면 이메일이 저장됨
 *
 * 수행 작업:
 * 1. iam_db.users에서 name이 NULL/빈값인 사용자 → 이메일 앞부분으로 이름 설정
 * 2. chat_db.chat_room_members에서 userName이 이메일인 레코드 → 실제 이름으로 갱신
 * 3. chat_db.chat_messages에서 senderName이 이메일인 레코드 → 실제 이름으로 갱신
 *
 * 실행:
 *   cd services/iam-service && npx ts-node ../../scripts/fix-chat-member-names.ts
 */

import { PrismaClient } from '@prisma/client';

const IAM_DB_URL = process.env.IAM_DATABASE_URL
  || 'postgresql://parkgolf:uniyous1234@34.158.211.242:5432/iam_db?schema=public';
const CHAT_DB_URL = process.env.CHAT_DATABASE_URL
  || 'postgresql://parkgolf:uniyous1234@34.158.211.242:5432/chat_db?schema=public';

interface UserRow {
  id: number;
  email: string;
  name: string | null;
}

interface AffectedMember {
  id: string;
  userId: number;
  userName: string;
}

interface AffectedMessage {
  id: string;
  senderId: number;
  senderName: string;
}

async function main() {
  console.log('=== 채팅 참여자 이름 동기화 시작 ===\n');

  // 두 DB에 별도 Prisma 클라이언트 연결
  const iamDb = new PrismaClient({
    datasources: { db: { url: IAM_DB_URL } },
  });
  const chatDb = new PrismaClient({
    datasources: { db: { url: CHAT_DB_URL } },
  });

  try {
    await iamDb.$connect();
    console.log('[OK] iam_db 연결 성공');
    await chatDb.$connect();
    console.log('[OK] chat_db 연결 성공\n');

    // ─── Step 1: iam_db에서 이름 없는 사용자 수정 ───
    console.log('--- Step 1: iam_db 사용자 이름 보정 ---');

    const usersWithoutName = await iamDb.$queryRawUnsafe<UserRow[]>(`
      SELECT id, email, name
      FROM users
      WHERE name IS NULL OR TRIM(name) = ''
    `);

    console.log(`이름 없는 사용자: ${usersWithoutName.length}명`);

    for (const user of usersWithoutName) {
      const derivedName = user.email.split('@')[0];
      await iamDb.$executeRawUnsafe(
        `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`,
        derivedName,
        user.id,
      );
      console.log(`  [UPDATE] userId=${user.id}: "${user.email}" → name="${derivedName}"`);
    }

    // ─── Step 2: 전체 사용자 이름 매핑 조회 ───
    console.log('\n--- Step 2: 사용자 이름 매핑 로드 ---');

    const allUsers = await iamDb.$queryRawUnsafe<UserRow[]>(`
      SELECT id, email, name FROM users
    `);

    const nameMap = new Map<number, string>();
    for (const u of allUsers) {
      nameMap.set(u.id, u.name || u.email.split('@')[0]);
    }
    console.log(`전체 사용자: ${allUsers.length}명 로드 완료`);

    // ─── Step 3: chat_room_members 이메일 → 이름 갱신 ───
    console.log('\n--- Step 3: chat_room_members 이름 갱신 ---');

    const emailMembers = await chatDb.$queryRawUnsafe<AffectedMember[]>(`
      SELECT id, "userId", "userName"
      FROM chat_room_members
      WHERE "userName" LIKE '%@%'
        AND "leftAt" IS NULL
    `);

    console.log(`이메일이 이름으로 저장된 멤버: ${emailMembers.length}건`);

    let memberUpdated = 0;
    for (const member of emailMembers) {
      const realName = nameMap.get(member.userId);
      if (realName && realName !== member.userName) {
        await chatDb.$executeRawUnsafe(
          `UPDATE chat_room_members SET "userName" = $1 WHERE id = $2`,
          realName,
          member.id,
        );
        console.log(`  [UPDATE] memberId=${member.id}: "${member.userName}" → "${realName}"`);
        memberUpdated++;
      }
    }
    console.log(`갱신된 멤버: ${memberUpdated}건`);

    // ─── Step 4: chat_messages senderName 갱신 ───
    console.log('\n--- Step 4: chat_messages 발신자 이름 갱신 ---');

    const emailMessages = await chatDb.$queryRawUnsafe<AffectedMessage[]>(`
      SELECT id, "senderId", "senderName"
      FROM chat_messages
      WHERE "senderName" LIKE '%@%'
        AND "deletedAt" IS NULL
    `);

    console.log(`이메일이 발신자명으로 저장된 메시지: ${emailMessages.length}건`);

    // 배치 업데이트 (senderId 단위로 묶어서)
    const senderIds = [...new Set(emailMessages.map((m) => m.senderId))];
    let messageUpdated = 0;

    for (const senderId of senderIds) {
      const realName = nameMap.get(senderId);
      if (!realName) continue;

      const result = await chatDb.$executeRawUnsafe(
        `UPDATE chat_messages
         SET "senderName" = $1
         WHERE "senderId" = $2
           AND "senderName" LIKE '%@%'
           AND "deletedAt" IS NULL`,
        realName,
        senderId,
      );
      const count = typeof result === 'number' ? result : 0;
      if (count > 0) {
        console.log(`  [UPDATE] senderId=${senderId}: → "${realName}" (${count}건)`);
        messageUpdated += count;
      }
    }
    console.log(`갱신된 메시지: ${messageUpdated}건`);

    // ─── 요약 ───
    console.log('\n=== 동기화 완료 ===');
    console.log(`  사용자 이름 보정: ${usersWithoutName.length}명`);
    console.log(`  채팅 멤버 갱신:   ${memberUpdated}건`);
    console.log(`  채팅 메시지 갱신: ${messageUpdated}건`);

  } catch (error) {
    console.error('\n[ERROR] 스크립트 실행 실패:', error);
    process.exit(1);
  } finally {
    await iamDb.$disconnect();
    await chatDb.$disconnect();
    console.log('\nDB 연결 해제 완료');
  }
}

main();
