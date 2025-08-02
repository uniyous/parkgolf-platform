import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Course, TimeSlot } from '../types/booking';

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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
  },
];

const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 6; hour < 18; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const isAvailable = Math.random() > 0.3;
    const currentBookings = isAvailable ? Math.floor(Math.random() * 2) : 4;
    
    slots.push({
      id: `slot-${hour}`,
      time: timeString,
      available: isAvailable && currentBookings < 4,
      price: 80000 + (hour >= 12 ? 20000 : 0),
      maxPlayers: 4,
      currentBookings,
    });
  }
  return slots;
};

export const BookingPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [step, setStep] = useState<'course' | 'datetime' | 'details' | 'confirmation'>('course');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [timeSlots] = useState<TimeSlot[]>(generateTimeSlots());

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setStep('datetime');
  };

  const handleDateTimeNext = () => {
    if (selectedDate && selectedTimeSlot) {
      setStep('details');
    }
  };

  const handleBookingSubmit = () => {
    if (selectedCourse && selectedTimeSlot) {
      const totalPrice = selectedTimeSlot.price * playerCount;
      alert(`예약이 완료되었습니다!\n\n골프장: ${selectedCourse.name}\n날짜: ${selectedDate}\n시간: ${selectedTimeSlot.time}\n인원: ${playerCount}명\n총 금액: ₩${totalPrice.toLocaleString()}\n\n${specialRequests ? `특별 요청: ${specialRequests}` : ''}`);
      
      // Reset form
      setStep('course');
      setSelectedCourse(null);
      setSelectedDate('');
      setSelectedTimeSlot(null);
      setPlayerCount(2);
      setSpecialRequests('');
    }
  };

  const goBack = () => {
    switch (step) {
      case 'datetime':
        setStep('course');
        setSelectedCourse(null);
        break;
      case 'details':
        setStep('datetime');
        setSelectedTimeSlot(null);
        break;
      case 'confirmation':
        setStep('course');
        break;
    }
  };

  const getProgress = () => {
    switch (step) {
      case 'course': return 25;
      case 'datetime': return 50;
      case 'details': return 75;
      case 'confirmation': return 100;
      default: return 0;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--golf-primary)',
        color: 'white',
        padding: '20px 0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>⛳ 골프장 예약</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', opacity: 0.9 }}>
                    안녕하세요, {user.name}님
                  </span>
                  <button
                    onClick={logout}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    로그아웃
                  </button>
                </div>
              )}
              {step !== 'course' && (
                <button 
                  onClick={goBack}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ← 이전 단계
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div style={{ background: 'white', padding: '20px 0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container">
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <span style={{ fontWeight: step === 'course' ? 'bold' : 'normal', color: step === 'course' ? 'var(--golf-primary)' : '#666' }}>
                1. 골프장 선택
              </span>
              <span style={{ fontWeight: step === 'datetime' ? 'bold' : 'normal', color: step === 'datetime' ? 'var(--golf-primary)' : '#666' }}>
                2. 날짜/시간
              </span>
              <span style={{ fontWeight: step === 'details' ? 'bold' : 'normal', color: step === 'details' ? 'var(--golf-primary)' : '#666' }}>
                3. 예약 정보
              </span>
              <span style={{ fontWeight: step === 'confirmation' ? 'bold' : 'normal', color: step === 'confirmation' ? 'var(--golf-primary)' : '#666' }}>
                4. 완료
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${getProgress()}%`,
                height: '100%',
                background: 'var(--golf-primary)',
                transition: 'width 0.5s ease',
                borderRadius: '4px'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ padding: '40px 0' }}>
        <div className="container">
          {/* Step 1: Course Selection */}
          {step === 'course' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--golf-primary)' }}>
                원하는 골프장을 선택해주세요
              </h2>
              <div className="grid grid-cols-1" style={{ gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
                {mockCourses.map((course) => (
                  <div
                    key={course.id}
                    className="card"
                    onClick={() => handleCourseSelect(course)}
                    style={{
                      cursor: 'pointer',
                      border: selectedCourse?.id === course.id ? '3px solid var(--golf-primary)' : '1px solid #e2e8f0',
                      background: selectedCourse?.id === course.id ? 'var(--golf-cream)' : 'white'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <img
                        src={course.imageUrl}
                        alt={course.name}
                        style={{
                          width: '120px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: '8px', color: 'var(--golf-primary)' }}>{course.name}</h3>
                        <p style={{ marginBottom: '8px', color: '#666', fontSize: '14px' }}>{course.description}</p>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                          <span>📍 {course.location}</span>
                          <span>⭐ {course.rating}</span>
                          <span>🕐 {course.openTime} - {course.closeTime}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {course.amenities.map((amenity, index) => (
                            <span
                              key={index}
                              style={{
                                background: 'var(--golf-light)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px'
                              }}
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--golf-primary)' }}>
                          ₩{course.pricePerHour.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>/ 1시간</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {step === 'datetime' && selectedCourse && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--golf-primary)' }}>
                {selectedCourse.name} - 날짜와 시간을 선택해주세요
              </h2>
              
              <div className="grid grid-cols-2" style={{ gap: '30px' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '20px' }}>날짜 선택</h3>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: '20px' }}>시간 선택</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => slot.available && setSelectedTimeSlot(slot)}
                        disabled={!slot.available}
                        style={{
                          padding: '12px 8px',
                          border: selectedTimeSlot?.id === slot.id ? '2px solid var(--golf-primary)' : '1px solid #e2e8f0',
                          borderRadius: '6px',
                          background: selectedTimeSlot?.id === slot.id ? 'var(--golf-primary)' : slot.available ? 'white' : '#f1f5f9',
                          color: selectedTimeSlot?.id === slot.id ? 'white' : slot.available ? '#333' : '#94a3b8',
                          cursor: slot.available ? 'pointer' : 'not-allowed',
                          fontSize: '12px',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontWeight: 'bold' }}>{slot.time}</div>
                        <div style={{ fontSize: '10px', marginTop: '2px' }}>
                          {slot.available ? `₩${slot.price.toLocaleString()}` : '예약마감'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedDate && selectedTimeSlot && (
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                  <button
                    onClick={handleDateTimeNext}
                    className="btn btn-primary"
                    style={{ fontSize: '18px', padding: '15px 40px' }}
                  >
                    다음 단계로 →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Booking Details */}
          {step === 'details' && selectedCourse && selectedTimeSlot && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--golf-primary)' }}>
                예약 정보를 입력해주세요
              </h2>
              
              <div className="card">
                {/* Booking Summary */}
                <div style={{ background: 'var(--golf-cream)', padding: '20px', borderRadius: '8px', marginBottom: '25px' }}>
                  <h3 style={{ marginBottom: '15px', color: 'var(--golf-primary)' }}>예약 요약</h3>
                  <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>골프장:</span>
                      <span>{selectedCourse.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>날짜:</span>
                      <span>{selectedDate}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>시간:</span>
                      <span>{selectedTimeSlot.time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>기본 요금:</span>
                      <span>₩{selectedTimeSlot.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Player Count */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
                    플레이어 수
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {[1, 2, 3, 4].map((count) => (
                      <button
                        key={count}
                        onClick={() => setPlayerCount(count)}
                        style={{
                          padding: '15px',
                          border: playerCount === count ? '2px solid var(--golf-primary)' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          background: playerCount === count ? 'var(--golf-primary)' : 'white',
                          color: playerCount === count ? 'white' : '#333',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                      >
                        {count}명
                      </button>
                    ))}
                  </div>
                </div>

                {/* Special Requests */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
                    특별 요청사항 (선택사항)
                  </label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="캐디 요청, 장비 대여 등의 요청사항을 입력해주세요"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      resize: 'vertical',
                      minHeight: '80px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Total Price */}
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  marginBottom: '25px',
                  border: '2px solid var(--golf-primary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>총 결제 금액:</span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--golf-primary)' }}>
                      ₩{(selectedTimeSlot.price * playerCount).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    * 현장에서 결제해주세요
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleBookingSubmit}
                  className="btn btn-primary"
                  style={{ 
                    width: '100%', 
                    fontSize: '18px', 
                    padding: '15px',
                    background: 'var(--golf-primary)'
                  }}
                >
                  🎉 예약 완료하기
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};