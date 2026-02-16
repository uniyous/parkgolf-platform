/**
 * Account Deletion Executor CronJob
 *
 * 유예 기간 만료 사용자 삭제 실행
 * Schedule: 매일 03:00 KST
 *
 * NATS connect → iam.deletion.execute request → drain → exit
 */

const { connect, StringCodec } = require('nats');

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const TIMEOUT_MS = 30000;

async function main() {
  console.log(`[deletion-executor] Connecting to NATS: ${NATS_URL}`);

  const nc = await connect({ servers: NATS_URL });
  const sc = StringCodec();

  console.log('[deletion-executor] Connected. Sending iam.deletion.execute...');

  try {
    const msg = await nc.request(
      'iam.deletion.execute',
      sc.encode(JSON.stringify({})),
      { timeout: TIMEOUT_MS },
    );

    const result = JSON.parse(sc.decode(msg.data));
    console.log('[deletion-executor] Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('[deletion-executor] Error:', error.message);
    process.exitCode = 1;
  }

  await nc.drain();
  console.log('[deletion-executor] Done.');
}

main().catch((err) => {
  console.error('[deletion-executor] Fatal error:', err);
  process.exit(1);
});
