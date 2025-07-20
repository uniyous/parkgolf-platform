import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { bookingApi, Course, TimeSlot } from '../api/bookingApi';

interface SearchResult {
  course: Course;
  timeSlots: TimeSlot[];
}


export const SearchPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    return date.toISOString().split('T')[0];
  };

  const performSearch = async () => {
    setIsLoading(true);
    
    try {
      // 1. 코스 검색
      const courses = await bookingApi.searchCourses({
        keyword: searchKeyword,
        priceRange: [50000, 150000],
        rating: 0
      });

      // 2. 각 코스별 타임슬롯 가용성 조회
      const results: SearchResult[] = [];
      
      for (const course of courses) {
        try {
          const allSlots = await bookingApi.getTimeSlotAvailability(course.id, selectedDate);
          
          // 시간대 필터링
          const filteredSlots = allSlots.filter(slot => {
            if (selectedTimeOfDay === 'morning') {
              return parseInt(slot.time.split(':')[0]) < 12;
            } else if (selectedTimeOfDay === 'afternoon') {
              return parseInt(slot.time.split(':')[0]) >= 12;
            }
            return true;
          });

          if (filteredSlots.length > 0) {
            results.push({
              course,
              timeSlots: filteredSlots
            });
          }
        } catch (error) {
          console.warn(`Failed to get time slots for course ${course.id}:`, error);
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSlotSelect = (course: Course, timeSlot: TimeSlot) => {
    // 선택된 정보를 다음 페이지로 전달
    navigate('/booking-detail', {
      state: {
        course,
        timeSlot
      }
    });
  };

  // Don't automatically search on mount to avoid authentication issues
  // useEffect(() => {
  //   performSearch();
  // }, [selectedDate, selectedTimeOfDay]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' 
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 24px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          height: '80px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#10b981',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🔍
            </div>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              골프장 검색
            </h1>
          </div>
          
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '8px 16px',
                background: '#f0fdf4',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#059669',
                fontWeight: '500'
              }}>
                {user.name}님
              </div>
              <button
                onClick={logout}
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  color: '#6b7280',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Search Filters */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '24px'
          }}>
            🎯 검색 조건
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* 키워드 검색 */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                🔍 키워드 검색
              </label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="골프장명, 지역, 편의시설 검색..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#f9fafb'
                }}
              />
            </div>

            {/* 날짜 선택 */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                📅 예약 날짜
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#f9fafb'
                }}
              />
            </div>

            {/* 시간대 */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                🕐 시간대
              </label>
              <select
                value={selectedTimeOfDay}
                onChange={(e) => setSelectedTimeOfDay(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#f9fafb'
                }}
              >
                <option value="all">전체</option>
                <option value="morning">오전 (06:00-11:59)</option>
                <option value="afternoon">오후 (12:00-18:00)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={performSearch}
              style={{
                background: '#10b981',
                color: 'white',
                padding: '12px 32px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#10b981';
              }}
            >
              🔍 검색하기
            </button>
          </div>
        </div>

        {/* Search Results */}
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              검색 결과
            </h2>
            <div style={{
              background: '#f0fdf4',
              color: '#059669',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {searchResults.length}개 골프장 발견
            </div>
          </div>

          {isLoading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
              <div>검색 중...</div>
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{
              background: 'white',
              padding: '60px 20px',
              borderRadius: '16px',
              textAlign: 'center',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '60px', marginBottom: '16px' }}>🏌️‍♀️</div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                검색 결과가 없습니다
              </h3>
              <p style={{ color: '#6b7280' }}>
                다른 검색 조건을 시도해보세요.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {searchResults.map((result) => (
                <div
                  key={result.course.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  {/* Course Info */}
                  <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <div style={{
                        width: '120px',
                        height: '80px',
                        background: `url(${result.course.imageUrl}) center/cover`,
                        borderRadius: '8px',
                        flexShrink: 0
                      }} />
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <h3 style={{ 
                            fontSize: '20px', 
                            fontWeight: '600',
                            color: '#1f2937',
                            margin: 0
                          }}>
                            {result.course.name}
                          </h3>
                          <div style={{
                            background: '#f0fdf4',
                            color: '#059669',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ⭐ {result.course.rating}
                          </div>
                          <div style={{
                            background: '#f3f4f6',
                            color: '#6b7280',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {result.timeSlots.length}개 슬롯 예약가능
                          </div>
                        </div>
                        
                        <p style={{ 
                          color: '#6b7280', 
                          fontSize: '14px',
                          margin: '0 0 8px 0'
                        }}>
                          📍 {result.course.location}
                        </p>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {result.course.amenities.map((amenity, index) => (
                            <span
                              key={index}
                              style={{
                                background: '#f3f4f6',
                                color: '#6b7280',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '18px', 
                          fontWeight: '700',
                          color: '#10b981',
                          marginBottom: '4px'
                        }}>
                          {formatPrice(result.course.pricePerHour)}
                        </div>
                        <div style={{ 
                          color: '#6b7280', 
                          fontSize: '12px'
                        }}>
                          /시간
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div style={{ padding: '24px' }}>
                    <h4 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '16px'
                    }}>
                      📅 {new Date(selectedDate).toLocaleDateString('ko-KR', { 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'short'
                      })} 예약 가능한 시간
                    </h4>
                    
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: '8px'
                    }}>
                      {result.timeSlots.slice(0, 12).map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => handleTimeSlotSelect(result.course, slot)}
                          style={{
                            padding: '12px 8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            background: 'white',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            textAlign: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f0fdf4';
                            e.currentTarget.style.borderColor = '#10b981';
                            e.currentTarget.style.color = '#059669';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.color = '#374151';
                          }}
                        >
                          <div style={{ marginBottom: '4px' }}>{slot.time}</div>
                          <div style={{ fontSize: '10px', opacity: 0.8 }}>
                            {slot.isPremium && '💎'} {formatPrice(slot.price)}
                          </div>
                        </button>
                      ))}
                      {result.timeSlots.length > 12 && (
                        <div style={{
                          padding: '12px 8px',
                          border: '1px dashed #d1d5db',
                          borderRadius: '8px',
                          background: 'transparent',
                          color: '#6b7280',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          +{result.timeSlots.length - 12}개 더
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};