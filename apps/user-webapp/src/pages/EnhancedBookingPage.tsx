import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useGames, useGameTimeSlots } from '../hooks/useGames';
import { useBooking } from '../hooks/useBooking';
import type { Game, GameTimeSlot } from '@/lib/api/gameApi';
import { Button, PriceDisplay } from '../components';

export const EnhancedBookingPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { games, isLoading: isLoadingGames } = useGames();
  const { createBooking, isCreating } = useBooking();

  const [step, setStep] = useState<'game' | 'datetime' | 'details' | 'confirmation'>('game');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<GameTimeSlot | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Fetch time slots when game and date are selected
  const { timeSlots, isLoading: isLoadingSlots } = useGameTimeSlots(
    selectedGame?.id || 0,
    selectedDate
  );

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setStep('datetime');
  };

  const handleDateTimeNext = () => {
    if (selectedDate && selectedTimeSlot) {
      setStep('details');
    }
  };

  const handleBookingComplete = async () => {
    if (!selectedGame || !selectedTimeSlot || !user) return;

    try {
      const bookingData = {
        gameId: selectedGame.id,
        gameTimeSlotId: selectedTimeSlot.id,
        bookingDate: selectedDate,
        playerCount,
        specialRequests: specialRequests || undefined,
        userEmail: user.email,
        userName: user.name,
        userPhone: user.phoneNumber,
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
    if (step === 'datetime') setStep('game');
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

  const availableSlots = timeSlots.filter((slot) => slot.available);

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
              <div className="text-white text-xl font-bold">라운드 예약</div>
              <div className="text-white/70 text-sm">
                {step === 'game' && '라운드 선택'}
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
              <Button variant="glass" size="sm" onClick={logout}>
                로그아웃
              </Button>
              {step !== 'game' && (
                <Button variant="glass" size="sm" onClick={goBack}>
                  ← 이전
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Modern Progress Bar */}
      <div className="glass-card mx-4 mb-8 !p-4 relative z-10">
        <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
          {[
            { key: 'game', label: '라운드 선택', icon: '🏌️' },
            { key: 'datetime', label: '날짜 & 시간', icon: '📅' },
            { key: 'details', label: '예약 정보', icon: '✏️' },
            { key: 'confirmation', label: '확인', icon: '✅' },
          ].map((item, index) => {
            const isActive = step === item.key;
            const isCompleted =
              ['game', 'datetime', 'details', 'confirmation'].indexOf(step) > index;

            return (
              <React.Fragment key={item.key}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold mb-2 transition-all duration-300
                    ${
                      isActive
                        ? 'bg-white/30 text-white border-2 border-white/50'
                        : isCompleted
                          ? 'bg-white/20 text-white border-2 border-white/30'
                          : 'bg-white/10 text-white/50 border border-white/20'
                    }
                  `}
                  >
                    {isCompleted ? '✓' : item.icon}
                  </div>
                  <span
                    className={`
                    text-xs font-medium text-center transition-colors duration-300
                    ${isActive ? 'text-white' : isCompleted ? 'text-white/90' : 'text-white/60'}
                  `}
                  >
                    {item.label}
                  </span>
                </div>
                {index < 3 && (
                  <div
                    className={`
                    flex-1 h-0.5 transition-all duration-300 mt-6
                    ${isCompleted ? 'bg-white/40' : 'bg-white/20'}
                  `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {step === 'game' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">라운드를 선택하세요</h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto">
                프리미엄 파크골프장에서 최고의 라운딩을 경험해보세요
              </p>
            </div>

            {isLoadingGames ? (
              <div className="glass-card text-center py-12">
                <div className="text-4xl mb-4 animate-bounce">🏌️</div>
                <p className="text-white/70">라운드 정보를 불러오는 중...</p>
              </div>
            ) : games.length === 0 ? (
              <div className="glass-card text-center py-12">
                <div className="text-6xl mb-4">🏌️</div>
                <h3 className="text-xl text-white mb-2">예약 가능한 라운드가 없습니다</h3>
                <p className="text-white/70">잠시 후 다시 시도해주세요</p>
              </div>
            ) : (
              <div className="grid gap-6 max-w-4xl mx-auto">
                {games.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => handleGameSelect(game)}
                    className="glass-card overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="w-full lg:w-80 h-48 lg:h-40 bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 rounded-xl lg:rounded-r-none flex-shrink-0 flex items-center justify-center text-6xl">
                        🏌️
                      </div>

                      <div className="flex-1 flex flex-col justify-between p-4 lg:p-0 lg:pr-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-white">{game.name}</h3>
                            {game.isActive && (
                              <span className="bg-green-400/20 text-green-300 px-2 py-0.5 rounded-full text-xs font-medium">
                                운영중
                              </span>
                            )}
                          </div>

                          <p className="text-white/70 text-sm mb-2">📍 {game.clubName}</p>

                          {game.description && (
                            <p className="text-white/80 text-sm mb-4 leading-relaxed">
                              {game.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                              ⏱️ {game.duration}분
                            </span>
                            <span className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                              👥 최대 {game.maxPlayers}명
                            </span>
                            {game.courses?.map((course, index) => (
                              <span
                                key={index}
                                className="bg-emerald-400/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                              >
                                {course.courseName}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-white/20">
                          <PriceDisplay price={game.pricePerPerson} size="lg" unit="/인" />
                          <div className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 backdrop-blur-sm">
                            선택하기 →
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'datetime' && selectedGame && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">날짜와 시간을 선택하세요</h2>
              <p className="text-white/80 text-lg">{selectedGame.name}의 라운딩 시간을 예약하세요</p>
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
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTimeSlot(null);
                  }}
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
                {!selectedDate ? (
                  <p className="text-white/70 text-center py-8">먼저 날짜를 선택해주세요</p>
                ) : isLoadingSlots ? (
                  <div className="text-center py-8">
                    <div className="text-2xl mb-2 animate-bounce">⏳</div>
                    <p className="text-white/70">시간 정보를 불러오는 중...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-white/70 text-center py-8">
                    선택한 날짜에 예약 가능한 시간이 없습니다
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-white/30">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`
                          p-3 rounded-xl text-center transition-all duration-200 backdrop-blur-sm border text-sm font-medium
                          ${
                            selectedTimeSlot?.id === slot.id
                              ? 'bg-white/30 border-white/50 text-white shadow-lg'
                              : slot.isPremium
                                ? 'bg-amber-400/20 border-amber-400/50 text-white hover:bg-amber-400/30'
                                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                          }
                        `}
                      >
                        <div className="mb-1 font-semibold">{slot.startTime}</div>
                        <div className="text-xs opacity-90">
                          {slot.isPremium && '💎 '}
                          {formatPrice(slot.price)}
                        </div>
                        <div className="text-xs text-white/70 mt-1">
                          {slot.maxCapacity - slot.currentBookings}자리
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedDate && selectedTimeSlot && (
              <div className="text-center mt-10">
                <Button variant="glass" size="lg" onClick={handleDateTimeNext}>
                  다음 단계 →
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'details' && selectedGame && selectedTimeSlot && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">예약 정보를 입력하세요</h2>
              <p className="text-white/80 text-lg">마지막 단계입니다. 추가 정보를 입력해주세요.</p>
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
                  {Array.from({ length: selectedGame.maxPlayers }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}명 {num === 1 ? '(개인 레슨)' : num === 4 ? '(풀 플라이트)' : ''}
                    </option>
                  ))}
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

              {/* Price Summary */}
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/80">기본 요금 x {playerCount}명</span>
                  <span className="text-white font-medium">
                    {formatPrice(selectedTimeSlot.price * playerCount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/20">
                  <span className="text-white font-semibold">총 결제 금액</span>
                  <span className="text-xl font-bold text-green-300">
                    {formatPrice(selectedTimeSlot.price * playerCount)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleBookingComplete}
                disabled={isCreating}
                loading={isCreating}
                variant="glass"
                size="lg"
                className="w-full"
              >
                {isCreating ? '예약 처리 중...' : '예약 완료하기'}
              </Button>
            </div>
          </div>
        )}

        {step === 'confirmation' && selectedGame && selectedTimeSlot && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass-card">
              <div className="w-20 h-20 bg-green-400/20 border border-green-400/30 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 backdrop-blur-sm">
                ✅
              </div>

              <h2 className="text-3xl font-bold text-white mb-4">예약이 완료되었습니다!</h2>

              <p className="text-white/80 text-lg mb-8">예약 확인 메일이 발송되었습니다.</p>

              <div className="bg-white/10 border border-white/20 rounded-xl p-6 mb-8 text-left backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  📋 예약 정보
                </h3>
                <div className="grid gap-3 text-white/90">
                  <div className="flex justify-between">
                    <span>라운드:</span>
                    <span className="font-medium">{selectedGame.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>골프장:</span>
                    <span className="font-medium">{selectedGame.clubName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>날짜:</span>
                    <span className="font-medium">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>시간:</span>
                    <span className="font-medium">{selectedTimeSlot.startTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>플레이어:</span>
                    <span className="font-medium">{playerCount}명</span>
                  </div>
                  <div className="flex justify-between border-t border-white/20 pt-2">
                    <span className="font-semibold">총 금액:</span>
                    <span className="font-bold text-xl text-green-300">
                      {formatPrice(selectedTimeSlot.price * playerCount)}
                    </span>
                  </div>
                  {bookingResult && (
                    <div className="flex justify-between">
                      <span>예약번호:</span>
                      <span className="font-mono font-medium">{bookingResult.bookingNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="glass"
                size="lg"
                onClick={() => {
                  setStep('game');
                  setSelectedGame(null);
                  setSelectedDate('');
                  setSelectedTimeSlot(null);
                  setPlayerCount(2);
                  setSpecialRequests('');
                  setBookingResult(null);
                }}
              >
                새로운 예약하기
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
