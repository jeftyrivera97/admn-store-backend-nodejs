// CONTROLADOR DE VENTAS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar ventas

//  Importaciones necesarias
const prisma = require('../utils/prisma');
const { validationResult } = require('express-validator');   // Para manejar errores de validación


const buildSearchFilter = (search) => {
  const baseFilter = { id_estado: BigInt(1), deleted_at: null };

  if (!search || !String(search).trim()) return baseFilter;

  const s = String(search).trim();
  const or = [
    { codigo_venta: { contains: s, mode: "insensitive" } },
  ];

  const num = Number(s);
  if (!isNaN(num) && num > 0) or.push({ total: num });

  return { ...baseFilter, OR: or };
};

const getDateRanges = (monthParam) => {
  const isYearMonth = (s) => /^\d{4}-\d{2}$/.test(s);
  let y, m;

  if (monthParam && isYearMonth(monthParam)) {
    [y, m] = monthParam.split("-").map(Number);
  } else {
    const now = new Date();
    y = now.getUTCFullYear();
    m = now.getUTCMonth() + 1;
  }

  return {
    year: y,
    month: m,
    monthRange: {
      gte: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
    },
    prevMonthRange: {
      gte: new Date(Date.UTC(y, m - 2, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)),
    },
    yearRange: {
      gte: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0)),
    },
    prevYearRange: {
      gte: new Date(Date.UTC(y - 1, 0, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
    },
  };
};

const getMonthlyTotals = async (baseFilter, yearRange, search) => {
  const spanishMonthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  let monthlyRows;
  if (search && String(search).trim()) {
    const s = String(search).trim();
    const searchParam = `%${s}%`;
    const num = Number(s);

    if (!isNaN(num)) {
      monthlyRows = await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS month, COALESCE(SUM(total),0) AS total
        FROM ventas
        WHERE fecha >= ${yearRange.gte} AND fecha < ${yearRange.lt}
          AND id_estado = ${BigInt(1)} AND deleted_at IS NULL
          AND (codigo_venta ILIKE ${searchParam} OR total = ${num})
        GROUP BY 1 ORDER BY 1
      `;
    } else {
      monthlyRows = await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS month, COALESCE(SUM(total),0) AS total
        FROM ventas
        WHERE fecha >= ${yearRange.gte} AND fecha < ${yearRange.lt}
          AND id_estado = ${BigInt(1)} AND deleted_at IS NULL
          AND codigo_venta ILIKE ${searchParam}
        GROUP BY 1 ORDER BY 1
      `;
    }
  } else {
    monthlyRows = await prisma.$queryRaw`
      SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS month, COALESCE(SUM(total),0) AS total
      FROM ventas
      WHERE fecha >= ${yearRange.gte} AND fecha < ${yearRange.lt}
        AND id_estado = ${BigInt(1)} AND deleted_at IS NULL
      GROUP BY 1 ORDER BY 1
    `;
  }

  const monthlyMap = new Map(
    (monthlyRows || []).map((r) => [String(r.month), Number(r.total)])
  );
  return Array.from({ length: 12 }).map((_, idx) => {
    const mm = String(idx + 1).padStart(2, "0");
    const key = `${yearRange.gte.getUTCFullYear()}-${mm}`;
    return {
      month: key,
      monthName: spanishMonthNames[idx],
      total: monthlyMap.get(key) || 0,
    };
  });
};

