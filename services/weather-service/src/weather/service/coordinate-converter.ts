import { Injectable } from '@nestjs/common';

/**
 * 기상청 격자 좌표
 */
export interface GridCoordinate {
  nx: number;
  ny: number;
}

/**
 * 좌표 변환 서비스
 * Lambert Conformal Conic (LCC) 투영법을 사용하여
 * 위경도 좌표를 기상청 격자 좌표로 변환
 */
@Injectable()
export class CoordinateConverter {
  // 기상청 LCC 투영 상수
  private readonly RE = 6371.00877; // 지구 반경 (km)
  private readonly GRID = 5.0; // 격자 간격 (km)
  private readonly SLAT1 = 30.0; // 투영 위도1 (degree)
  private readonly SLAT2 = 60.0; // 투영 위도2 (degree)
  private readonly OLON = 126.0; // 기준점 경도 (degree)
  private readonly OLAT = 38.0; // 기준점 위도 (degree)
  private readonly XO = 43; // 기준점 X좌표 (격자)
  private readonly YO = 136; // 기준점 Y좌표 (격자)

  private readonly DEGRAD = Math.PI / 180.0;

  // 미리 계산된 상수들
  private readonly sn: number;
  private readonly sf: number;
  private readonly ro: number;

  constructor() {
    // LCC 투영 상수 미리 계산
    const slat1 = this.SLAT1 * this.DEGRAD;
    const slat2 = this.SLAT2 * this.DEGRAD;
    const olon = this.OLON * this.DEGRAD;
    const olat = this.OLAT * this.DEGRAD;

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    this.sn = sn;

    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
    this.sf = sf;

    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (this.RE / this.GRID) * sf / Math.pow(ro, sn);
    this.ro = ro;
  }

  /**
   * 위경도를 기상청 격자 좌표로 변환
   * @param lat 위도 (degree)
   * @param lon 경도 (degree)
   * @returns 격자 좌표 { nx, ny }
   */
  toGrid(lat: number, lon: number): GridCoordinate {
    const ra = Math.tan(Math.PI * 0.25 + lat * this.DEGRAD * 0.5);
    const raCalc = (this.RE / this.GRID) * this.sf / Math.pow(ra, this.sn);

    let theta = lon * this.DEGRAD - this.OLON * this.DEGRAD;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= this.sn;

    const nx = Math.floor(raCalc * Math.sin(theta) + this.XO + 0.5);
    const ny = Math.floor(this.ro - raCalc * Math.cos(theta) + this.YO + 0.5);

    return { nx, ny };
  }

  /**
   * 좌표 유효성 검증
   * 대한민국 범위: 위도 33~43, 경도 124~132
   */
  isValidKoreaCoordinate(lat: number, lon: number): boolean {
    return lat >= 33 && lat <= 43 && lon >= 124 && lon <= 132;
  }
}
