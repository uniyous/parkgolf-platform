import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui';

interface PostalData {
  postalCode: string;
  address: string;
}

interface PostalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (postalData: PostalData) => void;
}

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


const PostalSearchModal: React.FC<PostalSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<PostalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      toast.warning('검색어를 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // 백엔드 API를 통한 우편번호 검색
      const params = new URLSearchParams({
        keyword: searchKeyword,
        page: '1',
        limit: '10'
      });

      const response = await fetch(`/api/admin/postal/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      
      if (responseData.success && responseData.data) {
        setSearchResults(responseData.data);
      } else {
        setSearchResults([]);
        if (responseData.message) {
          console.log('검색 메시지:', responseData.message);
        }
      }
    } catch (error) {
      console.error('우편번호 검색 중 오류 발생:', error);
      toast.error('우편번호 검색 중 오류가 발생했습니다. 다시 시도해주세요.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (result: PostalSearchResult) => {
    onSelect({
      postalCode: result.zipNo,
      address: result.roadAddr
    });
  };

  const handleClose = () => {
    setSearchKeyword('');
    setSearchResults([]);
    setHasSearched(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">우편번호 검색</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주소 검색
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="도로명, 건물명, 지번 중 하나를 입력하세요 (예: 강남대로, 테헤란로, 역삼동)"
                autoFocus
              />
              <Button onClick={handleSearch} loading={isSearching}>
                검색
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              정확한 검색을 위해 구체적인 주소를 입력해주세요.
            </p>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-gray-600">검색 중...</span>
              </div>
            )}

            {!isSearching && hasSearched && searchResults.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12M6 20.291A7.962 7.962 0 016 12m6 8a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
                  <p className="mt-1 text-sm text-gray-500">다른 키워드로 다시 검색해보세요.</p>
                </div>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  검색 결과 ({searchResults.length}건)
                </p>
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelect(result)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          [{result.zipNo}] {result.roadAddr}
                        </div>
                        <div className="text-xs text-gray-500">
                          지번: {result.jibunAddr}
                        </div>
                      </div>
                      <button className="ml-3 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        선택
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostalSearchModal;