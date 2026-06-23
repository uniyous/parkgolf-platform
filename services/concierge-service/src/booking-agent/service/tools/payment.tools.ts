import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';

const REQUEST_TIMEOUT = 10000;

@Injectable()
export class PaymentTools {
  private readonly logger = new Logger(PaymentTools.name);

  constructor(@Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy) {}

  async preparePayment(params: {
    bookingId: number;
    amount: number;
    orderName: string;
    userId: number;
  }): Promise<{ orderId: string; paymentId: number } | null> {
    try {
      const response = await firstValueFrom(
        this.paymentClient
          .send('payment.prepare', {
            bookingId: params.bookingId,
            amount: params.amount,
            orderName: params.orderName,
            userId: params.userId,
          })
          .pipe(
            timeout(REQUEST_TIMEOUT),
            catchError((err) => {
              this.logger.error(`payment.prepare failed: ${err.message}`);
              return [null];
            }),
          ),
      );

      if (response?.success && response?.data) {
        return { orderId: response.data.orderId, paymentId: response.data.id };
      }

      this.logger.warn('payment.prepare returned unsuccessful response');
      return null;
    } catch (error) {
      this.logger.error('preparePayment unexpected error', error);
      return null;
    }
  }

  async prepareSplitPayment(params: {
    bookingGroupId?: number;
    bookingId: number;
    participants: Array<{
      userId: number;
      userName: string;
      userEmail: string;
      amount: number;
    }>;
  }): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.paymentClient.send('payment.splitPrepare', params).pipe(
          timeout(REQUEST_TIMEOUT),
          catchError((err) => {
            this.logger.error(`payment.splitPrepare failed: ${err.message}`);
            return [null];
          }),
        ),
      );
      return response?.success && response?.data ? response.data : null;
    } catch (error) {
      this.logger.error('prepareSplitPayment unexpected error', error);
      return null;
    }
  }

  async getSplitStatus(bookingId: number): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.paymentClient.send('payment.splitGet', { bookingId }).pipe(
          timeout(REQUEST_TIMEOUT),
          catchError((err) => {
            this.logger.error(`payment.splitGet failed: ${err.message}`);
            return [null];
          }),
        ),
      );
      return response?.success && response?.data ? response.data : null;
    } catch (error) {
      this.logger.error('getSplitStatus unexpected error', error);
      return null;
    }
  }

  async getSplitStatusByOrderId(orderId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.paymentClient.send('payment.splitGet', { orderId }).pipe(
          timeout(REQUEST_TIMEOUT),
          catchError((err) => {
            this.logger.error(`payment.splitGet (orderId) failed: ${err.message}`);
            return [null];
          }),
        ),
      );
      return response?.success && response?.data ? response.data : null;
    } catch (error) {
      this.logger.error('getSplitStatusByOrderId unexpected error', error);
      return null;
    }
  }
}
