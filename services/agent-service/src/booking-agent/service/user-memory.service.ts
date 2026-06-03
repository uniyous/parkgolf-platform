import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { userMemory } from '../../db/schema';

/**
 * Hermes 5-Layer Memory — Layer 3 (Semantic Memory)
 *
 * 사용자별 부킹 패턴/선호도를 규칙 기반으로 누적.
 * 매 부킹 완료 시 mergeBookingResult 호출 (fire-and-forget OK).
 * LLM 호출 직전 formatProfile 결과를 system message로 prefill.
 *
 * 설계: docs/workflow/AGENT_MEMORY.md §5
 */

export interface UserPreferences {
  preferredTimes?: string[];        // ['morning', 'afternoon', 'evening', 'weekend_morning']
  paymentMethod?: string;           // most frequent
  avgGroupSize?: number;
}

export interface FavoriteClub {
  clubId: number;
  name: string;
  visitCount: number;
}

export interface FrequentTeammate {
  userId: number;
  name: string;
  count: number;
}

export interface UserMemorySnapshot {
  userId: number;
  enabled: boolean;
  preferences: UserPreferences | null;
  favoriteClubs: FavoriteClub[];
  frequentTeammates: FrequentTeammate[];
  recentSummary: string | null;
}

export interface BookingCompletedEvent {
  userId: number;
  bookingId: number;
  clubId: number;
  clubName: string;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:mm
  playerCount: number;
  paymentMethod: string; // 'onsite' | 'card' | 'dutchpay'
  teamMembers?: Array<{ userId: number; userName: string }>;
}

