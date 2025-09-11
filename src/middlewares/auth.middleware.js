//  MIDDLEWARE DE AUTENTICACIÓN
// Este middleware verifica que el usuario esté autenticado antes de acceder a rutas protegidas

//  Importar librería para verificar tokens JWT
const jwt = require('jsonwebtoken');

//  Función middleware de autenticación
// Se ejecuta entre la petición y el controlador
const authMiddleware = (req, res, next) => {
  try {
    // 1.  Extraer token del header Authorization
    // El header viene como: "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
    // Removemos la palabra "Bearer " para obtener solo el token
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // 2.  Si no hay token, rechazar la petición
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // 3.  Verificar que el token sea válido y no haya expirado
    // jwt.verify() decodifica el token usando la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4.  Guardar información del usuario en req.user
    // Esto permite que los controladores accedan a los datos del usuario autenticado
    req.user = decoded;
    
    // 5.  Continuar al siguiente middleware o controlador
    next();
    
  } catch (error) {
    //  Si hay cualquier error (token inválido, expirado, etc.)
    console.error('Error en autenticación:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Exportar para usar en las rutas
module.exports = authMiddleware;