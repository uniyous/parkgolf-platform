const DEFAULT_ORIGINS: (string | RegExp)[] = [
  'http://localhost:3002',
  /^https:\/\/.*\.run\.app$/,
  'https://parkgolf-user.web.app',
  'https://parkgolf-user-dev.web.app',
  'https://dev-user.parkgolfmate.com',
  'https://user.parkgolfmate.com',
  'https://dev-api.parkgolfmate.com',
  'https://api.parkgolfmate.com',
];

export function getCorsConfig() {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  return {
    origin: envOrigins
      ? envOrigins.split(',').map(o => o.trim())
      : DEFAULT_ORIGINS,
    credentials: true,
  };
}
