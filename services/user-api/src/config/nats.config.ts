import { Transport } from '@nestjs/microservices';

export const natsConfig = {
  transport: Transport.NATS,
  options: {
    servers: [process.env.NATS_URL || 'nats://localhost:4222'],
    queue: 'user-api',
  },
};