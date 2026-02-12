import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppException, Errors } from '../../common/exceptions';
import {
  AddressSearchDto,
  KeywordSearchDto,
  CoordToAddressDto,
  CategorySearchDto,
  AddressInfo,
  PlaceInfo,
  AddressSearchResult,
  PlaceSearchResult,
} from '../dto/location.dto';

/**
 * 카카오 로컬 API 원시 응답 타입
 */
interface KakaoAddressDocument {
  address_name: string;
  y: string;
  x: string;
  address_type: string;
  address?: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    region_3depth_h_name?: string;
    h_code: string;
    b_code: string;
    mountain_yn: string;
    main_address_no: string;
    sub_address_no: string;
    zip_code?: string;
  };
  road_address?: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    road_name: string;
    underground_yn: string;
    main_building_no: string;
    sub_building_no: string;
    building_name: string;
    zone_no: string;
  };
}

interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance?: string;
}

interface KakaoRegionDocument {
  region_type: string;
  code: string;
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  region_4depth_name?: string;
  x: number;
  y: number;
}

interface KakaoCoord2AddressDocument {
  address?: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    zip_code?: string;
  };
  road_address?: {
    address_name: string;
    zone_no: string;
  };
}

interface KakaoMeta {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
}

/**
 * 카카오 로컬 API 서비스
 */
