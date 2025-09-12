// HELPERS PARA TESTS
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT válido para tests
 */
const generateTestToken = (userId = '1', expiresIn = '1h') => {
  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Genera un token JWT expirado para tests
 */
const generateExpiredToken = (userId = '1') => {
  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '-1h' } // Expirado hace 1 hora
  );
};

/**
 * Genera datos de usuario mock
 */
const generateMockUser = (overrides = {}) => {
  return {
    id: BigInt(1),
    email: 'test@example.com',
    name: 'Test User',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
};

/**
 * Genera datos de cliente mock
 */
const generateMockClient = (overrides = {}) => {
  return {
    id: BigInt(1),
    codigo_cliente: 'CLI001',
    nombre: 'Cliente Test',
    direccion: 'Dirección Test',
    telefono: '12345678',
    email: 'cliente@test.com',
    id_estado: BigInt(1),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides
  };
};

/**
 * Genera respuesta de paginación mock
 */
const generateMockPagination = (overrides = {}) => {
  return {
    page: 1,
    limit: 10,
    total: 25,
    pages: 3,
    ...overrides
  };
};

/**
 * Simula respuesta exitosa estándar
 */
const generateSuccessResponse = (data, message = 'Operación exitosa') => {
  return {
    success: true,
    message,
    data
  };
};

/**
 * Simula respuesta de error estándar
 */
const generateErrorResponse = (message = 'Error', errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return response;
};

module.exports = {
  generateTestToken,
  generateExpiredToken,
  generateMockUser,
  generateMockClient,
  generateMockPagination,
  generateSuccessResponse,
  generateErrorResponse
};