// 🔧 UTILIDAD PARA MANEJAR BIGINT
// Prisma devuelve IDs como BigInt, pero JSON no puede serializarlos
// Esta utilidad convierte BigInt a string automáticamente

/**
 *  Convierte BigInt a string en objetos para JSON serialization
 * @param {any} obj - Objeto a serializar
 * @returns {any} - Objeto con BigInt convertidos a string
 */
const serializeBigInt = (obj) => {
  // Si es null o undefined, devolver tal como está
  if (obj === null || obj === undefined) return obj;
  
  // Si es un BigInt, convertirlo a string
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Si es un array, procesar cada elemento recursivamente
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  // Si es un objeto, procesar cada propiedad recursivamente
  if (typeof obj === 'object') {
    const serialized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  
  // Para otros tipos (string, number, boolean), devolver tal como está
  return obj;
};

/**
 *  Middleware para serializar automáticamente BigInt en respuestas JSON
 * Se ejecuta automáticamente en todas las respuestas
 */
const bigIntMiddleware = (req, res, next) => {
  //  Guardar la función original res.json
  const originalJson = res.json;
  
  //  Sobrescribir res.json para procesar BigInt automáticamente
  res.json = function (data) {
    // Convertir BigInt a string antes de enviar la respuesta
    return originalJson.call(this, serializeBigInt(data));
  };
  
  //  Continuar al siguiente middleware
  next();
};

// 📤 Exportar ambas funciones
module.exports = {
  serializeBigInt,     // Para uso manual en controladores
  bigIntMiddleware     // Para uso automático en app.js
};
