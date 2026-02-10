import { apiClient } from './client';
import { unwrapResponse, type BffResponse } from './bffParser';

export interface PreparePaymentRequest {
  amount: number;
  orderName: string;
  bookingId?: number;
}

export interface PreparePaymentResponse {
  orderId: string;
  amount: number;
  orderName: string;
}

export interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface ConfirmPaymentResponse {
  paymentId: number;
  orderId: string;
  paymentKey: string;
  amount: number;
  status: string;
}

export const paymentApi = {
  preparePayment: async (data: PreparePaymentRequest): Promise<PreparePaymentResponse> => {
    const response = await apiClient.post<BffResponse<PreparePaymentResponse>>(
      '/api/user/payments/prepare',
      data,
    );
    return unwrapResponse(response.data);
  },

  confirmPayment: async (data: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> => {
    const response = await apiClient.post<BffResponse<ConfirmPaymentResponse>>(
      '/api/user/payments/confirm',
      data,
    );
    return unwrapResponse(response.data);
  },
};
