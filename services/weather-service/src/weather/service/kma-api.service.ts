import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppException, Errors } from '../../common/exceptions';

/**
 * 기상청 API 응답 구조
 */
interface KmaApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body?: {
      dataType: string;
      items: {
        item: KmaWeatherItem[];
      };
      pageNo: number;
      numOfRows: number;
      totalCount: number;
    };
  };
}

/**
 * 기상청 날씨 데이터 항목
 */
export interface KmaWeatherItem {
  baseDate: string;     // 발표일자 (YYYYMMDD)
  baseTime: string;     // 발표시각 (HHMM)
  category: string;     // 자료구분 (T1H, RN1, SKY 등)
  fcstDate?: string;    // 예보일자
  fcstTime?: string;    // 예보시각
  fcstValue?: string;   // 예보값
  nx: number;
  ny: number;
  obsrValue?: string;   // 관측값 (실황)
}

/**
 * 날씨 카테고리 코드
 */
export const WEATHER_CATEGORY = {
  // 초단기실황
  T1H: 'T1H',   // 기온 (℃)
  RN1: 'RN1',   // 1시간 강수량 (mm)
  UUU: 'UUU',   // 동서바람성분 (m/s)
  VVV: 'VVV',   // 남북바람성분 (m/s)
  REH: 'REH',   // 습도 (%)
  PTY: 'PTY',   // 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
  VEC: 'VEC',   // 풍향 (deg)
  WSD: 'WSD',   // 풍속 (m/s)

  // 단기예보 추가
  POP: 'POP',   // 강수확률 (%)
  SKY: 'SKY',   // 하늘상태 (1:맑음, 3:구름많음, 4:흐림)
  TMP: 'TMP',   // 1시간 기온 (℃)
  TMN: 'TMN',   // 일 최저기온 (℃)
  TMX: 'TMX',   // 일 최고기온 (℃)
  PCP: 'PCP',   // 1시간 강수량 (범주: 1mm 미만 등)
  SNO: 'SNO',   // 1시간 신적설 (범주)
  WAV: 'WAV',   // 파고 (M)
} as const;

/**
 * 기상청 API 클라이언트 서비스
 */
@Injectable()
export class KmaApiService {
  private readonly logger = new Logger(KmaApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('KMA_API_URL') ||
      'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
    this.apiKey = this.configService.get<string>('KMA_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('KMA_API_KEY is not configured');
    }
  }

  /**
   * 초단기실황 조회 (현재 날씨)
   * 매시 정각 발표, 10분 후 API 제공
   */
  async getUltraSrtNcst(nx: number, ny: number): Promise<KmaWeatherItem[]> {
    const { baseDate, baseTime } = this.getUltraSrtNcstBaseTime();

    const params = {
      serviceKey: this.apiKey,
      pageNo: 1,
      numOfRows: 10,
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
    };

    return this.callApi('/getUltraSrtNcst', params);
  }

  /**
   * 초단기예보 조회 (6시간 예보)
   * 매시 30분 발표
   */
  async getUltraSrtFcst(nx: number, ny: number): Promise<KmaWeatherItem[]> {
    const { baseDate, baseTime } = this.getUltraSrtFcstBaseTime();

    const params = {
      serviceKey: this.apiKey,
      pageNo: 1,
      numOfRows: 60, // 6시간 * 10개 항목
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
    };

    return this.callApi('/getUltraSrtFcst', params);
  }

  /**
   * 단기예보 조회 (3일 예보)
   * 02, 05, 08, 11, 14, 17, 20, 23시 발표
   */
  async getVilageFcst(nx: number, ny: number): Promise<KmaWeatherItem[]> {
    const { baseDate, baseTime } = this.getVilageFcstBaseTime();

    const params = {
      serviceKey: this.apiKey,
      pageNo: 1,
      numOfRows: 1000, // 3일간 많은 데이터
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
    };

    return this.callApi('/getVilageFcst', params);
  }

