import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCourses } from '../hooks/useCourses';
import { useTimeSlots } from '../hooks/useBooking';
import { Course } from '../redux/api/courseApi';
import { TimeSlot } from '../redux/api/bookingApi';
import { Button, Text, PriceDisplay } from '../components';

interface SearchResult {
  course: Course;
  timeSlots: TimeSlot[];
}

export const SearchPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Search state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<'all' | 'morning' | 'afternoon'>('all');

  // RTK Query hooks
  const { 
    courses, 
    isLoading: isLoadingCourses, 
    searchCourses,
    hasSearched,
    error: coursesError 
  } = useCourses();

  // Format functions

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    return date.toISOString().split('T')[0];
  };

  // Search handler
  const performSearch = async () => {
    try {
      searchCourses({
        keyword: searchKeyword,
        priceRange: [50000, 150000],
        rating: 0,
        date: selectedDate
      });
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Time slot selection handler
  const handleTimeSlotSelect = (course: Course, timeSlot: TimeSlot) => {
    navigate('/booking-detail', {
      state: { course, timeSlot }
    });
  };

  // Filter time slots based on selected time of day
  const filterTimeSlots = (timeSlots: TimeSlot[]) => {
    return timeSlots.filter(slot => {
      if (selectedTimeOfDay === 'morning') {
        return parseInt(slot.time.split(':')[0]) < 12;
      } else if (selectedTimeOfDay === 'afternoon') {
        return parseInt(slot.time.split(':')[0]) >= 12;
      }
      return true;
    });
  };

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
            <Text variant="h2" style={{ 
              fontSize: '24px', 
              margin: 0
            }}>
              골프장 검색
            </Text>
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

          {/* Search Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <Button
              onClick={performSearch}
              disabled={isLoadingCourses}
              loading={isLoadingCourses}
              variant="primary"
              size="large"
              style={{ padding: '16px 48px' }}
            >
              🔍 골프장 검색
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {coursesError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            검색 중 오류가 발생했습니다. 다시 시도해주세요.
          </div>
        )}

        {/* Search Results */}
        {hasSearched && (
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '24px'
            }}>
              🎯 검색 결과 ({courses.length}개)
            </h2>

            {courses.length === 0 ? (
              <div style={{
                background: 'white',
                padding: '48px 24px',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏌️</div>
                <h3 style={{ fontSize: '20px', color: '#6b7280', margin: 0 }}>
                  검색 조건에 맞는 골프장이 없습니다
                </h3>
                <p style={{ color: '#9ca3af', marginTop: '8px' }}>
                  다른 조건으로 다시 검색해보세요
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '24px' }}>
                {courses.map((course) => (
                  <CourseCard 
                    key={course.id}
                    course={course}
                    date={selectedDate}
                    timeOfDay={selectedTimeOfDay}
                    onTimeSlotSelect={handleTimeSlotSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Course Card Component with Time Slots
interface CourseCardProps {
  course: Course;
  date: string;
  timeOfDay: 'all' | 'morning' | 'afternoon';
  onTimeSlotSelect: (course: Course, timeSlot: TimeSlot) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  date, 
  timeOfDay, 
  onTimeSlotSelect 
}) => {
  const { timeSlots, isLoading: isLoadingSlots } = useTimeSlots(course.id, date);

  const filteredSlots = useMemo(() => {
    return timeSlots.filter(slot => {
      if (timeOfDay === 'morning') {
        return parseInt(slot.time.split(':')[0]) < 12;
      } else if (timeOfDay === 'afternoon') {
        return parseInt(slot.time.split(':')[0]) >= 12;
      }
      return true;
    });
  }, [timeSlots, timeOfDay]);


  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Course Info */}
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'start' }}>
          <div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#1f2937', 
              margin: '0 0 8px 0' 
            }}>
              {course.name}
            </h3>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              margin: '0 0 12px 0' 
            }}>
              📍 {course.location}
            </p>
            <p style={{ 
              color: '#4b5563', 
              fontSize: '14px', 
              margin: '0 0 16px 0' 
            }}>
              {course.description}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {course.amenities.map((amenity, index) => (
                <span
                  key={index}
                  style={{
                    background: '#f3f4f6',
                    color: '#6b7280',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <PriceDisplay 
              price={course.pricePerHour} 
              size="medium" 
            />
            <div style={{ 
              fontSize: '14px', 
              color: '#f59e0b',
              marginTop: '4px'
            }}>
              ⭐ {course.rating}
            </div>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div style={{ 
        borderTop: '1px solid #e5e7eb', 
        padding: '24px',
        background: '#f9fafb'
      }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: '#1f2937',
          margin: '0 0 16px 0'
        }}>
          ⏰ 예약 가능 시간
        </h4>
        
        {isLoadingSlots ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
            시간 정보를 불러오는 중...
          </div>
        ) : filteredSlots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
            선택한 조건에 예약 가능한 시간이 없습니다
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px'
          }}>
            {filteredSlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => onTimeSlotSelect(course, slot)}
                style={{
                  background: slot.isPremium ? '#fef3c7' : 'white',
                  border: slot.isPremium ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {slot.time}
                </div>
                <PriceDisplay 
                  price={slot.price} 
                  size="small" 
                  showUnit={false}
                />
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280'
                }}>
                  {slot.remaining}자리 남음
                </div>
                {slot.isPremium && (
                  <div style={{
                    fontSize: '10px',
                    color: '#f59e0b',
                    fontWeight: '600'
                  }}>
                    프리미엄
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};