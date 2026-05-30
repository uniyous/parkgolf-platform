-- booking-service의 outbox_events 테이블명을 booking_outbox_events로 변경
-- 다른 도메인(payment_db.payment_outbox_events)과 명명 일관성 확보.
-- saga_db에는 더 이상 outbox_events가 없음 (사용되지 않아 2026-04-26 제거).

-- Rename table
ALTER TABLE "outbox_events" RENAME TO "booking_outbox_events";

-- Rename indexes (PostgreSQL은 테이블 rename 시 일부 인덱스 자동 변경하지 않으므로 명시적 rename)
ALTER INDEX "outbox_events_pkey" RENAME TO "booking_outbox_events_pkey";
ALTER INDEX "outbox_events_status_created_at_idx" RENAME TO "booking_outbox_events_status_created_at_idx";
ALTER INDEX "outbox_events_aggregate_type_aggregate_id_idx" RENAME TO "booking_outbox_events_aggregate_type_aggregate_id_idx";

-- Rename sequence
ALTER SEQUENCE "outbox_events_id_seq" RENAME TO "booking_outbox_events_id_seq";
