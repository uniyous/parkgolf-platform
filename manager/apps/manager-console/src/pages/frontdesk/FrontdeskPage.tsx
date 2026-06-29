import React, { useState } from 'react';
import {
  useFrontdeskBookingsQuery,
  useFrontdeskBookingQuery,
  useQuoteMutation,
  useCreateBookingMutation,
  useCheckinMutation,
  usePayMutation,
} from '@/hooks/queries/frontdesk';
import type { QuoteResult } from '@/lib/api/frontdeskApi';

/**
 * 데스크 부킹·체크아웃 운영 (UNI-138 1차) — 현재 BFF 범위에서 동작.
 * 부킹 생성(견적 미리보기) → 목록 → 체크인 / 개별·전체 수납.
 */
export const FrontdeskPage: React.FC = () => {
  const [form, setForm] = useState({ clubId: '', gameTimeSlotId: '', playerCount: '1', paymentMethod: 'CASH' as 'CASH' | 'CARD' });
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [payIds, setPayIds] = useState<number[]>([]);
  const [payMethod, setPayMethod] = useState<'CASH' | 'CARD'>('CASH');

  const bookingsQ = useFrontdeskBookingsQuery({}, 1, 50);
  const detailQ = useFrontdeskBookingQuery(selectedId ?? 0);
  const quoteM = useQuoteMutation();
  const createM = useCreateBookingMutation();
  const checkinM = useCheckinMutation();
  const payM = usePayMutation();

  const num = (v: string) => (v ? Number(v) : 0);
  const body = () => ({
    clubId: num(form.clubId),
    gameTimeSlotId: num(form.gameTimeSlotId),
    playerCount: num(form.playerCount),
  });

  const onQuote = async () => {
    const r = await quoteM.mutateAsync(body());
    setQuote(r);
  };
  const onCreate = async () => {
    await createM.mutateAsync({ ...body(), paymentMethod: form.paymentMethod });
    setQuote(null);
  };

  const booking = detailQ.data;
  const players = booking?.players ?? [];
  const togglePay = (id: number) => setPayIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const onPay = async () => {
    if (!selectedId || !payIds.length) return;
    await payM.mutateAsync({ bookingId: selectedId, bookingPlayerIds: payIds, method: payMethod });
    setPayIds([]);
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-xl font-bold">데스크 부킹·체크아웃</h1>

      {/* 부킹 생성 */}
      <section className="border rounded p-4 space-y-3">
        <h2 className="font-semibold">부킹 생성</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex flex-col text-sm">클럽 ID
            <input className="border px-2 py-1 rounded w-28" value={form.clubId} onChange={(e) => setForm({ ...form, clubId: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">슬롯 ID
            <input className="border px-2 py-1 rounded w-28" value={form.gameTimeSlotId} onChange={(e) => setForm({ ...form, gameTimeSlotId: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">인원
            <input className="border px-2 py-1 rounded w-20" type="number" min={1} value={form.playerCount} onChange={(e) => setForm({ ...form, playerCount: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">결제수단
            <select className="border px-2 py-1 rounded" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as 'CASH' | 'CARD' })}>
              <option value="CASH">현금</option>
              <option value="CARD">카드</option>
            </select>
          </label>
          <button className="border rounded px-3 py-1 bg-gray-100" onClick={onQuote} disabled={quoteM.isPending}>견적</button>
          <button className="border rounded px-3 py-1 bg-blue-600 text-white" onClick={onCreate} disabled={createM.isPending}>예약</button>
        </div>
        {quote && (
          <div className="text-sm bg-gray-50 rounded p-2">
            견적 총액 <b>{quote.total.toLocaleString()}원</b> (단가 {quote.unitPrice.toLocaleString()} × {quote.playerCount}명)
            <ul className="ml-4 list-disc">
              {quote.players.map((p) => (
                <li key={p.playerNo}>P{p.playerNo}: {p.total.toLocaleString()}원 ({p.lines.map((l) => `${l.label} ${l.amount.toLocaleString()}`).join(', ')})</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 부킹 목록 */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">부킹 목록</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th>ID</th><th>번호</th><th>슬롯</th><th>인원</th><th>상태</th><th>총액</th></tr></thead>
          <tbody>
            {(bookingsQ.data?.data ?? []).map((b) => (
              <tr key={b.id} className={`border-b cursor-pointer hover:bg-gray-50 ${selectedId === b.id ? 'bg-blue-50' : ''}`} onClick={() => { setSelectedId(b.id); setPayIds([]); }}>
                <td>{b.id}</td><td>{b.bookingNumber}</td><td>{b.gameTimeSlotId}</td><td>{b.playerCount}</td><td>{b.status}</td><td>{b.totalPrice.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 체크아웃 */}
      {booking && (
        <section className="border rounded p-4 space-y-3">
          <h2 className="font-semibold">체크아웃 — 예약 #{booking.id} ({booking.bookingNumber})</h2>
          <div className="flex gap-2 items-center">
            <button className="border rounded px-3 py-1 bg-gray-100" onClick={() => checkinM.mutate({ bookingId: booking.id })} disabled={checkinM.isPending}>전체 체크인</button>
            <select className="border px-2 py-1 rounded" value={payMethod} onChange={(e) => setPayMethod(e.target.value as 'CASH' | 'CARD')}>
              <option value="CASH">현금</option><option value="CARD">카드</option>
            </select>
            <button className="border rounded px-3 py-1 bg-green-600 text-white" onClick={onPay} disabled={payM.isPending || !payIds.length}>선택 수납 ({payIds.length})</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th>선택</th><th>P#</th><th>금액</th><th>입장</th><th>수납</th></tr></thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b">
                  <td><input type="checkbox" disabled={p.paymentStatus === 'PAID'} checked={payIds.includes(p.id)} onChange={() => togglePay(p.id)} /></td>
                  <td>{p.playerNo}</td>
                  <td>{p.chargeAmount.toLocaleString()}</td>
                  <td>{p.checkedInAt ? '✅' : '-'}</td>
                  <td>{p.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};
