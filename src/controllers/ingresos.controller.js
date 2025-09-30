// CONTROLADOR DE INGRESOS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar ingresos

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE INGRESOS (READ)
// GET /ingresos?page=1&limit=50&search=ABC&month=2025-02
const getIngresos = async (req, res) => {
  try {
    const {
      page = "1",
      limit = "50",
      search = "",
      month: monthParam = null, // "YYYY-MM"
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    // --- Normalizar month: si no viene, usar mes actual (UTC) ---
    const isYearMonth = (s) => /^\d{4}-\d{2}$/.test(s);
    let y, m; // year, month(1..12)
    if (monthParam && isYearMonth(monthParam)) {
      [y, m] = monthParam.split("-").map(Number);
    } else {
      const now = new Date();
      y = now.getUTCFullYear();
      m = now.getUTCMonth() + 1;
    }

    // --- Rangos de fechas en UTC ---
    // Mes actual (o el que pediste)
    const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const monthRange = { gte: monthStart, lt: nextMonthStart };

    // Mes anterior
    const prevMonthStart = new Date(Date.UTC(y, m - 2, 1, 0, 0, 0, 0));
    const prevMonthNextStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const prevMonthRange = { gte: prevMonthStart, lt: prevMonthNextStart };

    // Año del mes elegido
    const yearStart = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const nextYearStart = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0));
    const yearRange = { gte: yearStart, lt: nextYearStart };

    // --- Filtros base (ajusta tipos según tu schema: Int vs BigInt) ---
    const baseFilter = {
      id_estado: BigInt(1),
      deleted_at: null,
      ...(search && search.trim() && {
        OR: [
          { codigo_ingreso: { contains: String(search), mode: "insensitive" } },
          // agrega más campos si quieres
        ],
      }),
    };

    // --- where para listado/paginación (mes actual/solicitado) ---
    const whereList = { ...baseFilter, fecha: monthRange };

    // --- Consultas en paralelo ---
    const [ingresos, total, aggMes, aggPrevMes, aggAnio] = await Promise.all([
      prisma.ingresos.findMany({
        where: whereList,
        skip,
        take: limitNum,
        orderBy: { created_at: "desc" }, // o { fecha: "desc" }
        include: {
          categorias_ingresos: true,
          estados: true,
        },
      }),
      prisma.ingresos.count({ where: whereList }),
      prisma.ingresos.aggregate({
        where: { ...baseFilter, fecha: monthRange },
        _sum: { total: true },
      }),
      prisma.ingresos.aggregate({
        where: { ...baseFilter, fecha: prevMonthRange },
        _sum: { total: true },
      }),
      prisma.ingresos.aggregate({
        where: { ...baseFilter, fecha: yearRange },
        _sum: { total: true },
      }),
    ]);

    const totalMes = Number(aggMes?._sum?.total ?? 0);
    const totalMesPrevio = Number(aggPrevMes?._sum?.total ?? 0);
    const totalAnio = Number(aggAnio?._sum?.total ?? 0);

    // % variación vs mes anterior
    // Si el mes anterior fue 0:
    //   - si el actual > 0 => 100%
    //   - si el actual = 0 => 0%
    const porcentajeCambio =
      totalMesPrevio === 0
        ? (totalMes > 0 ? 100 : 0)
        : ((totalMes - totalMesPrevio) / totalMesPrevio) * 100;

    res.json({
      data: ingresos,
      totals: {
        totalMes,
        totalMesPrevio,
        totalAnio,
        diferenciaMesVsPrevio: totalMes - totalMesPrevio,
        porcentajeCambio: Number(porcentajeCambio.toFixed(2)), // ej. 12.34
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      meta: {
        month: `${y}-${String(m).padStart(2, "0")}`,
        prevMonth: (() => {
          // solo para referencia en el front
          const pm = new Date(prevMonthStart);
          const py = pm.getUTCFullYear();
          const pmm = pm.getUTCMonth() + 1;
          return `${py}-${String(pmm).padStart(2, "0")}`;
        })(),
      },
    });
  } catch (error) {
    console.error("Error obteniendo ingresos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


const getIngresoById = async (req, res) => {
    try {
        // 1.  Obtener ID de la ingreso desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando ingreso con ID:', id);

        // 2. 🔍 Buscar ingreso específica en la base de datos (solo activas)
        const ingreso = await prisma.ingresos.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo ingresos activas
                deleted_at: null       // Solo registros NO eliminados
            },
            include: {
                categorias_ingresos: true,
                estados: true,
            }
        });

        // 3. Verificar si la ingreso existe
        if (!ingreso) {
            return res.status(404).json({
                success: false,
                message: ' Ingreso no encontrada'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la ingreso
        res.json({
            success: true,
            message: ' Ingreso encontrada',
            data: ingreso
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo ingreso:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};

//  CREAR NUEVA INGRESO (CREATE)
// POST /api/ingresos
const createIngreso = async (req, res) => {
    try {
        // 1.  Verificar que las validaciones pasaron
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 2.  Extraer datos del cuerpo de la petición
        const { codigo_ingreso, fecha, descripcion, id_categoria, total } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        // req.user fue establecido por authMiddleware
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma
      


        // 4. Crear ingreso en la base de datos
        const ingreso = await prisma.ingresos.create({
            data: {
                codigo_ingreso,
                fecha,
                descripcion,
                id_categoria,
                total,
                id_usuario: userId,         // Usuario que crea el ingreso
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        console.log(' Ingreso creada exitosamente:', ingreso.id);

        // 5.  Enviar respuesta exitosa
        res.status(201).json({
            success: true,
            message: ' Ingreso creada exitosamente',
            data: ingreso
        });

    } catch (error) {
        // Manejar errores
        console.error('Error creando ingreso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ACTUALIZAR INGRESO EXISTENTE (UPDATE)
// PUT /api/ingresos/:id
const updateIngreso = async (req, res) => {
    try {
        // 1.  Obtener ID de la ingreso desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { codigo_ingreso, fecha, descripcion, id_categoria, total } = req.body;
           const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

        // 3. Actualizar ingreso en la base de datos (solo si está activa)
        const ingreso = await prisma.ingresos.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar ingresos activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                codigo_ingreso,
                fecha,
                descripcion,
                id_categoria,
                total,
                id_usuario: userId,         // Usuario que actualiza el ingreso
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                updated_at: new Date(),    // Timestamp de última actualización
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Ingreso actualizado exitosamente',
            data: ingreso
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando ingreso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR INGRESO (SOFT DELETE)
// DELETE /api/ingresos/:id - Compatible con soft delete de Laravel
const deleteIngreso = async (req, res) => {
    try {
        // 1.  Obtener ID de la ingreso desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Soft delete de ingreso con ID:', id);

        // 2.  Verificar que la ingreso existe y está activa
        const ingresoExistente = await prisma.ingresos.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar ingresos activas
            }
        });

        if (!ingresoExistente) {
            return res.status(404).json({
                success: false,
                message: ' Ingreso no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.ingresos.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log('Ingreso marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Ingreso eliminada exitosamente'
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando ingreso:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getIngresos,    // GET /api/ingresos
    createIngreso,  // POST /api/ingresos
    updateIngreso,  // PUT /api/ingresos/:id
    deleteIngreso,  // DELETE /api/ingresos/:id
    getIngresoById,  // GET /api/ingresos/:id
};