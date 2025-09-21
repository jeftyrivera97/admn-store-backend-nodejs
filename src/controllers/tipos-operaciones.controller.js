// CONTROLADOR DE TIPOS OPERACIONESS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar categorias/pedidos

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE TIPOS OPERACIONESS (READ)
// GET /api/tiposOperaciones - Con paginación y búsqueda
const getTiposOperaciones = async (req, res) => {
  try {

    // 2.  Configurar filtros de búsqueda + solo mostrar activas (soft delete)
    const whereCondition = {
      id_estado: BigInt(1),  // Solo mostrar categorias activas (no eliminadas)
      deleted_at: null,      // Solo registros NO eliminados (doble verificación)
    };

    // 3.  Ejecutar consultas en paralelo para optimizar rendimiento
    const [tiposOperaciones, total] = await Promise.all([
      // Obtener tipos de operaciones con paginación y filtros
      prisma.tipos_operaciones.findMany({
        where: whereCondition,
        orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
      }),

      // Contar total de registros que coinciden con los filtros
      prisma.tipos_operaciones.count({ where: whereCondition })
    ]);



    // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
    res.json({
      data: tiposOperaciones,  // Array de tipos de operaciones - el middleware convertirá automáticamente BigInt y Date
    });

  } catch (error) {
    //  Manejar errores
    console.error('Error obteniendo tipos de operaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  OBTENER CATEGORIA POR ID (READ)
// GET /api/categorias/tiposOperaciones/:id
const getTipoOperacionById = async (req, res) => {
  try {
    // 1.  Obtener ID de la categoria desde los parámetros de la URL
    const { id } = req.params;

    console.log(' Buscando tipo de operación con ID:', id);

    // 2. Buscar tipo de operación específica en la base de datos (solo activas)
    const tipoOperacion = await prisma.tipos_operaciones.findUnique({
      where: { 
        id: BigInt(id)
      },
    });

    // 3. Verificar si la categoria existe
    if (!tipoOperacion) {
      return res.status(404).json({
        success: false,
        message: ' Tipo de operación no encontrada'
      });
    }

    // 4.  Enviar respuesta exitosa con los datos de la categoria
    res.json({
      success: true,
      message: ' Tipo de operación encontrada',
      data: tipoOperacion
    });

  } catch (error) {
    //  Manejar errores (incluye error P2025 si el ID no existe)
    console.error(' Error obteniendo tipo de operación:', error);
    res.status(500).json({
      success: false,
      message: ' Error interno del servidor'
    });
  }
};





//  Exportar todas las funciones para usar en las rutas
module.exports = {
  getTiposOperaciones,    // GET /api/tiposOperaciones
  getTipoOperacionById,  // GET /api/tiposOperaciones/:id
};