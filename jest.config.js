module.exports = {
  // Entorno de testing
  testEnvironment: 'node',
  
  // Patrones de archivos de test
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Configuración de coverage
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/generated/**',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  
  // Timeout para tests largos (database operations)
  testTimeout: 10000,
  
  // Setup y teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Variables de entorno para testing
  setupFiles: ['<rootDir>/tests/env.setup.js'],
  
  // Verbose output
  verbose: true
};