const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// OBTENER LISTA DE VENTAS (READ)
// GET /ventas?page=1&limit=50&search=ABC&month=2025-02
const getVentas = async (req, res) => {
  try {
    const {
      page = "1",
      limit = "50",
      search = "",
      month: monthParam = null,
    } = req.query;

    // Paginación
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    // Filtros y rangos de fechas
    const baseFilter = buildSearchFilter(search);
    const {
      year,
      month,
      monthRange,
      prevMonthRange,
      yearRange,
      prevYearRange,
    } = getDateRanges(monthParam);
    const whereList = { ...baseFilter, fecha: monthRange };

    // Consultas principales en paralelo
    const [ventas, totalAgg, totals] = await Promise.all([
      prisma.ventas.findMany({
        where: whereList,
        skip,
        take: limitNum,
        orderBy: { created_at: "desc" },
        include: {
          comprobantes: true,
          estados: true,
          cajas_movimientos: true,
          users: true,
        },
      }),
      prisma.ventas.aggregate({ where: whereList, _count: { _all: true } }),
      Promise.all([
        prisma.ventas.aggregate({
          where: { ...baseFilter, fecha: monthRange },
          _sum: { total: true },
        }),
        prisma.ventas.aggregate({
          where: { ...baseFilter, fecha: prevMonthRange },
          _sum: { total: true },
        }),
        prisma.ventas.aggregate({
          where: { ...baseFilter, fecha: yearRange },
          _sum: { total: true },
        }),
        prisma.ventas.aggregate({
          where: { ...baseFilter, fecha: prevYearRange },
          _sum: { total: true },
        }),
      ]),
    ]);

    const [aggMes, aggPrevMes, aggAnio, aggPrevYear] = totals;
    const total = Number(totalAgg?._count?._all ?? 0);
    const totalMes = Number(aggMes?._sum?.total ?? 0);
    const totalMesPrevio = Number(aggPrevMes?._sum?.total ?? 0);
    const totalAnio = Number(aggAnio?._sum?.total ?? 0);
    const totalYearPrev = Number(aggPrevYear?._sum?.total ?? 0);

    // Procesar datos en paralelo
    const [monthlyTotals] = await Promise.all([
      getMonthlyTotals(baseFilter, yearRange, search),
    ]);

    // Ventas no tiene categorías ni tipos
    const totalsByCategory = [];
    const totalsByTipo = [];

    res.json({
      data: ventas,
      statistics: {
        totalRegistros: total,
        totalMonth: totalMes,
        totalMonthPrev: totalMesPrevio,
        totalYear: totalAnio,
        totalYearPrev: totalYearPrev,
        diferenciaMensual: totalMes - totalMesPrevio,
        diferenciaAnual: totalAnio - totalYearPrev,
        porcentajeCambioMensual: Number(
          calculatePercentageChange(totalMes, totalMesPrevio).toFixed(2)
        ),
        porcentajeCambioAnual: Number(
          calculatePercentageChange(totalAnio, totalYearPrev).toFixed(2)
        ),
        categorias: totalsByCategory,
        tipos: totalsByTipo,
        totalsMonths: monthlyTotals,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      meta: {
        month: `${year}-${String(month).padStart(2, "0")}`,
        prevMonth: (() => {
          const pm = new Date(prevMonthRange.gte);
          return `${pm.getUTCFullYear()}-${String(
            pm.getUTCMonth() + 1
          ).padStart(2, "0")}`;
        })(),
      },
    });
  } catch (error) {
    console.error("Error obteniendo ventas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//  OBTENER VENTA POR ID (READ)
// GET /api/ventas/:id
const getVentaById = async (req, res) => {
    try {
        // 1.  Obtener ID de la venta desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando venta con ID:', id);

        // 2. 🔍 Buscar venta específica en la base de datos (solo activas)
        const venta = await prisma.ventas.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo ventas activas
                deleted_at: null       // Solo registros NO eliminados
            },
            include: {
                cajas_movimientos: true,
                estados: true,
                comprobantes: true
            }
        });

        // 3. Verificar si la venta existe
        if (!venta) {
            return res.status(404).json({
                success: false,
                message: ' Venta no encontrada'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la venta
        res.json({
            success: true,
            message: ' Venta encontrada',
            data: venta
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo venta:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};

//  CREAR NUEVA VENTA (CREATE)
// POST /api/ventas
const createVenta = async (req, res) => {
    try {
        // 1.  Verificar que las validaciones pasaron
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 2.  Extraer datos del cuerpo de la petición
        const { codigo_venta, fecha, descripcion, id_categoria, total } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        // req.user fue establecido por authMiddleware
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma
      


        // 4. Crear venta en la base de datos
        const venta = await prisma.ventas.create({
            data: {
                fecha,
                codigo_venta,
                total,
                id_movimiento,
                id_comprobante,
                id_estado: BigInt(1),
                id_usuario: userId,      // Estado activo por defecto (asumir que 1 = activo)
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        console.log(' Venta creada exitosamente:', venta.id);

        // 5.  Enviar respuesta exitosa
        res.status(201).json({
            success: true,
            message: ' Venta creada exitosamente',
            data: venta
        });

    } catch (error) {
        // Manejar errores
        console.error('Error creando venta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ACTUALIZAR VENTA EXISTENTE (UPDATE)
// PUT /api/ventas/:id
const updateVenta = async (req, res) => {
    try {
        // 1.  Obtener ID de la venta desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { codigo_venta, fecha, descripcion, id_categoria, total } = req.body;

        // 3. Actualizar venta en la base de datos (solo si está activa)
        const venta = await prisma.ventas.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar ventas activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                fecha,
                codigo_venta,
                total,
                id_movimiento,
                id_comprobante,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Venta actualizado exitosamente',
            data: venta
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando venta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR VENTA (SOFT DELETE)
// DELETE /api/ventas/:id - Compatible con soft delete de Laravel
const deleteVenta = async (req, res) => {
    try {
        // 1.  Obtener ID de la venta desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Soft delete de venta con ID:', id);

        // 2.  Verificar que la venta existe y está activa
        const ventaExistente = await prisma.ventas.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar ventas activas
            }
        });

        if (!ventaExistente) {
            return res.status(404).json({
                success: false,
                message: ' Venta no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.ventas.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log('Venta marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Venta eliminada exitosamente'
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando venta:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getVentas,    // GET /api/ventas
    createVenta,  // POST /api/ventas
    updateVenta,  // PUT /api/ventas/:id
    deleteVenta,  // DELETE /api/ventas/:id
    getVentaById  // GET /api/ventas/:id
};