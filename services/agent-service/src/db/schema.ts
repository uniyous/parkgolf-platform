// ==============================================
// agent-service / agent_db — Drizzle schema
// Hermes 5-Layer Memory — Layer 3 (Semantic Memory)
// 설계: docs/workflow/AGENT_MEMORY.md §5
// (UNI-82: Drizzle 전환 파일럿)
// ==============================================
import { pgTable, integer, jsonb, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * 사용자별 개인화 메모리 (부킹 패턴 / 선호도 / 친구 관계).
 * 컬럼명은 기존 DB 매핑과 동일하게 유지 (introspect 호환, DB 무변경).
 */
export const userMemory = pgTable(
  'user_memory',
  {
    userId: integer('user_id').primaryKey(),
    preferences: jsonb('preferences'),
    favoriteClubs: jsonb('favoriteClubs'),
    frequentTeammates: jsonb('frequentTeammates'),
    recentSummary: text('recentSummary'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('user_memory_updated_at_idx').on(t.updatedAt)],
);

export type UserMemoryRow = typeof userMemory.$inferSelect;
