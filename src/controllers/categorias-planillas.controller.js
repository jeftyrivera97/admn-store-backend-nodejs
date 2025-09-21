
// CONTROLADOR DE PLANILLAS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar categorias/pedidos

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE PLANILLAS (READ)
// GET /api/categorias/planillas - Con paginación y búsqueda
const getCategoriasPlanillas = async (req, res) => {
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
      id_estado: BigInt(1),  // Solo mostrar categorias activas (no eliminadas)
      deleted_at: null,      // Solo registros NO eliminados (doble verificación)
      ...(search && {
        OR: [  // Buscar en cualquiera de estos campos
          { descripcion: { contains: search } },  // Buscar en descripción
        ]
      })
    };

    // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
    const [categorias, total] = await Promise.all([
      // Obtener categorias con paginación y filtros
      prisma.categorias_planillas.findMany({
        where: whereCondition,
        skip: parseInt(skip),           // Saltar registros para paginación
        take: parseInt(limit),          // Limitar cantidad de resultados
        orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
        include: {
        users: true,
      }
      }),

      // Contar total de registros que coinciden con los filtros
      prisma.categorias_planillas.count({ where: whereCondition })
    ]);



    // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
    res.json({
      data: categorias,  // Array de categorias - el middleware convertirá automáticamente BigInt y Date
      pagination: {
        page: parseInt(page),           // Página actual
        limit: parseInt(limit),         // Elementos por página
        total,                          // Total de registros
        pages: Math.ceil(total / limit) // Total de páginas
      }
    });

  } catch (error) {
    //  Manejar errores
    console.error('Error obteniendo categorias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  OBTENER CATEGORIA POR ID (READ)
// GET /api/categorias/planillas/:id
const getCategoriaPlanillaById = async (req, res) => {
  try {
    // 1.  Obtener ID de la categoria desde los parámetros de la URL
    const { id } = req.params;

    console.log(' Buscando categoria con ID:', id);

    // 2. Buscar categoria específica en la base de datos (solo activas)
    const categoria = await prisma.categorias_planillas.findUnique({
      where: { 
        id: BigInt(id)
      },
      include: {
      users: true,
      }
    });

    // 3. Verificar si la categoria existe
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: ' Categoria no encontrada'
      });
    }

    // 4.  Enviar respuesta exitosa con los datos de la categoria
    res.json({
      success: true,
      message: ' Planilla encontrada',
      data: categoria
    });

  } catch (error) {
    //  Manejar errores (incluye error P2025 si el ID no existe)
    console.error(' Error obteniendo categoria:', error);
    res.status(500).json({
      success: false,
      message: ' Error interno del servidor'
    });
  }
};





//  Exportar todas las funciones para usar en las rutas
module.exports = {
  getCategoriasPlanillas,    // GET /api/categorias/planillas
  getCategoriaPlanillaById,  // GET /api/categorias/planillas/:id
};