  /**
   * API 공통 호출
   */
  private async callApi(endpoint: string, params: Record<string, unknown>): Promise<KmaWeatherItem[]> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`KMA API call: ${endpoint}, nx=${params.nx}, ny=${params.ny}`);

      const response = await firstValueFrom(
        this.httpService.get<KmaApiResponse>(url, {
          params,
          timeout: 10000,
        }),
      );

      const result = response.data;

      // 응답 코드 확인
      if (result.response.header.resultCode !== '00') {
        const errorCode = result.response.header.resultCode;
        const errorMsg = result.response.header.resultMsg;
        this.logger.warn(`KMA API error: ${errorCode} - ${errorMsg}`);

        if (errorCode === '03') {
          throw new AppException(Errors.Kma.NO_DATA);
        }
        if (errorCode === '10' || errorCode === '30') {
          throw new AppException(Errors.Kma.INVALID_API_KEY);
        }
        throw new AppException(Errors.Kma.API_ERROR, errorMsg);
      }

      const items = result.response.body?.items?.item || [];
      return items;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      const axiosError = error as { code?: string; message?: string };

      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        this.logger.error('KMA API connection failed');
        throw new AppException(Errors.Kma.API_UNAVAILABLE);
      }

      if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
        this.logger.error('KMA API timeout');
        throw new AppException(Errors.Kma.API_TIMEOUT);
      }

      this.logger.error(`KMA API error: ${axiosError.message}`, error);
      throw new AppException(Errors.Kma.API_ERROR);
    }
  }

  /**
   * 초단기실황 기준 시간 계산
   * 매시 정각 발표, 40분 후 API 제공 (안전하게 1시간 전 데이터 사용)
   */
  private getUltraSrtNcstBaseTime(): { baseDate: string; baseTime: string } {
    const now = new Date();
    // 현재 시간에서 40분 빼기 (API 제공 지연 고려)
    now.setMinutes(now.getMinutes() - 40);

    const baseDate = this.formatDate(now);
    const baseTime = this.padZero(now.getHours()) + '00';

    return { baseDate, baseTime };
  }

  /**
   * 초단기예보 기준 시간 계산
   * 매시 30분 발표, 45분 후 API 제공
   */
  private getUltraSrtFcstBaseTime(): { baseDate: string; baseTime: string } {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 45);

    // 30분 단위로 맞추기
    const hours = now.getHours();
    const minutes = now.getMinutes();

    let baseHour = hours;
    if (minutes < 30) {
      baseHour = hours - 1;
      if (baseHour < 0) {
        baseHour = 23;
        now.setDate(now.getDate() - 1);
      }
    }

    const baseDate = this.formatDate(now);
    const baseTime = this.padZero(baseHour) + '30';

    return { baseDate, baseTime };
  }

  /**
   * 단기예보 기준 시간 계산
   * 02, 05, 08, 11, 14, 17, 20, 23시 발표
   */
  private getVilageFcstBaseTime(): { baseDate: string; baseTime: string } {
    const now = new Date();
    const baseTimes = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];

    // 현재 시간에서 10분 빼기 (API 제공 지연 고려)
    now.setMinutes(now.getMinutes() - 10);

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeNum = currentHour * 100 + currentMinute;

    // 가장 최근 발표 시간 찾기
    let baseTime = baseTimes[baseTimes.length - 1];
    let baseDate = this.formatDate(now);

    for (let i = baseTimes.length - 1; i >= 0; i--) {
      const bt = parseInt(baseTimes[i], 10);
      if (currentTimeNum >= bt) {
        baseTime = baseTimes[i];
        break;
      }
      if (i === 0) {
        // 전날 23시
        baseTime = '2300';
        now.setDate(now.getDate() - 1);
        baseDate = this.formatDate(now);
      }
    }

    return { baseDate, baseTime };
  }

  /**
   * 날짜 포맷 (YYYYMMDD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = this.padZero(date.getMonth() + 1);
    const day = this.padZero(date.getDate());
    return `${year}${month}${day}`;
  }

  /**
   * 2자리 숫자 패딩
   */
  private padZero(num: number): string {
    return num.toString().padStart(2, '0');
  }
}
