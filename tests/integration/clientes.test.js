// TEST DE INTEGRACIÓN - CLIENTES ENDPOINTS
const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

describe(' CLIENTES Endpoints', () => {
  let authToken;

  beforeAll(() => {
    // Crear token de prueba
    authToken = jwt.sign(
      { userId: '1' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/clientes', () => {
    it('should return clients list with pagination', async () => {
      const response = await request(app)
        .get('/api/clientes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/clientes')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token no proporcionado');
    });

    it('should support search parameter', async () => {
      const response = await request(app)
        .get('/api/clientes?search=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/clientes?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('POST /api/clientes', () => {
    it('should create a new client with valid data', async () => {
      const clientData = {
        codigo_cliente: 'CLI001',
        nombre: 'Cliente Test',
        direccion: 'Dirección Test',
        telefono: '12345678',
        email: 'cliente@test.com'
      };

      const response = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for missing required fields', async () => {
      const clientData = {
        // Falta codigo_cliente requerido
        nombre: 'Cliente Test'
      };

      const response = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/clientes/:id', () => {
    it('should return a specific client', async () => {
      const clientId = '1';

      const response = await request(app)
        .get(`/api/clientes/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 404 for non-existent client', async () => {
      const clientId = '999999';

      const response = await request(app)
        .get(`/api/clientes/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});