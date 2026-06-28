import { Injectable } from '@nestjs/common';
import { PgProviderPort, PgProviderName, TossAdapter } from '@uniyous/pg-provider';
import { AppException, Errors } from '../common/exceptions';

/**
 * provider 식별자 → PG 어댑터. 멀티 PG 추가 시 여기 등록.
 * 어댑터는 stateless(자격증명 per-call)라 싱글턴 1개로 공유.
 */
@Injectable()
export class PgProviderRegistry {
  private readonly adapters: Partial<Record<PgProviderName, PgProviderPort>> = {
    TOSS: new TossAdapter(),
  };

  get(provider: PgProviderName): PgProviderPort {
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw new AppException(Errors.Payment.PG_UNSUPPORTED_PROVIDER, `미지원 PG: ${provider}`);
    }
    return adapter;
  }
}
