/**
 * Account Deletion Reminder CronJob
 *
 * D-3, D-1 삭제 예정 사용자에게 리마인더 알림 발송
 * Schedule: 매일 09:00 KST
 *
 * NATS connect → iam.deletion.processReminders request → drain → exit
 */

const { connect, StringCodec } = require('nats');

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const TIMEOUT_MS = 30000;

async function main() {
  console.log(`[deletion-reminder] Connecting to NATS: ${NATS_URL}`);

  const nc = await connect({ servers: NATS_URL });
  const sc = StringCodec();

  console.log('[deletion-reminder] Connected. Sending iam.deletion.processReminders...');

  try {
    const msg = await nc.request(
      'iam.deletion.processReminders',
      sc.encode(JSON.stringify({})),
      { timeout: TIMEOUT_MS },
    );

    const result = JSON.parse(sc.decode(msg.data));
    console.log('[deletion-reminder] Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('[deletion-reminder] Error:', error.message);
    process.exitCode = 1;
  }

  await nc.drain();
  console.log('[deletion-reminder] Done.');
}

main().catch((err) => {
  console.error('[deletion-reminder] Fatal error:', err);
  process.exit(1);
});
