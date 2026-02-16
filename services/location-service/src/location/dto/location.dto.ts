import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * 주소 검색 요청
 */
export class AddressSearchDto {
  @IsNotEmpty()
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  size?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;
}

/**
 * 키워드 장소 검색 요청
 */
export class KeywordSearchDto {
  @IsNotEmpty()
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  categoryGroupCode?: string; // AT4(관광명소), CT1(문화시설), SW8(지하철역) 등

  @IsOptional()
  @IsNumber()
  x?: number; // 중심 경도

  @IsOptional()
  @IsNumber()
  y?: number; // 중심 위도

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20000)
  radius?: number; // 반경(m), 최대 20000

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(15)
  size?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;
}

/**
 * 좌표 → 주소 변환 요청
 */
export class CoordToAddressDto {
  @IsNumber()
  x: number; // 경도 (longitude)

  @IsNumber()
  y: number; // 위도 (latitude)
}

/**
 * 카테고리 장소 검색 요청
 */
export class CategorySearchDto {
  @IsNotEmpty()
  @IsString()
  categoryGroupCode: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20000)
  radius?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(15)
  size?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;
}

/**
 * 좌표 정보
 */
export interface Coordinates {
  latitude: number;  // 위도 (y)
  longitude: number; // 경도 (x)
}

/**
 * 주소 정보
 */
export interface AddressInfo {
  addressName: string;        // 전체 지번 주소
  roadAddressName?: string;   // 전체 도로명 주소
  region1: string;            // 시도 (서울, 경기 등)
  region2: string;            // 구 (강남구, 분당구 등)
  region3: string;            // 동 (역삼동, 정자동 등)
  postalCode?: string;        // 우편번호
  coordinates: Coordinates;
}

/**
 * 장소 정보
 */
export interface PlaceInfo {
  id: string;
  placeName: string;
  categoryName: string;
  categoryGroupCode?: string;
  categoryGroupName?: string;
  phone?: string;
  addressName: string;
  roadAddressName?: string;
  coordinates: Coordinates;
  placeUrl?: string;
  distance?: number; // 중심 좌표로부터 거리(m)
}

/**
 * 페이지네이션 메타
 */
export interface PaginationMeta {
  totalCount: number;
  pageableCount: number;
  isEnd: boolean;
  page: number;
  size: number;
}

/**
 * 주소 검색 결과
 */
export interface AddressSearchResult {
  addresses: AddressInfo[];
  meta: PaginationMeta;
}

/**
 * 장소 검색 결과
 */
export interface PlaceSearchResult {
  places: PlaceInfo[];
  meta: PaginationMeta;
}
