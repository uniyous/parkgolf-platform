/**
 * NATS 응답 헬퍼
 */
export const NatsResponse = {
  success: <T>(data: T) => ({
    success: true as const,
    data,
  }),

  error: (code: string, message: string) => ({
    success: false as const,
    error: { code, message },
  }),
};
