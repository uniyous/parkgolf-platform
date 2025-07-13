import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Course, EnhancedTimeSlot } from '../types/booking';

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
  const [step, setStep] = useState<'course' | 'datetime' | 'details' | 'confirmation'>('course');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<EnhancedTimeSlot | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [timeSlots] = useState<EnhancedTimeSlot[]>(generateTimeSlots());

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setStep('datetime');
  };

  const handleDateTimeNext = () => {
    if (selectedDate && selectedTimeSlot) {
      setStep('details');
    }
  };

  const handleBookingComplete = () => {
    setStep('confirmation');
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
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, var(--neutral-50) 0%, var(--golf-cream) 100%)' 
    }}>
      {/* Modern Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div className="container">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            height: '80px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'var(--golf-secondary)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                ⛳
              </div>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: '700',
                color: 'var(--neutral-900)',
                margin: 0
              }}>
                골프장 예약
              </h1>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    padding: '8px 16px',
                    background: 'var(--golf-light)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '14px',
                    color: 'var(--golf-dark)',
                    fontWeight: '500'
                  }}>
                    {user.name}님
                  </div>
                  <button
                    onClick={logout}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--neutral-300)',
                      color: 'var(--neutral-600)',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
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
                    background: 'var(--neutral-100)',
                    border: '1px solid var(--neutral-300)',
                    color: 'var(--neutral-700)',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ← 이전
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modern Progress Bar */}
      <div style={{ 
        background: 'white', 
        padding: '24px 0',
        borderBottom: '1px solid var(--neutral-200)'
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '600px', margin: '0 auto' }}>
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
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    flex: 1
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: isActive ? 'var(--golf-secondary)' : isCompleted ? 'var(--golf-accent)' : 'var(--neutral-200)',
                      color: isActive || isCompleted ? 'white' : 'var(--neutral-500)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: '600',
                      marginBottom: '8px',
                      transition: 'all 0.3s ease'
                    }}>
                      {isCompleted ? '✓' : item.icon}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: isActive ? 'var(--golf-secondary)' : isCompleted ? 'var(--golf-accent)' : 'var(--neutral-500)',
                      textAlign: 'center'
                    }}>
                      {item.label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div style={{
                      flex: 1,
                      height: '2px',
                      background: isCompleted ? 'var(--golf-accent)' : 'var(--neutral-200)',
                      marginTop: '24px',
                      transition: 'all 0.3s ease'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
        {step === 'course' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: 'var(--neutral-900)',
                marginBottom: '8px'
              }}>
                완벽한 골프장을 선택하세요
              </h2>
              <p style={{ 
                fontSize: '18px', 
                color: 'var(--neutral-600)',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                프리미엄 골프장에서 최고의 라운딩을 경험해보세요
              </p>
            </div>

            <div className="grid grid-cols-1" style={{ gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
              {mockCourses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => handleCourseSelect(course)}
                  style={{
                    background: 'white',
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-md)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid var(--neutral-200)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                >
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{
                      width: '200px',
                      height: '160px',
                      background: `url(${course.imageUrl}) center/cover`,
                      flexShrink: 0
                    }} />
                    
                    <div style={{ 
                      padding: '24px 24px 24px 0',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <h3 style={{ 
                            fontSize: '20px', 
                            fontWeight: '600',
                            color: 'var(--neutral-900)',
                            margin: 0
                          }}>
                            {course.name}
                          </h3>
                          <div style={{
                            background: 'var(--golf-light)',
                            color: 'var(--golf-dark)',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ⭐ {course.rating}
                          </div>
                        </div>
                        
                        <p style={{ 
                          color: 'var(--neutral-600)', 
                          fontSize: '14px',
                          margin: '0 0 8px 0'
                        }}>
                          📍 {course.location}
                        </p>
                        
                        <p style={{ 
                          color: 'var(--neutral-700)', 
                          fontSize: '16px',
                          margin: '0 0 16px 0',
                          lineHeight: '1.5'
                        }}>
                          {course.description}
                        </p>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                          {course.amenities.map((amenity, index) => (
                            <span
                              key={index}
                              style={{
                                background: 'var(--neutral-100)',
                                color: 'var(--neutral-600)',
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ 
                            fontSize: '24px', 
                            fontWeight: '700',
                            color: 'var(--golf-secondary)'
                          }}>
                            {formatPrice(course.pricePerHour)}
                          </span>
                          <span style={{ 
                            color: 'var(--neutral-500)', 
                            fontSize: '14px',
                            marginLeft: '4px'
                          }}>
                            /시간
                          </span>
                        </div>
                        
                        <div style={{
                          background: 'var(--golf-secondary)',
                          color: 'white',
                          padding: '10px 20px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
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
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: 'var(--neutral-900)',
                marginBottom: '8px'
              }}>
                날짜와 시간을 선택하세요
              </h2>
              <p style={{ 
                fontSize: '16px', 
                color: 'var(--neutral-600)'
              }}>
                {selectedCourse.name}에서의 라운딩 시간을 예약하세요
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* Date Selection */}
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--neutral-200)'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: 'var(--neutral-900)',
                  marginBottom: '20px'
                }}>
                  📅 날짜 선택
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '2px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '16px',
                    background: 'var(--neutral-50)',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Time Selection */}
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--neutral-200)'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: 'var(--neutral-900)',
                  marginBottom: '20px'
                }}>
                  🕐 시간 선택
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedTimeSlot(slot)}
                      disabled={!slot.isAvailable}
                      style={{
                        padding: '12px 8px',
                        border: '2px solid',
                        borderColor: selectedTimeSlot?.id === slot.id 
                          ? 'var(--golf-secondary)' 
                          : slot.isAvailable ? 'var(--neutral-200)' : 'var(--neutral-100)',
                        borderRadius: 'var(--radius-md)',
                        background: selectedTimeSlot?.id === slot.id 
                          ? 'var(--golf-light)' 
                          : slot.isAvailable ? 'white' : 'var(--neutral-50)',
                        color: selectedTimeSlot?.id === slot.id 
                          ? 'var(--golf-dark)' 
                          : slot.isAvailable ? 'var(--neutral-700)' : 'var(--neutral-400)',
                        cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: selectedTimeSlot?.id === slot.id ? '600' : '500',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ marginBottom: '2px' }}>{slot.time}</div>
                      <div style={{ fontSize: '10px', opacity: 0.8 }}>
                        {slot.isPremium && '💎'} {formatPrice(slot.price)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedDate && selectedTimeSlot && (
              <div style={{ 
                marginTop: '32px',
                textAlign: 'center'
              }}>
                <button
                  onClick={handleDateTimeNext}
                  className="btn btn-primary"
                  style={{
                    padding: '16px 48px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: 'var(--radius-lg)'
                  }}
                >
                  다음 단계 →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'details' && selectedCourse && selectedTimeSlot && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: 'var(--neutral-900)',
                marginBottom: '8px'
              }}>
                예약 정보를 입력하세요
              </h2>
              <p style={{ 
                fontSize: '16px', 
                color: 'var(--neutral-600)'
              }}>
                마지막 단계입니다. 추가 정보를 입력해주세요.
              </p>
            </div>

            <div style={{
              background: 'white',
              padding: '32px',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--neutral-200)'
            }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: 'var(--neutral-700)'
                }}>
                  플레이어 수
                </label>
                <select
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '2px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '16px',
                    background: 'white'
                  }}
                >
                  <option value={1}>1명 (개인 레슨)</option>
                  <option value={2}>2명</option>
                  <option value={3}>3명</option>
                  <option value={4}>4명 (풀 플라이트)</option>
                </select>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: 'var(--neutral-700)'
                }}>
                  특별 요청사항 (선택사항)
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="카트 요청, 캐디 서비스, 기타 요청사항을 입력해주세요."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '2px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                onClick={handleBookingComplete}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                예약 완료하기
              </button>
            </div>
          </div>
        )}

        {step === 'confirmation' && selectedCourse && selectedTimeSlot && (
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              background: 'white',
              padding: '48px 32px',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--neutral-200)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'var(--golf-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                margin: '0 auto 24px'
              }}>
                ✅
              </div>
              
              <h2 style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: 'var(--neutral-900)',
                marginBottom: '16px'
              }}>
                예약이 완료되었습니다!
              </h2>
              
              <p style={{ 
                fontSize: '16px', 
                color: 'var(--neutral-600)',
                marginBottom: '32px'
              }}>
                예약 확인 메일이 발송되었습니다.
              </p>

              <div style={{
                background: 'var(--neutral-50)',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '32px',
                textAlign: 'left'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: 'var(--neutral-900)',
                  marginBottom: '16px'
                }}>
                  📋 예약 정보
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div><strong>골프장:</strong> {selectedCourse.name}</div>
                  <div><strong>날짜:</strong> {selectedDate}</div>
                  <div><strong>시간:</strong> {selectedTimeSlot.time}</div>
                  <div><strong>플레이어:</strong> {playerCount}명</div>
                  <div><strong>금액:</strong> {formatPrice(selectedTimeSlot.price * playerCount)}</div>
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
                }}
                className="btn btn-primary"
                style={{
                  padding: '16px 48px',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-lg)'
                }}
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