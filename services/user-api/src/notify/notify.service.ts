import { Injectable } from '@nestjs/common';
import { NatsClientService } from '../shared/nats';

@Injectable()
export class NotifyService {
  constructor(private readonly natsClient: NatsClientService) {}

  async sendEmail(data: { to: string; subject: string; template: string; context: any }) {
    return this.natsClient.send('notify.send.email', data);
  }

  async sendSMS(data: { to: string; message: string }) {
    return this.natsClient.send('notify.send.sms', data);
  }

  async sendBookingConfirmation(bookingId: string) {
    return this.natsClient.send('notify.booking.confirmation', { bookingId });
  }

  async sendBookingCancellation(bookingId: string) {
    return this.natsClient.send('notify.booking.cancellation', { bookingId });
  }
}