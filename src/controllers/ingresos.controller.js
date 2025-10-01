// CONTROLADOR DE INGRESOS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar ingresos

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// --- FUNCIONES AUXILIARES ---
const buildSearchFilter = (search) => {
  const baseFilter = { id_estado: BigInt(1), deleted_at: null };
  
  if (!search || !String(search).trim()) return baseFilter;
  
  const s = String(search).trim();
  const or = [
    { codigo_ingreso: { contains: s, mode: 'insensitive' } },
    { descripcion: { contains: s, mode: 'insensitive' } },
    { categorias_ingresos: { is: { descripcion: { contains: s, mode: 'insensitive' } } } }
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
      lt: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
    },
    prevMonthRange: {
      gte: new Date(Date.UTC(y, m - 2, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
    },
    yearRange: {
      gte: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0))
    },
    prevYearRange: {
      gte: new Date(Date.UTC(y - 1, 0, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0))
    }
  };
};

const getMonthlyTotals = async (baseFilter, yearRange, search) => {
  const spanishMonthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  let monthlyRows;
  if (search && String(search).trim()) {
    const s = String(search).trim();
    const searchParam = `%${s}%`;
    const num = Number(s);
    
    if (!isNaN(num)) {
      monthlyRows = await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', i.fecha), 'YYYY-MM') AS month, COALESCE(SUM(i.total),0) AS total
        FROM ingresos i
        LEFT JOIN categorias_ingresos c ON i.id_categoria = c.id
        WHERE i.fecha >= ${yearRange.gte} AND i.fecha < ${yearRange.lt}
          AND i.id_estado = ${BigInt(1)} AND i.deleted_at IS NULL
          AND (i.codigo_ingreso ILIKE ${searchParam} OR i.descripcion ILIKE ${searchParam} 
               OR c.descripcion ILIKE ${searchParam} OR i.total = ${num})
        GROUP BY 1 ORDER BY 1
      `;
    } else {
      monthlyRows = await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', i.fecha), 'YYYY-MM') AS month, COALESCE(SUM(i.total),0) AS total
        FROM ingresos i
        LEFT JOIN categorias_ingresos c ON i.id_categoria = c.id
        WHERE i.fecha >= ${yearRange.gte} AND i.fecha < ${yearRange.lt}
          AND i.id_estado = ${BigInt(1)} AND i.deleted_at IS NULL
          AND (i.codigo_ingreso ILIKE ${searchParam} OR i.descripcion ILIKE ${searchParam} 
               OR c.descripcion ILIKE ${searchParam})
        GROUP BY 1 ORDER BY 1
      `;
    }
  } else {
    monthlyRows = await prisma.$queryRaw`
      SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS month, COALESCE(SUM(total),0) AS total
      FROM ingresos
      WHERE fecha >= ${yearRange.gte} AND fecha < ${yearRange.lt}
        AND id_estado = ${BigInt(1)} AND deleted_at IS NULL
      GROUP BY 1 ORDER BY 1
    `;
  }

  const monthlyMap = new Map((monthlyRows || []).map((r) => [String(r.month), Number(r.total)]));
  return Array.from({ length: 12 }).map((_, idx) => {
    const mm = String(idx + 1).padStart(2, '0');
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

const processCategories = async (baseFilter, monthRange) => {
  const groupByCat = await prisma.ingresos.groupBy({
    by: ["id_categoria"],
    where: { ...baseFilter, fecha: monthRange },
    _sum: { total: true },
  });

  const categoryIds = groupByCat.map((g) => g.id_categoria).filter(Boolean);
  const categories = categoryIds.length
    ? await prisma.categorias_ingresos.findMany({
        where: { id: { in: categoryIds.map((id) => BigInt(id)) } },
        select: { id: true, descripcion: true, id_tipo: true },
      })
    : [];

  const categoryMap = new Map(categories.map((c) => [c.id.toString(), c.descripcion]));
  
  return { groupByCat, categories, categoryMap };
};

const processTipos = async (groupByCat, categories, totalMes) => {
  const totalsByTipoMap = new Map();
  
  for (const g of groupByCat) {
    const catId = g.id_categoria;
    if (!catId) continue;
    
    const cat = categories.find((c) => c.id.toString() === catId.toString());
    const tipoId = cat?.id_tipo?.toString() || 'null';
    const sum = Number(g._sum?.total ?? 0);
    
    totalsByTipoMap.set(tipoId, (totalsByTipoMap.get(tipoId) || 0) + sum);
  }

  const tipoIds = Array.from(totalsByTipoMap.keys()).filter((k) => k !== 'null');
  const tipos = tipoIds.length
    ? await prisma.tipos_ingresos.findMany({
        where: { id: { in: tipoIds.map((id) => BigInt(id)) } },
        select: { id: true, descripcion: true },
      })
    : [];

  const tipoMap = new Map(tipos.map((t) => [t.id.toString(), t.descripcion]));

  return Array.from(totalsByTipoMap.entries()).map(([key, value]) => {
    const total = Number(value);
    const pct = totalMes === 0 ? 0 : Number(((total / totalMes) * 100).toFixed(2));
    return {
      id_tipo: key === 'null' ? null : key,
      descripcion: key === 'null' ? null : tipoMap.get(key) || null,
      total,
      percentage: pct
    };
  });
};

// OBTENER LISTA DE INGRESOS (READ)
// GET /ingresos?page=1&limit=50&search=ABC&month=2025-02
const getIngresos = async (req, res) => {
  try {
    const { page = "1", limit = "50", search = "", month: monthParam = null } = req.query;

    // Paginación
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    // Filtros y rangos de fechas
    const baseFilter = buildSearchFilter(search);
    const { year, month, monthRange, prevMonthRange, yearRange, prevYearRange } = getDateRanges(monthParam);
    const whereList = { ...baseFilter, fecha: monthRange };

    // Consultas principales en paralelo
    const [ingresos, totalAgg, totals] = await Promise.all([
      prisma.ingresos.findMany({
        where: whereList,
        skip,
        take: limitNum,
        orderBy: { created_at: "desc" },
        include: { categorias_ingresos: true, estados: true },
      }),
      prisma.ingresos.aggregate({ where: whereList, _count: { _all: true } }),
      Promise.all([
        prisma.ingresos.aggregate({ where: { ...baseFilter, fecha: monthRange }, _sum: { total: true } }),
        prisma.ingresos.aggregate({ where: { ...baseFilter, fecha: prevMonthRange }, _sum: { total: true } }),
        prisma.ingresos.aggregate({ where: { ...baseFilter, fecha: yearRange }, _sum: { total: true } }),
        prisma.ingresos.aggregate({ where: { ...baseFilter, fecha: prevYearRange }, _sum: { total: true } }),
      ])
    ]);

    const [aggMes, aggPrevMes, aggAnio, aggPrevYear] = totals;
    const total = Number(totalAgg?._count?._all ?? 0);
    const totalMes = Number(aggMes?._sum?.total ?? 0);
    const totalMesPrevio = Number(aggPrevMes?._sum?.total ?? 0);
    const totalAnio = Number(aggAnio?._sum?.total ?? 0);
    const totalYearPrev = Number(aggPrevYear?._sum?.total ?? 0);

    // Procesar datos en paralelo
    const [monthlyTotals, { groupByCat, categories, categoryMap }] = await Promise.all([
      getMonthlyTotals(baseFilter, yearRange, search),
      processCategories(baseFilter, monthRange)
    ]);

    const [totalsByTipo] = await Promise.all([
      processTipos(groupByCat, categories, totalMes)
    ]);

    const totalsByCategory = groupByCat.map((g) => ({
      id_categoria: g.id_categoria?.toString() || null,
      descripcion: g.id_categoria ? categoryMap.get(g.id_categoria.toString()) || null : null,
      total: Number(g._sum?.total ?? 0),
      percentage: totalMes === 0 ? 0 : Number(((g._sum?.total ?? 0) / totalMes) * 100),
    }));

    res.json({
      data: ingresos,
      statistics: {
        totalRegistros: total,
        totalMonth: totalMes,
        totalMonthPrev: totalMesPrevio,
        totalYear: totalAnio,
        totalYearPrev: totalYearPrev,
        diferenciaMensual: totalMes - totalMesPrevio,
        diferenciaAnual: totalAnio - totalYearPrev,
        porcentajeCambioMensual: Number(calculatePercentageChange(totalMes, totalMesPrevio).toFixed(2)),
        porcentajeCambioAnual: Number(calculatePercentageChange(totalAnio, totalYearPrev).toFixed(2)),
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
          return `${pm.getUTCFullYear()}-${String(pm.getUTCMonth() + 1).padStart(2, "0")}`;
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