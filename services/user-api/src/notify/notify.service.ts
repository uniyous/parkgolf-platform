import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../shared/nats';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async sendEmail(data: { to: string; subject: string; template: string; context: any }) {
    this.logger.log(`Sending email to: ${data.to}`);
    return this.natsClient.send('notify.send.email', data);
  }

  async sendSMS(data: { to: string; message: string }) {
    this.logger.log(`Sending SMS to: ${data.to}`);
    return this.natsClient.send('notify.send.sms', data);
  }

  async sendBookingConfirmation(bookingId: string) {
    this.logger.log(`Sending booking confirmation for: ${bookingId}`);
    return this.natsClient.send('notify.booking.confirmation', { bookingId });
  }

  async sendBookingCancellation(bookingId: string) {
    this.logger.log(`Sending booking cancellation for: ${bookingId}`);
    return this.natsClient.send('notify.booking.cancellation', { bookingId });
  }
}
