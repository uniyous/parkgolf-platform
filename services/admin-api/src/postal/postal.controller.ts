import { Controller, Get, Query, Logger } from '@nestjs/common';

interface PostalSearchResult {
  zipNo: string;
  roadAddr: string;
  jibunAddr: string;
  engAddr?: string;
  admCd: string;
  rnMgtSn: string;
  bdMgtSn: string;
  detBdNmList?: string;
  bdNm?: string;
  bdKdcd: string;
  siNm: string;
  sggNm: string;
  emdNm: string;
  liNm?: string;
  rn: string;
  udrtYn: string;
  buldMnnm: string;
  buldSlno: string;
  mtYn: string;
  lnbrMnnm: string;
  lnbrSlno: string;
}

interface PostalAPIResponse {
  results: {
    common: {
      totalCount: string;
      currentPage: string;
      countPerPage: string;
    };
    juso: PostalSearchResult[];
  };
}

@Controller('admin/postal')
export class PostalController {
  private readonly logger = new Logger(PostalController.name);

  @Get('search')
  async searchAddress(
    @Query('keyword') keyword: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    try {
      this.logger.log(`Searching postal address for keyword: ${keyword}`);

      if (!keyword || keyword.trim() === '') {
        return {
          success: false,
          message: '검색어를 입력해주세요.',
          data: []
        };
      }

      // 개발 환경에서는 Mock 데이터 사용
      if (process.env.NODE_ENV === 'development') {
        this.logger.log('Using mock data for development environment');
        
        const mockResults: PostalSearchResult[] = [
          {
            zipNo: '16950',
            roadAddr: '경기도 용인시 처인구 모현읍 능원로 200',
            jibunAddr: '경기도 용인시 처인구 모현읍 갈담리 12-1',
            admCd: '4146025021',
            rnMgtSn: '414604167006',
            bdMgtSn: '4146025021100120001019862',
            bdKdcd: '0',
            siNm: '경기도',
            sggNm: '용인시 처인구',
            emdNm: '모현읍',
            liNm: '갈담리',
            rn: '능원로',
            udrtYn: '0',
            buldMnnm: '200',
            buldSlno: '0',
            mtYn: '0',
            lnbrMnnm: '12',
            lnbrSlno: '1'
          },
          {
            zipNo: '16951',
            roadAddr: '경기도 용인시 처인구 모현읍 능원로 300',
            jibunAddr: '경기도 용인시 처인구 모현읍 갈담리 15-2',
            admCd: '4146025021',
            rnMgtSn: '414604167006',
            bdMgtSn: '4146025021100150002019863',
            bdKdcd: '0',
            siNm: '경기도',
            sggNm: '용인시 처인구',
            emdNm: '모현읍',
            liNm: '갈담리',
            rn: '능원로',
            udrtYn: '0',
            buldMnnm: '300',
            buldSlno: '0',
            mtYn: '0',
            lnbrMnnm: '15',
            lnbrSlno: '2'
          },
          {
            zipNo: '06292',
            roadAddr: '서울특별시 강남구 테헤란로 152',
            jibunAddr: '서울특별시 강남구 역삼동 737',
            admCd: '1168010100',
            rnMgtSn: '116803148023',
            bdMgtSn: '1168010100107370000025111',
            bdKdcd: '0',
            siNm: '서울특별시',
            sggNm: '강남구',
            emdNm: '역삼동',
            rn: '테헤란로',
            udrtYn: '0',
            buldMnnm: '152',
            buldSlno: '0',
            mtYn: '0',
            lnbrMnnm: '737',
            lnbrSlno: '0'
          },
          {
            zipNo: '06267',
            roadAddr: '서울특별시 강남구 강남대로 364',
            jibunAddr: '서울특별시 강남구 역삼동 825',
            admCd: '1168010100',
            rnMgtSn: '116803148001',
            bdMgtSn: '1168010100108250000025112',
            bdKdcd: '0',
            siNm: '서울특별시',
            sggNm: '강남구',
            emdNm: '역삼동',
            rn: '강남대로',
            udrtYn: '0',
            buldMnnm: '364',
            buldSlno: '0',
            mtYn: '0',
            lnbrMnnm: '825',
            lnbrSlno: '0'
          }
        ].filter(item => 
          item.roadAddr.toLowerCase().includes(keyword.toLowerCase()) ||
          item.jibunAddr.toLowerCase().includes(keyword.toLowerCase()) ||
          item.siNm.toLowerCase().includes(keyword.toLowerCase()) ||
          item.sggNm.toLowerCase().includes(keyword.toLowerCase()) ||
          item.emdNm.toLowerCase().includes(keyword.toLowerCase()) ||
          item.rn.toLowerCase().includes(keyword.toLowerCase())
        );

        return {
          success: true,
          message: '검색이 완료되었습니다. (Mock 데이터)',
          data: mockResults,
          pagination: {
            currentPage: parseInt(page),
            countPerPage: parseInt(limit),
            totalCount: mockResults.length
          }
        };
      }

      // 프로덕션 환경에서는 실제 API 호출
      const API_KEY = process.env.POSTAL_API_KEY; // 실제 API 키 필요
      if (!API_KEY) {
        throw new Error('POSTAL_API_KEY 환경변수가 설정되지 않았습니다.');
      }

      const API_URL = 'https://business.juso.go.kr/addrlink/addrLinkApi.do';
      
      const params = new URLSearchParams({
        confmKey: API_KEY,
        currentPage: page,
        countPerPage: limit,
        keyword: keyword.trim(),
        resultType: 'json'
      });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
      }

      const data: PostalAPIResponse = await response.json();

      if (!data.results || !data.results.juso) {
        return {
          success: true,
          message: '검색 결과가 없습니다.',
          data: [],
          pagination: {
            currentPage: parseInt(page),
            countPerPage: parseInt(limit),
            totalCount: 0
          }
        };
      }

      return {
        success: true,
        message: '검색이 완료되었습니다.',
        data: data.results.juso,
        pagination: {
          currentPage: parseInt(data.results.common.currentPage),
          countPerPage: parseInt(data.results.common.countPerPage),
          totalCount: parseInt(data.results.common.totalCount)
        }
      };

    } catch (error) {
      this.logger.error('Failed to search postal address', error);
      
      return {
        success: false,
        message: '우편번호 검색 중 오류가 발생했습니다. 다시 시도해주세요.',
        data: [],
        error: error.message
      };
    }
  }
}