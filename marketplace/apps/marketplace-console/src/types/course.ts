/**
 * Course/Game 관련 타입 정의
 *
 * Club, Course 타입은 기존 club.ts / index.ts에서 정의.
 * 여기서는 Game 타입만 추가 정의하고, 편의 re-export 제공.
 */

export type { Club, ClubStatus, ClubType } from './club';
export type { Course } from './index';

export interface Game {
  id: number;
  name: string;
  code: string;
  totalHoles: number;
  estimatedDuration: number;
  maxPlayers: number;
  basePrice: number;
  weekendPrice: number | null;
  slotMode: 'TEE_TIME' | 'SESSION';
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  clubId: number;
  club?: { id: number; name: string };
  frontNineCourse?: { id: number; name: string };
  backNineCourse?: { id: number; name: string };
}
