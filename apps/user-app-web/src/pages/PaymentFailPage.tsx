import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, SubPageHeader } from '@/components/layout';
import { Button } from '../components';

const CHECKOUT_STORAGE_KEY = 'parkgolf_checkout_context';

export const PaymentFailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const code = searchParams.get('code') ?? '';
  const message = searchParams.get('message') ?? '결제가 취소되었거나 실패했습니다.';

  const handleRetry = () => {
    const stored = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (stored) {
      navigate('/checkout', { state: JSON.parse(stored) });
    } else {
      navigate('/bookings');
    }
  };

  return (
    <div className="min-h-screen gradient-forest relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-red-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-red-400/20 rounded-full blur-3xl" />
      </div>

      <SubPageHeader title="결제 실패" onBack={false} />

      <Container className="relative z-10 py-8">
        <div className="glass-card text-center mb-8">
          <div className="w-20 h-20 bg-red-400/30 border-2 border-red-400/50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            ❌
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">결제에 실패했습니다</h2>

          <p className="text-white/70 text-base mb-4">{decodeURIComponent(message)}</p>

          {code && (
            <p className="text-white/50 text-sm mb-8">오류 코드: {code}</p>
          )}

          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleRetry}
              variant="glass"
              size="lg"
              className="!bg-white/90 hover:!bg-white !text-slate-800"
            >
              다시 시도
            </Button>
            <Button
              onClick={() => navigate('/my-bookings', { replace: true })}
              variant="glass"
              size="lg"
            >
              예약 목록
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
};
