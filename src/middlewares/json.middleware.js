//  MIDDLEWARE DE SERIALIZACIÓN JSON
// Convierte automáticamente BigInt y Date a strings en todas las respuestas JSON

const jsonSerializationMiddleware = (req, res, next) => {
  //  Guardar la función json original de Express
  const originalJson = res.json;

  // Sobrescribir la función json con nuestra lógica personalizada
  res.json = function(data) {
    //  Función recursiva para procesar cualquier estructura de datos
    const processData = (obj) => {
      if (obj === null || obj === undefined) {
        return obj;
      }

      // Si es un Array, procesar cada elemento
      if (Array.isArray(obj)) {
        return obj.map(processData);
      }

      // Si es una Date, convertir a ISO string
      if (obj instanceof Date) {
        return obj.toISOString();
      }

      // Si es BigInt, convertir a string
      if (typeof obj === 'bigint') {
        return obj.toString();
      }

      // Si es un objeto, procesar todas sus propiedades
      if (typeof obj === 'object') {
        const processed = {};
        for (const [key, value] of Object.entries(obj)) {
          processed[key] = processData(value);
        }
        return processed;
      }

      // Para todos los demás tipos (string, number, boolean, etc.)
      return obj;
    };

    //  Procesar los datos y enviar la respuesta
    const processedData = processData(data);
    return originalJson.call(this, processedData);
  };

  //  Continuar al siguiente middleware
  next();
};

module.exports = jsonSerializationMiddleware;
