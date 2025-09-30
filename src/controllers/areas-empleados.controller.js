// CONTROLADOR DE EMPLEADOS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar areas/pedidos

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE EMPLEADOS (READ)
// GET /api/areas/empleados - Con paginación y búsqueda
const getAreasEmpleados = async (req, res) => {
  try {
    // 1.  Extraer parámetros de consulta con valores por defecto
    const {
      page = 1,      // Página actual (por defecto: 1)
      limit = 10,    // Elementos por página (por defecto: 10) 
      search = ''    // Término de búsqueda (por defecto: vacío)
    } = req.query;

    // 2.  Calcular cuántos registros saltar para la paginación
    // Ejemplo: página 2 con límite 10 = saltar los primeros 10 registros
    const skip = (page - 1) * limit;

    // 3.  Configurar filtros de búsqueda + solo mostrar activas (soft delete)
    const whereCondition = {
      id_estado: BigInt(1),  // Solo mostrar areas activas (no eliminadas)
      deleted_at: null,      // Solo registros NO eliminados (doble verificación)
      ...(search && {
        OR: [  // Buscar en cualquiera de estos campos
          { descripcion: { contains: search } },  // Buscar en descripción
        ]
      })
    };

    // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
    const [areas, total] = await Promise.all([
      // Obtener areas con paginación y filtros
      prisma.areas_empleados.findMany({
        where: whereCondition,
        skip: parseInt(skip),           // Saltar registros para paginación
        take: parseInt(limit),          // Limitar cantidad de resultados
        orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
        include: {
        users: true,
      }
      }),

      // Contar total de registros que coinciden con los filtros
      prisma.areas_empleados.count({ where: whereCondition })
    ]);



    // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
    res.json({
      data: areas,  // Array de areas - el middleware convertirá automáticamente BigInt y Date
      pagination: {
        page: parseInt(page),           // Página actual
        limit: parseInt(limit),         // Elementos por página
        total,                          // Total de registros
        pages: Math.ceil(total / limit) // Total de páginas
      }
    });

  } catch (error) {
    //  Manejar errores
    console.error('Error obteniendo areas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  OBTENER CATEGORIA POR ID (READ)
// GET /api/areas/empleados/:id
const getAreaEmpleadoById = async (req, res) => {
  try {
    // 1.  Obtener ID de la area desde los parámetros de la URL
    const { id } = req.params;

    console.log(' Buscando area con ID:', id);

    // 2. Buscar area específica en la base de datos (solo activas)
    const area = await prisma.areas_empleados.findUnique({
      where: { 
        id: BigInt(id)
      },
      include: {
      users: true,
      }
    });

    // 3. Verificar si la area existe
    if (!area) {
      return res.status(404).json({
        success: false,
        message: ' Area no encontrada'
      });
    }

    // 4.  Enviar respuesta exitosa con los datos de la area
    res.json({
      success: true,
      message: ' Empleado encontrada',
      data: area
    });

  } catch (error) {
    //  Manejar errores (incluye error P2025 si el ID no existe)
    console.error(' Error obteniendo area:', error);
    res.status(500).json({
      success: false,
      message: ' Error interno del servidor'
    });
  }
};





//  Exportar todas las funciones para usar en las rutas
module.exports = {
  getAreasEmpleados,    // GET /api/areas/empleados
  getAreaEmpleadoById,  // GET /api/areas/empleados/:id
};