@Injectable()
export class UserMemoryService {
  private readonly logger = new Logger(UserMemoryService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  async get(userId: number): Promise<UserMemorySnapshot | null> {
    const [row] = await this.drizzle.db
      .select()
      .from(userMemory)
      .where(eq(userMemory.userId, userId))
      .limit(1);
    if (!row) return null;
    return {
      userId: row.userId,
      enabled: row.enabled,
      preferences: (row.preferences as UserPreferences | null) ?? null,
      favoriteClubs: (row.favoriteClubs as FavoriteClub[] | null) ?? [],
      frequentTeammates: (row.frequentTeammates as FrequentTeammate[] | null) ?? [],
      recentSummary: row.recentSummary ?? null,
    };
  }

  /**
   * 프라이버시 토글 — 사용자가 OFF 시 메모리 미활용.
   */
  async setEnabled(userId: number, enabled: boolean): Promise<void> {
    await this.drizzle.db
      .insert(userMemory)
      .values({ userId, enabled })
      .onConflictDoUpdate({
        target: userMemory.userId,
        set: { enabled, updatedAt: new Date() },
      });
  }

  /**
   * 매 부킹 완료 시 호출 — 규칙 기반 누적.
   * (LLM 호출 없이 빠르게, fire-and-forget으로 호출되어도 안전)
   */
  async mergeBookingResult(event: BookingCompletedEvent): Promise<void> {
    try {
      const current = await this.get(event.userId);
      if (current && !current.enabled) {
        this.logger.debug(`User ${event.userId} memory disabled — skip merge`);
        return;
      }

      // favoriteClubs: clubId visitCount 누적
      const clubs = current?.favoriteClubs ?? [];
      const clubIdx = clubs.findIndex((c) => c.clubId === event.clubId);
      if (clubIdx >= 0) {
        clubs[clubIdx].visitCount += 1;
        clubs[clubIdx].name = event.clubName; // 이름 최신화
      } else {
        clubs.push({ clubId: event.clubId, name: event.clubName, visitCount: 1 });
      }
      // visitCount desc 정렬 + top 10 보존
      clubs.sort((a, b) => b.visitCount - a.visitCount);
      const favoriteClubs = clubs.slice(0, 10);

      // frequentTeammates: teamMembers 누적 (본인 제외)
      const teammates = current?.frequentTeammates ?? [];
      for (const m of event.teamMembers ?? []) {
        if (m.userId === event.userId) continue;
        const idx = teammates.findIndex((t) => t.userId === m.userId);
        if (idx >= 0) {
          teammates[idx].count += 1;
          teammates[idx].name = m.userName;
        } else {
          teammates.push({ userId: m.userId, name: m.userName, count: 1 });
        }
      }
      teammates.sort((a, b) => b.count - a.count);
      const frequentTeammates = teammates.slice(0, 10);

      // preferences: preferredTimes (시간대 분류) 빈도
      const prevPrefs: UserPreferences = current?.preferences ?? {};
      const timeBucket = this.classifyTimeBucket(event.startTime, event.date);
      const counts: Record<string, number> = {};
      // 이전 데이터를 카운트로 복원하지 않고 (간단화) 가장 최근 1건 우선 + 직전 paymentMethod 갱신
      if (timeBucket) counts[timeBucket] = (counts[timeBucket] || 0) + 1;
      const preferredTimes = prevPrefs.preferredTimes ?? [];
      if (timeBucket && !preferredTimes.includes(timeBucket)) {
        preferredTimes.unshift(timeBucket);
      }
      // 길이 제한 3개
      const preferences: UserPreferences = {
        preferredTimes: preferredTimes.slice(0, 3),
        paymentMethod: event.paymentMethod ?? prevPrefs.paymentMethod,
        avgGroupSize: prevPrefs.avgGroupSize
          ? Math.round((prevPrefs.avgGroupSize + event.playerCount) / 2)
          : event.playerCount,
      };

      // recentSummary: 마지막 1줄
      const recentSummary = `${event.clubName} · ${event.date} ${event.startTime} · ${event.playerCount}명 · ${event.paymentMethod}`;

      await this.drizzle.db
        .insert(userMemory)
        .values({
          userId: event.userId,
          preferences,
          favoriteClubs,
          frequentTeammates,
          recentSummary,
        })
        .onConflictDoUpdate({
          target: userMemory.userId,
          set: {
            preferences,
            favoriteClubs,
            frequentTeammates,
            recentSummary,
            updatedAt: new Date(),
          },
        });

      this.logger.debug(`UserMemory merged: user=${event.userId}, clubs=${favoriteClubs.length}, teammates=${frequentTeammates.length}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      // 메모리 갱신 실패는 서비스 흐름에 영향 주지 않음 (best-effort)
      this.logger.warn(`mergeBookingResult failed (user=${event.userId}): ${msg}`);
    }
  }

  /**
   * LLM system message용 1~2줄 프로파일 텍스트.
   * 없으면 null 반환 → 호출자가 주입 skip.
   */
  formatProfile(snapshot: UserMemorySnapshot | null): string | null {
    if (!snapshot || !snapshot.enabled) return null;
    const parts: string[] = [];

    if (snapshot.favoriteClubs.length > 0) {
      const top = snapshot.favoriteClubs
        .slice(0, 3)
        .map((c) => `${c.name}(${c.visitCount}회)`)
        .join(', ');
      parts.push(`자주 가는 클럽: ${top}`);
    }
    if (snapshot.frequentTeammates.length > 0) {
      const top = snapshot.frequentTeammates
        .slice(0, 3)
        .map((t) => `${t.name}(${t.count}회)`)
        .join(', ');
      parts.push(`자주 함께하는 멤버: ${top}`);
    }
    const prefs = snapshot.preferences;
    if (prefs?.preferredTimes && prefs.preferredTimes.length > 0) {
      parts.push(`선호 시간대: ${prefs.preferredTimes.join('/')}`);
    }
    if (prefs?.paymentMethod) {
      parts.push(`주 결제 방법: ${prefs.paymentMethod}`);
    }
    if (prefs?.avgGroupSize) {
      parts.push(`평균 인원: ${prefs.avgGroupSize}명`);
    }
    if (snapshot.recentSummary) {
      parts.push(`최근 부킹: ${snapshot.recentSummary}`);
    }

    return parts.length > 0 ? parts.join(' / ') : null;
  }

  /**
   * 사용자 계정 삭제 시 정리.
   */
  async deleteByUser(userId: number): Promise<void> {
    await this.drizzle.db.delete(userMemory).where(eq(userMemory.userId, userId));
  }

  // ─── 내부 ───────────────────────────────────────────

  private classifyTimeBucket(startTime: string, date: string): string | null {
    if (!startTime) return null;
    const hour = parseInt(startTime.split(':')[0] ?? '0', 10);
    if (Number.isNaN(hour)) return null;

    // 주말 가중치
    const dayOfWeek = date ? new Date(date).getDay() : -1;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (hour < 12) return isWeekend ? 'weekend_morning' : 'morning';
    if (hour < 18) return isWeekend ? 'weekend_afternoon' : 'afternoon';
    return isWeekend ? 'weekend_evening' : 'evening';
  }
}
