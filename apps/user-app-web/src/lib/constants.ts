export const CHAT_PAYMENT_CONTEXT_KEY = 'CHAT_PAYMENT_CONTEXT';

export interface ChatPaymentContext {
  roomId: string;
  conversationId: string;
  orderId: string;
  amount: number;
  orderName: string;
  type: 'single' | 'split';
}
