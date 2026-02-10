import { useMutation } from '@tanstack/react-query';
import {
  paymentApi,
  type PreparePaymentRequest,
  type ConfirmPaymentRequest,
} from '@/lib/api/paymentApi';

export const usePreparePaymentMutation = () => {
  return useMutation({
    mutationFn: (data: PreparePaymentRequest) => paymentApi.preparePayment(data),
  });
};

export const useConfirmPaymentMutation = () => {
  return useMutation({
    mutationFn: (data: ConfirmPaymentRequest) => paymentApi.confirmPayment(data),
  });
};
