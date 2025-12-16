import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCourses } from '../hooks/useCourses';
import { useBooking } from '../hooks/useBooking';
import { Course } from '../redux/api/courseApi';

interface EnhancedTimeSlot {
  id: number;
  time: string;
  isAvailable: boolean;
  price: number;
  isPremium: boolean;
}

const mockCourses: Course[] = [
  {
    id: 1,
    name: '그린밸리 골프클럽',
    description: '아름다운 자연 속 프리미엄 18홀 골프코스',
    pricePerHour: 80000,
    location: '경기도 용인시',
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80',
    amenities: ['클럽하우스', '레스토랑', '프로샵', '주차장'],
    openTime: '06:00',
    closeTime: '18:00',
  },
  {
    id: 2,
    name: '선셋힐 컨트리클럽',
    description: '석양이 아름다운 언덕 위의 골프코스',
    pricePerHour: 65000,
    location: '강원도 춘천시',
    rating: 4.6,
    imageUrl: 'https://images.unsplash.com/photo-1587174486073-ae5e5cec4cdf?w=800&q=80',
    amenities: ['클럽하우스', '레스토랑', '연습장'],
    openTime: '06:30',
    closeTime: '17:30',
  },
  {
    id: 3,
    name: '오션뷰 리조트',
    description: '바다가 보이는 럭셔리 골프 리조트',
    pricePerHour: 120000,
    location: '부산광역시 기장군',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
    amenities: ['클럽하우스', '레스토랑', '프로샵', '호텔', '스파'],
    openTime: '06:00',
    closeTime: '19:00',
  },
];

const generateTimeSlots = (): EnhancedTimeSlot[] => {
  const slots: EnhancedTimeSlot[] = [];
  for (let hour = 6; hour < 18; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const isAvailable = Math.random() > 0.3;
    const isPremium = hour >= 12 && hour <= 16;
    
    slots.push({
      id: hour,
      time: timeString,
      isAvailable,
      price: isPremium ? 90000 : 80000,
      isPremium,
    });
  }
  return slots;
};

