// Setup global para todos los tests
const { PrismaClient } = require('../src/generated/prisma');

// Mock de Prisma para tests
jest.mock('../src/generated/prisma', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      // Mock de métodos de Prisma más comunes
      usuarios: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      clientes: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      compras: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      // Agregar más modelos según necesites
      $disconnect: jest.fn(),
    })),
  };
});

// Configuración global para tests
beforeAll(async () => {
  // Setup que se ejecuta antes de todos los tests
});

afterAll(async () => {
  // Cleanup que se ejecuta después de todos los tests
});

beforeEach(() => {
  // Reset de mocks antes de cada test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup después de cada test
});