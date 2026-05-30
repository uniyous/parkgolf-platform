-- PaymentSplit에 paymentKey 컬럼 추가 (환불 시 Toss API 호출용)
-- 기존 PAID split은 paymentKey 없으니 환불 불가 — 신규 split부터 정상 동작.

ALTER TABLE "payment_splits" ADD COLUMN "payment_key" TEXT;
