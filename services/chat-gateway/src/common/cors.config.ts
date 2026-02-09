const DEFAULT_ORIGINS: (string | RegExp)[] = [
  'http://localhost:3002',
  /^https:\/\/.*\.run\.app$/,
  'https://parkgolf-user.web.app',
  'https://parkgolf-user-dev.web.app',
  'https://dev-user.goparkmate.com',
  'https://user.goparkmate.com',
  'https://dev-api.goparkmate.com',
  'https://api.goparkmate.com',
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
