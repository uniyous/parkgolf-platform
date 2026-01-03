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
 * NATS 응답 변환 인터셉터
 *
 * 컨트롤러 반환값을 { success: true, data, ...meta } 형태로 자동 변환
 *
 * 사용 예시:
 * - 단일 데이터: return { data: entity } → { success: true, data: entity }
 * - 페이지네이션: return { data: [...], total, page, limit } → { success: true, data: [...], total, page, limit, totalPages }
 * - 직접 반환: return entity → { success: true, data: entity }
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

    // 이미 success 필드가 있으면 그대로 반환 (이미 래핑된 응답)
    if (this.isApiResponse(response)) {
      return response;
    }

    // data 필드가 있으면 나머지는 메타로 처리
    if (this.hasDataField(response)) {
      return this.transformDataResponse(response);
    }

    // data 필드가 없으면 전체를 data로
    return { success: true, data: response };
  }

  private isApiResponse(response: unknown): response is ApiResponse<unknown> {
    return (
      typeof response === 'object' &&
      response !== null &&
      'success' in response &&
      (response as ApiResponse<unknown>).success === true
    );
  }

  private hasDataField(response: unknown): response is { data: unknown } & Record<string, unknown> {
    return typeof response === 'object' && response !== null && 'data' in response;
  }

  private transformDataResponse(response: { data: unknown } & Record<string, unknown>): ApiResponse<unknown> | PaginatedResponse<unknown> {
    const { data, ...meta } = response;

    // 페이지네이션 응답인지 확인
    if (this.isPaginationMeta(meta)) {
      const paginationMeta: PaginationMeta = {
        total: meta.total,
        page: meta.page,
        limit: meta.limit,
        totalPages: meta.totalPages ?? Math.ceil(meta.total / meta.limit),
      };

      return {
        success: true,
        data: data as unknown[],
        ...paginationMeta,
      };
    }

    // 일반 응답
    return { success: true, data };
  }

  private isPaginationMeta(meta: Record<string, unknown>): meta is PaginationMeta {
    return 'total' in meta && 'page' in meta && 'limit' in meta;
  }
}
