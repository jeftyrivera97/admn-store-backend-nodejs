// TEST UNITARIO - JSON SERIALIZATION MIDDLEWARE
const jsonSerializationMiddleware = require('../../src/middlewares/json.middleware');

describe('🔄 JSON Serialization Middleware', () => {
  let req, res, next;
  let originalJson;

  beforeEach(() => {
    req = {};
    originalJson = jest.fn();
    res = {
      json: originalJson
    };
    next = jest.fn();
  });

  it('should serialize BigInt to string', () => {
    jsonSerializationMiddleware(req, res, next);

    const testData = {
      id: BigInt(123),
      name: 'Test'
    };

    res.json(testData);

    expect(originalJson).toHaveBeenCalledWith({
      id: '123',
      name: 'Test'
    });
  });

  it('should serialize Date to ISO string', () => {
    jsonSerializationMiddleware(req, res, next);

    const testDate = new Date('2023-01-01T00:00:00.000Z');
    const testData = {
      createdAt: testDate,
      name: 'Test'
    };

    res.json(testData);

    expect(originalJson).toHaveBeenCalledWith({
      createdAt: '2023-01-01T00:00:00.000Z',
      name: 'Test'
    });
  });

  it('should handle nested objects', () => {
    jsonSerializationMiddleware(req, res, next);

    const testData = {
      user: {
        id: BigInt(456),
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        profile: {
          id: BigInt(789)
        }
      }
    };

    res.json(testData);

    expect(originalJson).toHaveBeenCalledWith({
      user: {
        id: '456',
        createdAt: '2023-01-01T00:00:00.000Z',
        profile: {
          id: '789'
        }
      }
    });
  });

  it('should handle arrays', () => {
    jsonSerializationMiddleware(req, res, next);

    const testData = [
      { id: BigInt(1), name: 'First' },
      { id: BigInt(2), name: 'Second' }
    ];

    res.json(testData);

    expect(originalJson).toHaveBeenCalledWith([
      { id: '1', name: 'First' },
      { id: '2', name: 'Second' }
    ]);
  });

  it('should handle null and undefined', () => {
    jsonSerializationMiddleware(req, res, next);

    const testData = {
      nullValue: null,
      undefinedValue: undefined,
      id: BigInt(123)
    };

    res.json(testData);

    expect(originalJson).toHaveBeenCalledWith({
      nullValue: null,
      undefinedValue: undefined,
      id: '123'
    });
  });

  it('should call next() during setup', () => {
    jsonSerializationMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});