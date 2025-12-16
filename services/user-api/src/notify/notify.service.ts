import { Injectable, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class NotifyService {
  constructor(
    @Optional() @Inject('NATS_CLIENT') private readonly natsClient?: ClientProxy,
  ) {}

  async sendEmail(data: {
    to: string;
    subject: string;
    template: string;
    context: any;
  }) {
    return lastValueFrom(
      this.natsClient.send('notify.send.email', data),
    );
  }

  async sendSMS(data: {
    to: string;
    message: string;
  }) {
    return lastValueFrom(
      this.natsClient.send('notify.send.sms', data),
    );
  }

  async sendBookingConfirmation(bookingId: string) {
    return lastValueFrom(
      this.natsClient.send('notify.booking.confirmation', { bookingId }),
    );
  }

  async sendBookingCancellation(bookingId: string) {
    return lastValueFrom(
      this.natsClient.send('notify.booking.cancellation', { bookingId }),
    );
  }
}