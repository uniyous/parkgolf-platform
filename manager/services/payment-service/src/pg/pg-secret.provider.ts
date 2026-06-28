import { Injectable, Logger } from '@nestjs/common';
import { AppException, Errors } from '../common/exceptions';

/**
 * PG 시크릿 해석 — secretRef(이름) → 실제 시크릿 키.
 * 어댑터는 키를 모르고(per-call 주입), 출처는 이 포트가 격리.
 */
export interface PgSecretProvider {
  getSecret(secretRef: string): Promise<string>;
}

export const PG_SECRET_PROVIDER = Symbol('PG_SECRET_PROVIDER');

/**
 * env 기반 구현 — secretRef = 환경변수 이름.
 * Secret Manager 연동(GCP)은 후속([3c-ii]/배포). 인터페이스는 동일.
 */
@Injectable()
export class EnvPgSecretProvider implements PgSecretProvider {
  private readonly logger = new Logger(EnvPgSecretProvider.name);

  async getSecret(secretRef: string): Promise<string> {
    const value = process.env[secretRef];
    if (!value) {
      this.logger.error(`PG secret not found for ref=${secretRef}`);
      throw new AppException(Errors.Payment.PG_SECRET_MISSING, `시크릿 미설정: ${secretRef}`);
    }
    return value;
  }
}
