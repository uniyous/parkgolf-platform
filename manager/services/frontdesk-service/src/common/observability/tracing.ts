/**
 * OpenTelemetry 트레이싱 — Cloud Trace export
 *
 * 반드시 main.ts의 첫 import 문으로 로드되어야 한다.
 * NestFactory보다 먼저 sdk.start() 호출 필요.
 *
 * 환경변수
 *   OTEL_SERVICE_NAME      서비스 식별 (Helm chart에서 자동 주입)
 *   OTEL_TRACES_SAMPLER    sampling 정책 (기본: parentbased_traceidratio)
 *   OTEL_TRACES_SAMPLER_ARG 비율 (기본: 1.0 = 100%)
 *
 * 자동 계측: HTTP / NestJS / outbound axios / NATS(부분) / Redis 등
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';

const serviceName = process.env.OTEL_SERVICE_NAME || 'unknown-service';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
      process.env.NODE_ENV || 'development',
  }),
  traceExporter: new TraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // 노이즈성 file system 계측 비활성
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

try {
  sdk.start();
  // eslint-disable-next-line no-console
  console.log(`[tracing] OpenTelemetry started for service=${serviceName}`);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[tracing] OpenTelemetry start failed', err);
}

// graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('[tracing] shutdown complete'))
    .catch((err) => console.error('[tracing] shutdown error', err));
});
