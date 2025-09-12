// Variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-super-long-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = '3002';  // Puerto diferente para tests

// Mock console.log durante tests para output más limpio
global.console = {
  ...console,
  // Descomenta la siguiente línea si quieres silenciar logs durante tests
  // log: jest.fn(),
};