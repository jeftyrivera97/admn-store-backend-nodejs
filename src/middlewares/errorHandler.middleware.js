//  MIDDLEWARE DE MANEJO GLOBAL DE ERRORES
// Este middleware captura TODOS los errores que ocurren en la aplicación

//  Función para manejar errores de forma centralizada
// (err, req, res, next) - El parámetro 'err' indica que es un error handler
const errorHandler = (err, req, res, next) => {
  //  Registrar el error en la consola para debugging
  console.error('Error:', err);

  //  ERRORES ESPECÍFICOS DE PRISMA (Base de datos)
  
  // Error P2002: Violación de restricción única (email duplicado, etc.)
  if (err.code === 'P2002') {
    return res.status(400).json({
      error: 'Ya existe un registro con estos datos únicos'
    });
  }

  // Error P2025: Registro no encontrado (al intentar actualizar/eliminar)
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro no encontrado'
    });
  }

  //  ERRORES DE JWT (Token inválido)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido'
    });
  }

  //  ERRORES DE VALIDACIÓN (express-validator)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      details: err.message
    });
  }

  // ERROR GENÉRICO (fallback para errores no específicos)
  res.status(500).json({
    error: 'Error interno del servidor',
    // Solo mostrar detalles del error en desarrollo, no en producción
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
};

//  Exportar para usar en app.js
module.exports = errorHandler;
