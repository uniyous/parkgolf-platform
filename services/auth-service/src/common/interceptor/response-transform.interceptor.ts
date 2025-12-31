import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(response => {
        // null/undefined 처리
        if (response === null || response === undefined) {
          return { success: true, data: null };
        }

        // 이미 success 필드가 있으면 그대로 반환 (이미 래핑된 응답)
        if (typeof response === 'object' && 'success' in response) {
          return response;
        }

        // data 필드가 있으면 나머지는 메타로 처리
        if (typeof response === 'object' && 'data' in response) {
          const { data, ...meta } = response;

          // totalPages 자동 계산 (페이지네이션인 경우)
          if ('total' in meta && 'page' in meta && 'limit' in meta && !('totalPages' in meta)) {
            meta.totalPages = Math.ceil(meta.total / meta.limit);
          }

          return {
            success: true,
            data,
            ...(Object.keys(meta).length > 0 && meta),
          };
        }

        // data 필드가 없으면 전체를 data로
        return { success: true, data: response };
      }),
    );
  }
}
