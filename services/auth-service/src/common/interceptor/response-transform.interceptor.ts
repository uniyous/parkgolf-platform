import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  PaginatedResponse,
  RawDataResponse,
  NatsResponse,
} from '../types/response.types';

/**
 * NATS 응답 변환 인터셉터
 *
 * 컨트롤러 반환값을 표준 응답 형식으로 자동 변환합니다.
 *
 * 변환 규칙:
 * - null/undefined → { success: true, data: null }
 * - 이미 success 필드가 있으면 그대로 반환
 * - { data, total, page, limit } → 페이지네이션 응답
 * - { data } → 단일 데이터 응답
 * - 그 외 → 전체를 data로 래핑
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown> | PaginatedResponse<unknown>> {
    return next.handle().pipe(map((response) => this.transformResponse(response)));
  }

  private transformResponse(
    response: unknown,
  ): ApiResponse<unknown> | PaginatedResponse<unknown> {
    // null/undefined 처리
    if (response === null || response === undefined) {
      return NatsResponse.success(null);
    }

    // 객체가 아닌 경우 (primitive)
    if (typeof response !== 'object') {
      return NatsResponse.success(response);
    }

    const responseObj = response as Record<string, unknown>;

    // 이미 success 필드가 있으면 그대로 반환
    if ('success' in responseObj) {
      return response as ApiResponse<unknown>;
    }

    // data 필드가 있으면 표준 응답 형식으로 변환
    if ('data' in responseObj) {
      return this.transformDataResponse(responseObj as unknown as RawDataResponse);
    }

    // data 필드가 없으면 전체를 data로 래핑
    return NatsResponse.success(response);
  }

  private transformDataResponse(
    response: RawDataResponse,
  ): ApiResponse<unknown> | PaginatedResponse<unknown> {
    const { data, total, page, limit, totalPages } = response;

    // 페이지네이션 메타 정보가 있는 경우
    if (
      total !== undefined &&
      page !== undefined &&
      limit !== undefined
    ) {
      return {
        success: true,
        data,
        total,
        page,
        limit,
        totalPages: totalPages ?? Math.ceil(total / limit),
      };
    }

    // 단순 데이터 응답
    return NatsResponse.success(data);
  }
}
