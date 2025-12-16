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
    <div className="min-h-screen gradient-forest relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="glass-card mx-4 mt-4 mb-8 !p-4 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
              🔍
            </div>
            <Text variant="h2" className="text-white text-2xl font-bold m-0">
              골프장 검색
            </Text>
          </div>
          
          {user && (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/20 rounded-full text-sm text-white font-medium backdrop-blur-sm">
                {user.name}님
              </div>
              <button
                onClick={logout}
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-xl cursor-pointer text-sm font-medium transition-all duration-200 backdrop-blur-sm"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Search Filters */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            🎯 검색 조건
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 키워드 검색 */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-white/90">
                🔍 키워드 검색
              </label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="골프장명, 지역, 편의시설 검색..."
                className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 bg-white/90 border border-white/30 text-slate-800 placeholder-slate-500 focus:bg-white focus:border-white/50 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
              />
            </div>

            {/* 날짜 선택 */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-white/90">
                📅 예약 날짜
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 bg-white/90 border border-white/30 text-slate-800 focus:bg-white focus:border-white/50 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
              />
            </div>

            {/* 시간대 */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-white/90">
                🕐 시간대
              </label>
              <select
                value={selectedTimeOfDay}
                onChange={(e) => setSelectedTimeOfDay(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 bg-white/90 border border-white/30 text-slate-800 focus:bg-white focus:border-white/50 focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
              >
                <option value="all">전체</option>
                <option value="morning">오전 (06:00-11:59)</option>
                <option value="afternoon">오후 (12:00-18:00)</option>
              </select>
            </div>
          </div>

          {/* Search Button */}
          <div className="flex justify-center mt-6">
            <Button
              onClick={performSearch}
              disabled={isLoadingCourses}
              loading={isLoadingCourses}
              variant="primary"
              size="large"
              className="!bg-white/90 hover:!bg-white !text-slate-800 font-semibold px-12 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-0"
            >
              🔍 골프장 검색
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {coursesError && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm p-4 mb-6">
            <Text className="text-red-200">
              검색 중 오류가 발생했습니다. 다시 시도해주세요.
            </Text>
          </div>
        )}

        {/* Search Results */}
        {hasSearched && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              🎯 검색 결과 ({courses.length}개)
            </h2>

            {courses.length === 0 ? (
              <div className="glass-card text-center py-12">
                <div className="text-6xl mb-4">🏌️</div>
                <h3 className="text-xl text-white mb-2">
                  검색 조건에 맞는 골프장이 없습니다
                </h3>
                <p className="text-white/70">
                  다른 조건으로 다시 검색해보세요
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
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
    <div className="glass-card overflow-hidden">
      {/* Course Info */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold text-white mb-2">
              {course.name}
            </h3>
            <p className="text-white/80 text-sm mb-3">
              📍 {course.location}
            </p>
            <p className="text-white/70 text-sm mb-4">
              {course.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {course.amenities.map((amenity, index) => (
                <span
                  key={index}
                  className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <PriceDisplay 
              price={course.pricePerHour} 
              size="medium" 
            />
            <div className="text-sm text-amber-300 mt-1 font-medium">
              ⭐ {course.rating}
            </div>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div className="border-t border-white/20 p-6 bg-black/10">
        <h4 className="text-base font-semibold text-white mb-4">
          ⏰ 예약 가능 시간
        </h4>
        
        {isLoadingSlots ? (
          <div className="text-center py-6 text-white/70">
            시간 정보를 불러오는 중...
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="text-center py-6 text-white/70">
            선택한 조건에 예약 가능한 시간이 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredSlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => onTimeSlotSelect(course, slot)}
                className={`
                  p-3 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm border
                  ${slot.isPremium 
                    ? 'bg-amber-400/20 border-amber-400/50 hover:bg-amber-400/30' 
                    : 'bg-white/10 border-white/30 hover:bg-white/20'
                  }
                `}
              >
                <div className="text-base font-semibold text-white">
                  {slot.time}
                </div>
                <PriceDisplay 
                  price={slot.price} 
                  size="small" 
                  showUnit={false}
                />
                <div className="text-xs text-white/70 mt-1">
                  {slot.remaining}자리 남음
                </div>
                {slot.isPremium && (
                  <div className="text-xs text-amber-300 font-semibold mt-1">
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