@Injectable()
export class KakaoApiService implements OnModuleInit {
  private readonly logger = new Logger(KakaoApiService.name);
  private readonly BASE_URL = 'https://dapi.kakao.com/v2/local';
  private apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    this.apiKey = this.configService.get<string>('KAKAO_REST_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('KAKAO_REST_API_KEY is not configured');
    } else {
      this.logger.log('Kakao API service initialized');
    }
  }

  /**
   * API 키 검증
   */
  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new AppException(Errors.Kakao.API_KEY_NOT_CONFIGURED);
    }
  }

  /**
   * HTTP 헤더 생성
   */
  private getHeaders() {
    return {
      Authorization: `KakaoAK ${this.apiKey}`,
    };
  }

  /**
   * 카카오 API 에러 핸들링 (공통)
   */
  private handleApiError(context: string, error: unknown): never {
    this.logger.error(`${context} failed`, error);
    if (error instanceof AppException) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new AppException(Errors.Kakao.API_ERROR, message);
  }

  /**
   * KakaoPlaceDocument → PlaceInfo 변환
   */
  private toPlaceInfo(doc: KakaoPlaceDocument): PlaceInfo {
    return {
      id: doc.id,
      placeName: doc.place_name,
      categoryName: doc.category_name,
      categoryGroupCode: doc.category_group_code,
      categoryGroupName: doc.category_group_name,
      phone: doc.phone || undefined,
      addressName: doc.address_name,
      roadAddressName: doc.road_address_name || undefined,
      coordinates: {
        latitude: parseFloat(doc.y),
        longitude: parseFloat(doc.x),
      },
      placeUrl: doc.place_url,
      distance: doc.distance ? parseInt(doc.distance, 10) : undefined,
    };
  }

  /**
   * 주소 검색 (address.json)
   * 주소를 지번/도로명 주소로 변환하고 좌표 반환
   */
  async searchAddress(dto: AddressSearchDto): Promise<AddressSearchResult> {
    this.validateApiKey();

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ documents: KakaoAddressDocument[]; meta: KakaoMeta }>(
          `${this.BASE_URL}/search/address.json`,
          {
            headers: this.getHeaders(),
            params: {
              query: dto.query,
              page: dto.page || 1,
              size: dto.size || 10,
            },
          },
        ),
      );

      const { documents, meta } = response.data;

      const addresses: AddressInfo[] = documents.map((doc) => ({
        addressName: doc.address?.address_name || doc.address_name,
        roadAddressName: doc.road_address?.address_name,
        region1: doc.address?.region_1depth_name || '',
        region2: doc.address?.region_2depth_name || '',
        region3: doc.address?.region_3depth_name || '',
        postalCode: doc.road_address?.zone_no || doc.address?.zip_code,
        coordinates: {
          latitude: parseFloat(doc.y),
          longitude: parseFloat(doc.x),
        },
      }));

      return {
        addresses,
        meta: {
          totalCount: meta.total_count,
          pageableCount: meta.pageable_count,
          isEnd: meta.is_end,
          page: dto.page || 1,
          size: dto.size || 10,
        },
      };
    } catch (error: unknown) {
      this.handleApiError('Address search', error);
    }
  }

  /**
   * 키워드로 장소 검색 (keyword.json)
   */
  async searchKeyword(dto: KeywordSearchDto): Promise<PlaceSearchResult> {
    this.validateApiKey();

    try {
      const params: Record<string, string | number> = {
        query: dto.query,
        page: dto.page || 1,
        size: dto.size || 15,
      };

      if (dto.categoryGroupCode) params.category_group_code = dto.categoryGroupCode;
      if (dto.x !== undefined) params.x = dto.x;
      if (dto.y !== undefined) params.y = dto.y;
      if (dto.radius !== undefined) params.radius = dto.radius;

      const response = await firstValueFrom(
        this.httpService.get<{ documents: KakaoPlaceDocument[]; meta: KakaoMeta }>(
          `${this.BASE_URL}/search/keyword.json`,
          {
            headers: this.getHeaders(),
            params,
          },
        ),
      );

      const { documents, meta } = response.data;

      return {
        places: documents.map((doc) => this.toPlaceInfo(doc)),
        meta: {
          totalCount: meta.total_count,
          pageableCount: meta.pageable_count,
          isEnd: meta.is_end,
          page: dto.page || 1,
          size: dto.size || 15,
        },
      };
    } catch (error: unknown) {
      this.handleApiError('Keyword search', error);
    }
  }

  /**
   * 카테고리로 장소 검색 (category.json)
   */
  async searchCategory(dto: CategorySearchDto): Promise<PlaceSearchResult> {
    this.validateApiKey();

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ documents: KakaoPlaceDocument[]; meta: KakaoMeta }>(
          `${this.BASE_URL}/search/category.json`,
          {
            headers: this.getHeaders(),
            params: {
              category_group_code: dto.categoryGroupCode,
              x: dto.x,
              y: dto.y,
              radius: dto.radius || 1000,
              page: dto.page || 1,
              size: dto.size || 15,
            },
          },
        ),
      );

      const { documents, meta } = response.data;

      return {
        places: documents.map((doc) => this.toPlaceInfo(doc)),
        meta: {
          totalCount: meta.total_count,
          pageableCount: meta.pageable_count,
          isEnd: meta.is_end,
          page: dto.page || 1,
          size: dto.size || 15,
        },
      };
    } catch (error: unknown) {
      this.handleApiError('Category search', error);
    }
  }

  /**
   * 좌표를 주소로 변환 (coord2address.json)
   */
  async coordToAddress(dto: CoordToAddressDto): Promise<AddressInfo | null> {
    this.validateApiKey();

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ documents: KakaoCoord2AddressDocument[]; meta: { total_count: number } }>(
          `${this.BASE_URL}/geo/coord2address.json`,
          {
            headers: this.getHeaders(),
            params: {
              x: dto.x,
              y: dto.y,
            },
          },
        ),
      );

      const { documents } = response.data;

      if (documents.length === 0) {
        return null;
      }

      const doc = documents[0];
      const address = doc.address;
      const roadAddress = doc.road_address;

      return {
        addressName: address?.address_name || '',
        roadAddressName: roadAddress?.address_name,
        region1: address?.region_1depth_name || '',
        region2: address?.region_2depth_name || '',
        region3: address?.region_3depth_name || '',
        postalCode: roadAddress?.zone_no,
        coordinates: {
          latitude: dto.y,
          longitude: dto.x,
        },
      };
    } catch (error: unknown) {
      this.handleApiError('Coord to address', error);
    }
  }

  /**
   * 좌표를 행정구역 정보로 변환 (coord2regioncode.json)
   */
  async coordToRegion(
    x: number,
    y: number,
  ): Promise<{ address: string; region1: string; region2: string; region3: string } | null> {
    this.validateApiKey();

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ documents: KakaoRegionDocument[]; meta: { total_count: number } }>(
          `${this.BASE_URL}/geo/coord2regioncode.json`,
          {
            headers: this.getHeaders(),
            params: { x, y },
          },
        ),
      );

      const { documents } = response.data;

      // region_type이 'H'인 행정동 정보 찾기
      const region = documents.find((d) => d.region_type === 'H') || documents[0];

      if (!region) return null;

      return {
        address: region.address_name,
        region1: region.region_1depth_name,
        region2: region.region_2depth_name,
        region3: region.region_3depth_name,
      };
    } catch (error: unknown) {
      this.handleApiError('Coord to region', error);
    }
  }
}
