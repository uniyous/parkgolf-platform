-- saga-service의 outbox_events 테이블 제거
-- payment-service의 payment_outbox_events만 사용 중이며, saga-service는 동기 NATS request-reply로
-- 모든 step을 처리하므로 자체 outbox 패턴이 필요하지 않음.
-- 운영 환경의 saga_db.outbox_events 테이블은 사용된 적 없음 (빈 테이블).

-- DropIndex
DROP INDEX IF EXISTS "outbox_events_status_created_at_idx";
DROP INDEX IF EXISTS "outbox_events_aggregate_type_aggregate_id_idx";

-- DropTable
DROP TABLE IF EXISTS "outbox_events";

-- DropEnum
DROP TYPE IF EXISTS "OutboxStatus";
