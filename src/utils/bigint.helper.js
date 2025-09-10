/**
 * Convierte BigInt a string en objetos para JSON serialization
 * @param {any} obj - Objeto a serializar
 * @returns {any} - Objeto con BigInt convertidos a string
 */
const serializeBigInt = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const serialized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
};

/**
 * Middleware para serializar automáticamente BigInt en respuestas JSON
 */
const bigIntMiddleware = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function (data) {
    return originalJson.call(this, serializeBigInt(data));
  };
  
  next();
};

module.exports = {
  serializeBigInt,
  bigIntMiddleware
};