export const EnhancedBookingPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { allCourses } = useCourses();
  const { createBooking, isCreating } = useBooking();
  
  const [step, setStep] = useState<'course' | 'datetime' | 'details' | 'confirmation'>('course');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<EnhancedTimeSlot | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [timeSlots] = useState<EnhancedTimeSlot[]>(generateTimeSlots());
  const [bookingResult, setBookingResult] = useState<any>(null);

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setStep('datetime');
  };

  const handleDateTimeNext = () => {
    if (selectedDate && selectedTimeSlot) {
      setStep('details');
    }
  };

  const handleBookingComplete = async () => {
    if (!selectedCourse || !selectedTimeSlot) return;

    try {
      const bookingData = {
        courseId: selectedCourse.id,
        bookingDate: selectedDate,
        timeSlot: selectedTimeSlot.time,
        playerCount,
        specialRequests: specialRequests || undefined,
        userEmail: user?.email || '',
        userName: user?.name || '',
        userPhone: user?.phoneNumber || user?.phone,
      };

      const result = await createBooking(bookingData);

      if (result.success) {
        setBookingResult(result.data);
        setStep('confirmation');
      } else {
        alert('예약 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('예약 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const goBack = () => {
    if (step === 'datetime') setStep('course');
    else if (step === 'details') setStep('datetime');
    else if (step === 'confirmation') setStep('details');
  };

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

  return (
    <div className="min-h-screen gradient-forest relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Modern Header */}
      <header className="glass-card mx-4 mt-4 mb-8 !p-4 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
              🏌️
            </div>
            <div>
              <div className="text-white text-xl font-bold">골프장 예약</div>
              <div className="text-white/70 text-sm">
                {step === 'course' && '골프장 선택'}
                {step === 'datetime' && '날짜 및 시간 선택'}
                {step === 'details' && '예약 정보 입력'}
                {step === 'confirmation' && '예약 확인'}
              </div>
            </div>
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
              {step !== 'course' && (
                <button 
                  onClick={goBack}
                  className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-xl cursor-pointer text-sm font-medium transition-all duration-200 backdrop-blur-sm flex items-center gap-2"
                >
                  ← 이전
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Modern Progress Bar */}
      <div className="glass-card mx-4 mb-8 !p-4 relative z-10">
        <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
          {[
            { key: 'course', label: '골프장 선택', icon: '🏌️' },
            { key: 'datetime', label: '날짜 & 시간', icon: '📅' },
            { key: 'details', label: '예약 정보', icon: '✏️' },
            { key: 'confirmation', label: '확인', icon: '✅' }
          ].map((item, index) => {
            const isActive = step === item.key;
            const isCompleted = ['course', 'datetime', 'details', 'confirmation'].indexOf(step) > index;
            
            return (
              <React.Fragment key={item.key}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold mb-2 transition-all duration-300
                    ${isActive ? 'bg-white/30 text-white border-2 border-white/50' : 
                      isCompleted ? 'bg-white/20 text-white border-2 border-white/30' : 
                      'bg-white/10 text-white/50 border border-white/20'}
                  `}>
                    {isCompleted ? '✓' : item.icon}
                  </div>
                  <span className={`
                    text-xs font-medium text-center transition-colors duration-300
                    ${isActive ? 'text-white' : isCompleted ? 'text-white/90' : 'text-white/60'}
                  `}>
                    {item.label}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`
                    flex-1 h-0.5 transition-all duration-300 mt-6
                    ${isCompleted ? 'bg-white/40' : 'bg-white/20'}
                  `} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {step === 'course' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">
                완벽한 골프장을 선택하세요
              </h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto">
                프리미엄 골프장에서 최고의 라운딩을 경험해보세요
              </p>
            </div>

            <div className="grid gap-6 max-w-4xl mx-auto">
              {(allCourses.length > 0 ? allCourses : mockCourses).map((course) => (
                <div
                  key={course.id}
                  onClick={() => handleCourseSelect(course)}
                  className="glass-card overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div 
                      className="w-full lg:w-80 h-48 lg:h-40 bg-cover bg-center rounded-xl lg:rounded-r-none flex-shrink-0"
                      style={{ backgroundImage: `url(${course.imageUrl})` }}
                    />
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">
                            {course.name}
                          </h3>
                          <div className="bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border border-amber-400/30">
                            ⭐ {course.rating}
                          </div>
                        </div>
                        
                        <p className="text-white/70 text-sm mb-2">
                          📍 {course.location}
                        </p>
                        
                        <p className="text-white/80 text-sm mb-4 leading-relaxed">
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
                      
                      <div className="flex justify-between items-center pt-4 border-t border-white/20">
                        <div>
                          <span className="text-2xl font-bold text-white">
                            {formatPrice(course.pricePerHour)}
                          </span>
                          <span className="text-white/60 text-sm ml-1">
                            /시간
                          </span>
                        </div>
                        
                        <div className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 backdrop-blur-sm">
                          선택하기 →
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'datetime' && selectedCourse && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">
                날짜와 시간을 선택하세요
              </h2>
              <p className="text-white/80 text-lg">
                {selectedCourse.name}에서의 라운딩 시간을 예약하세요
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Date Selection */}
              <div className="glass-card">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  📅 날짜 선택
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full px-4 py-4 rounded-xl text-lg outline-none transition-all duration-200 bg-white/90 border border-white/30 text-slate-800 focus:bg-white focus:border-white/50 focus:ring-2 focus:ring-white/20 backdrop-blur-sm cursor-pointer"
                />
              </div>

              {/* Time Selection */}
              <div className="glass-card">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  🕐 시간 선택
                </h3>
                <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-white/30">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedTimeSlot(slot)}
                      disabled={!slot.isAvailable}
                      className={`
                        p-3 rounded-xl text-center transition-all duration-200 backdrop-blur-sm border text-sm font-medium
                        ${selectedTimeSlot?.id === slot.id 
                          ? 'bg-white/30 border-white/50 text-white shadow-lg' 
                          : slot.isAvailable 
                            ? 'bg-white/10 border-white/30 text-white hover:bg-white/20' 
                            : 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'}
                      `}
                    >
                      <div className="mb-1 font-semibold">{slot.time}</div>
                      <div className="text-xs opacity-90">
                        {slot.isPremium && '💎 '}{formatPrice(slot.price)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedDate && selectedTimeSlot && (
              <div className="text-center mt-10">
                <button
                  onClick={handleDateTimeNext}
                  className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-12 py-4 rounded-xl text-lg font-semibold transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl"
                >
                  다음 단계 →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'details' && selectedCourse && selectedTimeSlot && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">
                예약 정보를 입력하세요
              </h2>
              <p className="text-white/80 text-lg">
                마지막 단계입니다. 추가 정보를 입력해주세요.
              </p>
            </div>

            <div className="glass-card">
              <div className="mb-6">
                <label className="block mb-3 text-sm font-semibold text-white/90">
                  플레이어 수
                </label>
                <select
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                  className="w-full px-4 py-4 rounded-xl text-lg outline-none transition-all duration-200 bg-white/90 border border-white/30 text-slate-800 focus:bg-white focus:border-white/50 focus:ring-2 focus:ring-white/20 backdrop-blur-sm cursor-pointer"
                >
                  <option value={1}>1명 (개인 레슨)</option>
                  <option value={2}>2명</option>
                  <option value={3}>3명</option>
                  <option value={4}>4명 (풀 플라이트)</option>
                </select>
              </div>

              <div className="mb-8">
                <label className="block mb-3 text-sm font-semibold text-white/90">
                  특별 요청사항 (선택사항)
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="카트 요청, 캐디 서비스, 기타 요청사항을 입력해주세요."
                  rows={4}
                  className="w-full px-4 py-4 rounded-xl text-base outline-none transition-all duration-200 bg-white/90 border border-white/30 text-slate-800 placeholder-slate-500 focus:bg-white focus:border-white/50 focus:ring-2 focus:ring-white/20 backdrop-blur-sm resize-vertical"
                />
              </div>

              <button
                onClick={handleBookingComplete}
                disabled={isCreating}
                className={`
                  w-full px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl
                  ${isCreating 
                    ? 'bg-white/20 border border-white/30 text-white/50 cursor-not-allowed' 
                    : 'bg-white/20 hover:bg-white/30 border border-white/30 text-white'}
                `}
              >
                {isCreating ? '예약 처리 중...' : '예약 완료하기'}
              </button>
            </div>
          </div>
        )}

        {step === 'confirmation' && selectedCourse && selectedTimeSlot && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass-card">
              <div className="w-20 h-20 bg-green-400/20 border border-green-400/30 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 backdrop-blur-sm">
                ✅
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                예약이 완료되었습니다!
              </h2>
              
              <p className="text-white/80 text-lg mb-8">
                예약 확인 메일이 발송되었습니다.
              </p>

              <div className="bg-white/10 border border-white/20 rounded-xl p-6 mb-8 text-left backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  📋 예약 정보
                </h3>
                <div className="grid gap-3 text-white/90">
                  <div className="flex justify-between">
                    <span>골프장:</span>
                    <span className="font-medium">{selectedCourse.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>날짜:</span>
                    <span className="font-medium">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>시간:</span>
                    <span className="font-medium">{selectedTimeSlot.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>플레이어:</span>
                    <span className="font-medium">{playerCount}명</span>
                  </div>
                  <div className="flex justify-between border-t border-white/20 pt-2">
                    <span className="font-semibold">총 금액:</span>
                    <span className="font-bold text-xl text-green-300">{formatPrice(selectedTimeSlot.price * playerCount)}</span>
                  </div>
                  {bookingResult && (
                    <div className="flex justify-between">
                      <span>예약번호:</span>
                      <span className="font-mono font-medium">{bookingResult.bookingNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setStep('course');
                  setSelectedCourse(null);
                  setSelectedDate('');
                  setSelectedTimeSlot(null);
                  setPlayerCount(2);
                  setSpecialRequests('');
                  setBookingResult(null);
                }}
                className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-12 py-4 rounded-xl text-lg font-semibold transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl"
              >
                새로운 예약하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};