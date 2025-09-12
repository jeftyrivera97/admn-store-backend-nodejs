// TEST UNITARIO - AUTH MIDDLEWARE
const authMiddleware = require('../../src/middlewares/auth.middleware');
const jwt = require('jsonwebtoken');

// Mock de jwt
jest.mock('jsonwebtoken');

describe('🔐 Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next() with valid token', () => {
    const mockDecoded = { userId: '123' };
    
    req.header.mockReturnValue('Bearer valid-token');
    jwt.verify.mockReturnValue(mockDecoded);

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(req.user).toEqual(mockDecoded);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when no token provided', () => {
    req.header.mockReturnValue(undefined);

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token no proporcionado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with invalid token', () => {
    req.header.mockReturnValue('Bearer invalid-token');
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle token without Bearer prefix', () => {
    req.header.mockReturnValue('just-token-without-bearer');

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('just-token-without-bearer', process.env.JWT_SECRET);
  });
});