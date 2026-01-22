import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  PaginatedResponse,
  NatsResponse,
  isWrapped,
  isPaginated,
  hasData,
} from '../types/response.types';

type Response = ApiResponse<unknown> | PaginatedResponse<unknown>;

/**
 * NATS 응답 변환 인터셉터
 *
 * 변환 규칙:
 * - 이미 { success } 형태 → 그대로 반환
 * - { data, total, page, limit } → 페이지네이션 응답
 * - { data } → 단일 응답
 * - 그 외 → data로 래핑
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<Response> {
    return next.handle().pipe(map(this.transform));
  }

  private transform = (raw: unknown): Response => {
    if (isWrapped(raw)) return raw;

    if (isPaginated(raw)) {
      return NatsResponse.paginated(raw.data as unknown[], raw.total, raw.page, raw.limit);
    }

    if (hasData(raw)) {
      return NatsResponse.success(raw.data);
    }

    return NatsResponse.success(raw);
  };
}
