const http = require('http');

const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      port: port
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Health check server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});