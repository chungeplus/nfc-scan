import http from 'node:http';
import app from './app';

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(value: string): number | string | false {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return value;
  }

  if (parsed >= 0) {
    return parsed;
  }

  return false;
}

function onError(error: NodeJS.ErrnoException): never | void {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `pipe ${port}` : `port ${port}`;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening(): void {
  const address = server.address();
  const bind = typeof address === 'string' ? `pipe ${address}` : `port ${address?.port}`;

  console.log(`play-web-service listening on ${bind}`);
}
