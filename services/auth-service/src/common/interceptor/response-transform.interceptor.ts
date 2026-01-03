import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PaginatedResponse, PaginationMeta } from '../types/response.types';

/**
 * 응답 데이터 타입 정의
 */
interface RawDataResponse {
  data: unknown;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

/**
 * NATS 응답 변환 인터셉터
 *
 * 컨트롤러 반환값을 표준 응답 형식으로 자동 변환합니다.
 *
 * 응답 형식:
 * 1. ApiResponse<T>: { success: true, data: T }
 * 2. PaginatedResponse<T>: { success: true, data: T[], total, page, limit, totalPages }
 *
 * 변환 규칙:
 * - null/undefined → { success: true, data: null }
 * - 이미 success 필드가 있으면 그대로 반환
 * - { data, total, page, limit } 형식이면 페이지네이션 응답으로 변환
 * - { data } 형식이면 단일 데이터 응답으로 변환
 * - 그 외는 전체를 data로 래핑
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<unknown> | PaginatedResponse<unknown>> {
    return next.handle().pipe(
      map(response => this.transformResponse(response)),
    );
  }

  private transformResponse(response: unknown): ApiResponse<unknown> | PaginatedResponse<unknown> {
    // null/undefined 처리
    if (response === null || response === undefined) {
      return { success: true, data: null };
    }

    // 객체가 아닌 경우 (primitive)
    if (typeof response !== 'object') {
      return { success: true, data: response };
    }

    const responseObj = response as Record<string, unknown>;

    // 이미 success 필드가 있으면 그대로 반환 (이미 래핑된 응답)
    if ('success' in responseObj) {
      return response as ApiResponse<unknown>;
    }

    // data 필드가 있으면 표준 응답 형식으로 변환
    if ('data' in responseObj) {
      return this.transformDataResponse(responseObj as unknown as RawDataResponse);
    }

    // data 필드가 없으면 전체를 data로 래핑
    return { success: true, data: response };
  }

  private transformDataResponse(response: RawDataResponse): ApiResponse<unknown> | PaginatedResponse<unknown> {
    const { data, ...meta } = response;

    // 페이지네이션 메타 정보가 있는 경우
    if (this.isPaginationMeta(meta)) {
      const paginationMeta = this.buildPaginationMeta(meta);
      return {
        success: true,
        data,
        ...paginationMeta,
      };
    }

    // 추가 메타 정보가 있는 경우
    if (Object.keys(meta).length > 0) {
      return {
        success: true,
        data,
        ...meta,
      } as ApiResponse<unknown>;
    }

    // 단순 데이터 응답
    return { success: true, data };
  }

  private isPaginationMeta(meta: Partial<PaginationMeta>): meta is Partial<PaginationMeta> & { total: number; page: number; limit: number } {
    return 'total' in meta && 'page' in meta && 'limit' in meta;
  }

  private buildPaginationMeta(meta: Partial<PaginationMeta> & { total: number; page: number; limit: number }): PaginationMeta {
    return {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages: meta.totalPages ?? Math.ceil(meta.total / meta.limit),
    };
  }
}
